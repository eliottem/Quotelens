/**
 * Agent 1 — Extractor
 *
 * Pure function: takes raw document text + supplier metadata,
 * returns structured line items grounded strictly in the source text.
 *
 * Standalone test (uses built-in sample):
 *   tsx server/agents/extractor.ts
 *
 * Standalone test with a real file (plain text only — use pipeline for PDF):
 *   tsx server/agents/extractor.ts path/to/quote.txt
 *
 * Debug mode (prints raw text + model output):
 *   DEBUG=1 tsx server/agents/extractor.ts path/to/quote.txt
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { anthropic, MODEL } from '../lib/anthropic.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawLineItem {
  rawName: string;
  unitCost: number | null;
  currency: string;
  unit: string;
  moq: number | null;
  leadTime: string | null;
  attributes: Record<string, string>;
  scenarioId: string | null; // "scenario_1", "scenario_2", … or null if doc has no multi-block structure
}

export interface ExtractorInput {
  content: string;        // raw text extracted from document
  supplierName: string;
  currency?: string;      // optional hint; model still infers if ambiguous
  docType: 'pdf' | 'excel' | 'text';
  debug?: boolean;        // print raw model output to stderr
  context?: string;       // optional user-provided context hint
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Check each extracted item against the source text.
 * Returns a warning string for any item where fewer than half of its
 * meaningful tokens appear verbatim in the source.
 *
 * This is a lightweight heuristic — it catches outright hallucination
 * (items that share no words with the source) without false-positives
 * from minor phrasing differences.
 */
export function validateAgainstSource(
  items: RawLineItem[],
  sourceText: string,
): string[] {
  const normalised = sourceText.toLowerCase().replace(/\s+/g, ' ');
  const warnings: string[] = [];

  for (const item of items) {
    // Meaningful tokens: strip punctuation, skip words ≤ 3 chars
    const tokens = item.rawName
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 3);

    if (tokens.length === 0) continue;

    const matched = tokens.filter(t => normalised.includes(t));
    const ratio = matched.length / tokens.length;

    if (ratio < 0.5) {
      warnings.push(
        `possible unsupported extracted item: "${item.rawName}" ` +
        `(${matched.length}/${tokens.length} tokens found in source)`,
      );
    }
  }

  return warnings;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM = `\
You are a supplier quote parser. Your sole job is to read the document text \
provided and extract the line items that appear in it — nothing more.

GROUNDING RULES (highest priority):
- Only output items that are explicitly present in the document text
- Never add items based on what "typically" appears in this kind of document
- Never use your training knowledge about packaging, shipping, or supply chains \
  to invent or supplement line items
- rawName must closely mirror the actual label text used in the document

SCENARIO DETECTION (do this first, before extracting):
Scan the document for a multi-block structure — two or more quote sections that \
each contain a similar list of items. Signals to look for:
  • Explicit labels: "Option 1/2", "Scenario A/B", "Quote V1/V2", "Offer 1/2", \
    "Version 1/2", numbered sections with repeated item rows
  • Implicit repetition: the same table or item list appears twice on the document, \
    with one or a few lines changed between occurrences
If you detect ≥ 2 distinct quote blocks:
  → assign scenarioId "scenario_1", "scenario_2", etc. to every item, matching the \
    block it came from
If the document is a single flat list with no repeated block structure:
  → scenarioId: null for every item
DO NOT deduplicate or merge items regardless of scenarioId — extract every row \
exactly as written. Deduplication happens in a later step.

EXTRACTION RULES:
- Extract every row that has an explicit price or unit cost
- Do not filter, summarise, group, or merge rows
- Do not invent, estimate, or average any numeric value
- unitCost: the numeric cost value only (no currency symbols)
- currency: ISO 4217 code inferred from context ($ → USD, € → EUR, ¥ → CNY, etc.)
- unit: the pricing unit stated — "unit", "set", "pcs", "kg", "roll", etc.; \
  use "unit" if not stated
- moq: minimum order quantity as an integer, or null if not stated
- leadTime: lead time string exactly as written ("8 weeks", "30 days"), or null
- attributes: any other key-value pairs present (material, colour, size, finish, \
  SKU, incoterm, etc.)

Output format: a valid JSON array only. No prose, no markdown, no explanation.`;

function buildUserMessage(input: ExtractorInput): string {
  // Hard character limit keeps cost predictable; real quotes rarely exceed this
  const body = input.content.slice(0, 32_000);

  return `\
Supplier: ${input.supplierName}
Document type: ${input.docType}
${input.currency ? `Currency hint: ${input.currency}` : ''}
${input.context ? `\nUser context: ${input.context}\n` : ''}

--- DOCUMENT START ---
${body}
--- DOCUMENT END ---

Extract ONLY the priced line items present in the document above.
Do not add anything that is not explicitly written in the document text.

Return a JSON array where each element is:
{
  "rawName": string,
  "unitCost": number | null,
  "currency": string,
  "unit": string,
  "moq": number | null,
  "leadTime": string | null,
  "attributes": { [key: string]: string },
  "scenarioId": string | null
}`;
}

// ─── Agent function ───────────────────────────────────────────────────────────

export async function extractLineItems(input: ExtractorInput): Promise<RawLineItem[]> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';

  if (input.debug) {
    process.stderr.write('\n[extractor debug] raw model output:\n');
    process.stderr.write(raw + '\n\n');
  }

  const json = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Extractor: model returned invalid JSON.\n\nRaw output:\n${raw}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Extractor: expected JSON array, got ${typeof parsed}`);
  }

  return parsed as RawLineItem[];
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

// ─── Standalone test ──────────────────────────────────────────────────────────
// Uses built-in sample text (not a real PDF).
// For a real PDF end-to-end, use the pipeline:
//   npm run test:pipeline -- "Quote/Cost Rifeshow.pdf"

const SAMPLE_CONTENT = `\
PROFORMA INVOICE — Acme Packaging Ltd
Date: 2026-03-15   Currency: USD

Item Description                   MOQ     Unit Price   Lead Time
-----------------------------------------------------------------
Kraft Paper Box 150x100x80mm       5,000   $0.42        6 weeks
Kraft Paper Box 250x180x120mm      2,000   $0.87        6 weeks
Glossy Rigid Box 200x150x80mm      1,000   $1.45        8 weeks
Tissue Paper Sheets (pack/100)     500     $3.50        4 weeks
Satin Ribbon 10mm x 25m roll       500     $1.20        3 weeks
Custom Printed Sticker 50x50mm     10,000  $0.08        5 weeks

Notes: All prices EXW Shanghai. Payment 30% TT deposit.
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const debug = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
  let content = SAMPLE_CONTENT;
  let isRealFile = false;

  const filePath = process.argv[2];
  if (filePath) {
    try {
      content = readFileSync(filePath, 'utf-8');
      isRealFile = true;
      console.log(`Source: ${filePath}`);
    } catch {
      console.error(`Cannot read file: ${filePath}`);
      process.exit(1);
    }
  } else {
    console.log('No file specified — using built-in sample text.');
    console.log('For PDF input, use: npm run test:pipeline -- "path/to/quote.pdf"\n');
  }

  if (debug && !isRealFile) {
    console.log('\n[debug] source text:\n');
    console.log(content);
    console.log();
  }

  console.log('\nRunning extractor...\n');

  extractLineItems({
    content,
    supplierName: isRealFile ? 'Supplier' : 'Acme Packaging Ltd',
    currency: 'USD',
    docType: 'text',
    debug,
  })
    .then(items => {
      console.log(`Extracted ${items.length} item${items.length !== 1 ? 's' : ''}.\n`);

      const warnings = validateAgainstSource(items, content);
      if (warnings.length > 0) {
        console.warn('⚠  Validation warnings:');
        warnings.forEach(w => console.warn('   WARNING:', w));
        console.warn();
      }

      console.log(JSON.stringify(items, null, 2));

      console.log('\n--- Summary ---');
      items.forEach(it => {
        const cost = it.unitCost != null ? `${it.currency} ${it.unitCost}` : 'no price';
        console.log(`  ${it.rawName.padEnd(40)} ${cost}`);
      });
    })
    .catch(err => {
      console.error('Extractor failed:', err.message);
      process.exit(1);
    });
}
