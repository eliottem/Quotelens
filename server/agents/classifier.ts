/**
 * Agent 2 — Classifier
 *
 * Pure function: takes raw line items + project context,
 * returns items with canonical names, stage assignments, and confidence scores.
 *
 * Key principle: "Normalize, don't enumerate"
 * "Kraft Box 150x100" + "Kartonbox klein" + "Small carton" → all → "Kraft Box Small"
 *
 * Standalone test:
 *   tsx server/agents/classifier.ts
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { anthropic, MODEL } from '../lib/anthropic.js';
import type { RawLineItem } from './extractor.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassifierContext {
  stages: string[];                  // project's stage taxonomy
  existingCanonicals: string[];      // already-accepted canonical names for this project
  projectCurrency?: string;
  context?: string;                  // optional user-provided context hint (per-document)
  projectInstructions?: string;      // standing project-level rules for all AI agents
}

export interface ClassifiedItem extends RawLineItem {
  canonicalName: string;
  stages: string[];                          // one or more stage names from context.stages
  confidence: number;                        // 0.0 – 1.0
  stageConfidence: 'high' | 'medium' | 'low'; // how well the item fits the assigned stage(s)
  suggestedStage?: string;                   // present only when stageConfidence is 'low'
  variantNote?: string;                      // short distinguisher when multiple items share same canonicalName
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM = `\
You are a supply chain cost analyst specialising in multi-stage production cost modelling.

Map raw supplier line items to canonical concept names and assign each to one or more \
production stages.

─── CANONICAL NAME RULES ────────────────────────────────────────────────────────
1. SHORT: 2–4 words maximum. "Rigid Box" not "Rigid Paper Gift Box With Lid 200x150x80mm".
2. GENERIC: Describe the concept, strip dimensions/specs/supplier-specific wording.
   BAD:  "Kraft Paper Box 150x100x80mm"  →  GOOD: "Kraft Box"
   BAD:  "Custom Printed Sticker 50x50"  →  GOOD: "Custom Sticker"
   BAD:  "International Sea Freight per CBM"  →  GOOD: "Sea Freight"
3. NEVER copy the raw name verbatim. Always generalise.
4. REUSE existing canonical names when the concept matches — never create synonyms.
5. VARIANT DETECTION: When multiple items in the input share the same underlying concept \
   but differ in size/spec/finish (e.g. small box vs large box), give them the SAME \
   canonicalName and distinguish them with a short variantNote (≤ 6 words).
   Example: canonicalName "Kraft Box", variantNote "small 150×100mm" vs "large 250×180mm".

─── STAGE ASSIGNMENT RULES ──────────────────────────────────────────────────────
- The project stages are defined by the project owner — treat them as fixed taxonomy
- ONLY assign stages from the exact list provided; never invent, paraphrase, or omit stage names
- An item CAN span multiple stages (bundled items) — include all relevant stages
- If an item does not fit any stage: assign closest stage, set stageConfidence "low", \
  populate suggestedStage with what you'd name it unconstrained
- Clear fit → stageConfidence "high"; minor ambiguity → "medium"

─── UNIT REVIEW (mandatory on every call) ────────────────────────────────────────
Before finalising any item, explicitly ask yourself:
  "What is this price per? Is it per piece, per set, per kg, per CBM, per batch?"
  "Is the unit stated clearly, or is it ambiguous?"
If the unit is ambiguous or inconsistent with the item name (e.g. a "Set of 6" priced "per unit" without clarity):
  - Set confidence ≤ 0.4
  - Add a variantNote flagging the unit ambiguity (e.g. "price per set or per piece?")

─── CONFIDENCE SCALE (canonical name match) ─────────────────────────────────────
  1.0 — unambiguous match or exact reuse of existing canonical
  0.8 — high confidence, minor naming variation
  0.6 — reasonable match, some ambiguity
  0.4 — best guess, sparse description
  0.2 — very uncertain, needs human review

Output: valid JSON array only. No prose, no markdown, no explanation.`;

function buildUserMessage(items: RawLineItem[], ctx: ClassifierContext): string {
  const canonicalsSection = ctx.existingCanonicals.length
    ? `Existing canonical names in this project — REUSE when concepts match:\n${ctx.existingCanonicals.map(c => `  • ${c}`).join('\n')}`
    : 'No existing canonicals yet — establish them from scratch.';

  return `\
Project stages: ${ctx.stages.join(' | ')}

${canonicalsSection}
${ctx.context ? `\nUser context: ${ctx.context}\n` : ''}
Line items to classify:
${JSON.stringify(items, null, 2)}

Return a JSON array with one element per input item (same order):
{
  "rawName": string,           // unchanged from input
  "canonicalName": string,     // 2–4 word generic concept name (NEVER copy rawName verbatim)
  "variantNote": string | null, // short distinguisher when items share canonicalName (e.g. "small 150×100mm"), else null
  "stages": string[],          // subset of the project stages listed above (never empty)
  "confidence": number,        // 0.0 – 1.0 — confidence in the canonical name match
  "stageConfidence": "high" | "medium" | "low",  // how well the item fits the assigned stage(s)
  "suggestedStage": string | null  // null unless stageConfidence is "low"
}`;
}

// ─── Agent function ───────────────────────────────────────────────────────────

export async function classifyItems(
  items: RawLineItem[],
  ctx: ClassifierContext,
): Promise<ClassifiedItem[]> {
  if (items.length === 0) return [];

  const system = ctx.projectInstructions
    ? `PROJECT INSTRUCTIONS — always keep these in mind for every classification decision:\n${ctx.projectInstructions}\n\n${SYSTEM}`
    : SYSTEM;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: buildUserMessage(items, ctx) }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const json = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Classifier: model returned invalid JSON.\n\nRaw output:\n${raw}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Classifier: expected JSON array, got ${typeof parsed}`);
  }

  const classifications = parsed as Array<{
    rawName: string;
    canonicalName: string;
    variantNote: string | null;
    stages: string[];
    confidence: number;
    stageConfidence: 'high' | 'medium' | 'low';
    suggestedStage: string | null;
  }>;

  // Merge classification results back onto the original items
  return classifications.map((cls, i) => {
    const original = items[i] ?? items[0];
    const result: ClassifiedItem = {
      ...original,
      canonicalName: cls.canonicalName,
      stages: cls.stages,
      confidence: cls.confidence,
      stageConfidence: cls.stageConfidence ?? 'medium',
    };
    if (cls.suggestedStage) result.suggestedStage = cls.suggestedStage;
    if (cls.variantNote) result.variantNote = cls.variantNote;
    return result;
  });
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

// ─── Standalone test ──────────────────────────────────────────────────────────
// MOCK TEST — uses hardcoded sample items (not real extractor output).
//
// Purpose: verify the classifier's canonical normalisation and stage assignment
// in isolation, without needing a real PDF or running the extractor.
//
// For a real end-to-end run (PDF → extract → validate → classify):
//   npm run test:pipeline -- "Quote/Cost Rifeshow.pdf"
//
// Run: tsx server/agents/classifier.ts

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('─── MOCK TEST (hardcoded sample items) ───────────────────────');
  console.log('To run against a real PDF, use: npm run test:pipeline -- <file>\n');
  const sampleItems: RawLineItem[] = [
    {
      rawName: 'Kraft Paper Box 150x100x80mm',
      unitCost: 0.42, currency: 'USD', unit: 'pcs', moq: 5000,
      leadTime: '6 weeks', attributes: { material: 'kraft paper' },
    },
    {
      rawName: 'Kraft Box 250x180x120mm',
      unitCost: 0.87, currency: 'USD', unit: 'pcs', moq: 2000,
      leadTime: '6 weeks', attributes: {},
    },
    {
      rawName: 'Glossy Rigid Box 200x150x80mm',
      unitCost: 1.45, currency: 'USD', unit: 'pcs', moq: 1000,
      leadTime: '8 weeks', attributes: { finish: 'gloss' },
    },
    {
      rawName: 'Custom Printed Sticker 50x50mm',
      unitCost: 0.08, currency: 'USD', unit: 'pcs', moq: 10000,
      leadTime: '5 weeks', attributes: { size: '50x50mm' },
    },
    {
      rawName: 'Bubble Wrap Roll 600mm x 50m',
      unitCost: 12.00, currency: 'USD', unit: 'roll', moq: 100,
      leadTime: '2 weeks', attributes: { width: '600mm', length: '50m' },
    },
    {
      rawName: 'International Sea Freight (per CBM)',
      unitCost: 85.00, currency: 'USD', unit: 'CBM', moq: null,
      leadTime: '30 days', attributes: { route: 'Shanghai → Rotterdam' },
    },
  ];

  const ctx: ClassifierContext = {
    stages: [
      'Primary Packaging',
      'Secondary Packaging',
      'Filling & Assembly',
      'Freight',
      'Customs & Duties',
    ],
    // Simulates a second supplier being added — these already exist in the project
    existingCanonicals: [
      'Kraft Box Small',
      'Custom Sticker 50x50mm',
    ],
    projectCurrency: 'USD',
  };

  console.log('Running classifier...\n');
  console.log(`Items to classify: ${sampleItems.length}`);
  console.log(`Project stages: ${ctx.stages.join(', ')}`);
  console.log(`Existing canonicals: ${ctx.existingCanonicals.join(', ')}\n`);

  classifyItems(sampleItems, ctx)
    .then(classified => {
      console.log(`Classified ${classified.length} item${classified.length !== 1 ? 's' : ''}:\n`);
      console.log(JSON.stringify(classified, null, 2));

      console.log('\n--- Classification summary ---');
      classified.forEach(it => {
        const conf = `${Math.round(it.confidence * 100)}%`.padStart(4);
        const stages = it.stages.join(' + ');
        console.log(`  [${conf}] "${it.rawName}"`);
        console.log(`         → "${it.canonicalName}" [${stages}]`);
      });
    })
    .catch(err => {
      console.error('Classifier failed:', err.message);
      process.exit(1);
    });
}
