/**
 * Agent 3 — Variant Analyzer
 *
 * Pure function: takes the full document text + classified items from Agent 2,
 * detects variant product blocks in the document, and outputs structured
 * DecisionUnits instead of flat rows. Items without detected variants pass
 * through unchanged as flatItems.
 *
 * The analyzer has access to BOTH document text (structure) AND classified items
 * (canonical names, prices) simultaneously — this dual view is what makes variant
 * detection reliable.
 *
 * Standalone test:
 *   npm run test:analyzer -- "Quote/Cost Rifeshow.pdf" --stages "..."
 *   npm run test:analyzer -- "Quote/Cost Saphired.pdf" --stages "..."
 *
 * Debug mode:
 *   DEBUG=1 npm run test:analyzer -- "Quote/Cost Rifeshow.pdf" --stages "..."
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { anthropic, MODEL } from '../lib/anthropic.js';
import type { ClassifiedItem } from './classifier.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyzerInputItem extends ClassifiedItem {
  id: string; // caller-assigned — temp ID in pipeline, real store ID when wired live
  supplierId: string;
}

export interface VariantDimension {
  name: string;     // e.g. "Finish", "Size", "Tray material"
  options: string[]; // e.g. ["Soft touch", "Silver card paper"]
}

export interface DecisionUnit {
  canonicalName: string;
  stages: string[];
  invariants: string[];              // attribute strings identical across all variants
  variantDimensions: VariantDimension[];
  priceMatrix: Record<string, number>; // key = option values joined by " / ", value = unitCost
  supplierId: string;
  confidence: number;
  sourceItemIds: string[];           // audit trail
}

export interface AnalyzerOutput {
  decisionUnits: DecisionUnit[];
  flatItems: AnalyzerInputItem[];    // items with no detected variants, unchanged
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM = `\
You are a supplier quote structure analyst. You receive:
  1. The full raw text of a supplier quote document
  2. A list of classified line items extracted from it (with canonical names, prices, \
     and scenarioId annotations from the extractor)

Your task: collapse duplicate and variant items into DecisionUnits and deduplicated \
flatItems, so the Cost Builder only sees each distinct item ONCE.

─── STEP 1 — SCENARIO-AWARE DEDUPLICATION ───────────────────────────────────────
Items annotated with a scenarioId come from a document that contained multiple \
quote blocks (e.g. "Scenario 1" and "Scenario 2" on the same page). These blocks \
are MUTUALLY EXCLUSIVE — the buyer will choose ONE, not combine them.

For each canonical name that appears in multiple scenarios:
  • SAME unitCost + essentially same attributes across every scenario
    → These are common items that appear in all scenarios unchanged.
    → Output ONE flatItem. Remove ALL duplicates.
  • DIFFERENT unitCost or meaningfully different attributes across scenarios
    → These are true variants. Create a DecisionUnit.
    → variantDimensions: name the dimension after what actually differs \
      (e.g. "Finish", "Material", "Size") — do NOT use "Scenario 1 / Scenario 2" \
      as the dimension name unless no better label can be inferred.
    → Inspect the attributes and variantNote fields to infer the dimension name.

─── STEP 2 — STANDARD VARIANT DETECTION ────────────────────────────────────────
After deduplication, apply the standard variant-detection pass to any remaining \
items (with or without scenarioId) that share a canonical name with different \
prices or attributes:

• Look for explicit block labels: "Option 1 / Option 2", "Offer A / B", "Variant", \
  numbered quote sections, price tables with combinations
• Items appearing ONLY ONCE → flatItem
• A 2D matrix (2 sizes × 2 finishes = 4 combinations) → ONE DecisionUnit with 2 \
  variantDimensions and 4 entries in priceMatrix

─── OUTPUT RULES ────────────────────────────────────────────────────────────────
For each DecisionUnit:
  - canonicalName: the shared canonical name (from the classified items)
  - stages: copy from the classified items for this canonical
  - invariants: free-text strings for attributes IDENTICAL across all variants \
    (e.g. "MOQ 3000 pcs", "Lead time 8 weeks", "Printing: 4C offset")
  - variantDimensions: list of what actually CHANGES; each has a human-readable \
    name (derived from attributes, never "Scenario X") and the list of option values
  - priceMatrix: keys are option values joined by " / " (same order as \
    variantDimensions); values are the unitCost numbers
  - supplierId: copy from the classified items
  - confidence: 0.0–1.0 — how clearly the structure was visible in the document
  - sourceItemIds: all item IDs being merged into this unit

flatItems: every item NOT part of a DecisionUnit, copied EXACTLY unchanged. \
When deduplicating identical scenario items, keep ONE copy and discard the rest.

─── CONSERVATIVE RULE ───────────────────────────────────────────────────────────
If no variant or scenario structure is visible, return all items as flatItems. \
A missed grouping is better than a wrong merge. But scenario-annotated items that \
are identical MUST be deduplicated — returning them as two flatItems is incorrect.

Output: valid JSON only — exactly matching the AnalyzerOutput schema.
No prose, no markdown, no explanation outside the JSON.`;

function buildUserMessage(
  rawText: string,
  items: AnalyzerInputItem[],
  context?: string,
): string {
  // Detect scenario structure
  const scenarios = [...new Set(items.map(it => it.scenarioId).filter(Boolean))];
  const hasScenarios = scenarios.length >= 2;

  // Group items by canonicalName
  const grouped: Record<string, AnalyzerInputItem[]> = {};
  for (const item of items) {
    if (!grouped[item.canonicalName]) grouped[item.canonicalName] = [];
    grouped[item.canonicalName].push(item);
  }

  const multipleEntries = Object.entries(grouped).filter(([, g]) => g.length > 1);
  const singleEntries = Object.entries(grouped).filter(([, g]) => g.length === 1);

  const summaryLines: string[] = [];

  if (hasScenarios) {
    summaryLines.push(`── MULTI-SCENARIO DOCUMENT detected: ${scenarios.join(', ')}`);
    summaryLines.push('   Items in multiple scenarios that are IDENTICAL → deduplicate to 1 flatItem');
    summaryLines.push('   Items in multiple scenarios that DIFFER → DecisionUnit');
    summaryLines.push('');
  }

  if (multipleEntries.length > 0) {
    summaryLines.push('── Canonical names with MULTIPLE entries (deduplication / variant candidates):');
    for (const [name, group] of multipleEntries) {
      summaryLines.push(`  ${name} (×${group.length}):`);
      group.forEach(it => {
        const attrs = Object.entries(it.attributes ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        const scenario = it.scenarioId ? ` [${it.scenarioId}]` : '';
        summaryLines.push(`    id=${it.id}${scenario}  $${it.unitCost}  ${it.variantNote ?? ''}  ${attrs}`);
      });
    }
  }
  if (singleEntries.length > 0) {
    summaryLines.push('── Canonical names appearing once (flatItems, no action needed):');
    singleEntries.forEach(([name, [it]]) => {
      const scenario = it.scenarioId ? ` [${it.scenarioId}]` : '';
      summaryLines.push(`  ${name}  id=${it.id}${scenario}  $${it.unitCost}`);
    });
  }

  const docSnippet = rawText.slice(0, 28_000);

  return `\
${context ? `User context: ${context}\n` : ''}Classified items summary:
${summaryLines.join('\n')}

Full classified items (JSON):
${JSON.stringify(items, null, 2)}

─── FULL DOCUMENT TEXT ───────────────────────────────────────────────────
${docSnippet}
─── END OF DOCUMENT ──────────────────────────────────────────────────────

${hasScenarios
    ? `IMPORTANT: This document has ${scenarios.length} quote scenarios (${scenarios.join(', ')}). Apply STEP 1 (scenario deduplication) before STEP 2 (variant detection). Items with identical price across all scenarios must be deduplicated to ONE flatItem.`
    : 'Analyse the document structure above and detect variant product blocks.'
}

Return JSON matching this exact schema:
{
  "decisionUnits": [
    {
      "canonicalName": string,
      "stages": string[],
      "invariants": string[],
      "variantDimensions": [{ "name": string, "options": string[] }],
      "priceMatrix": { "<key>": number },
      "supplierId": string,
      "confidence": number,
      "sourceItemIds": string[]
    }
  ],
  "flatItems": [ /* AnalyzerInputItem objects, unchanged */ ]
}

priceMatrix key format: option values joined by " / " in the same order as variantDimensions.
Example for 2D: "213×127×30mm / Silver metallized"`;
}

// ─── Agent function ───────────────────────────────────────────────────────────

export async function analyzeVariants(
  rawText: string,
  items: AnalyzerInputItem[],
  debug = false,
  context?: string,
): Promise<AnalyzerOutput> {
  console.log(`[Analyzer] analyzeVariants called — ${items.length} items, ${rawText.length} chars of doc text`);

  if (items.length === 0) {
    console.log('[Analyzer] fast-path: 0 items, skipping');
    return { decisionUnits: [], flatItems: [] };
  }

  // Detect scenario structure
  const scenarios = [...new Set(items.map(it => it.scenarioId).filter(Boolean))];
  const hasScenarios = scenarios.length >= 2;

  // Fast-path: if no canonical has more than one item AND no scenario structure, nothing to do
  const canonicalCounts: Record<string, number> = {};
  for (const it of items) canonicalCounts[it.canonicalName] = (canonicalCounts[it.canonicalName] ?? 0) + 1;
  const hasMultiples = Object.values(canonicalCounts).some(c => c > 1);
  if (!hasMultiples && !hasScenarios) {
    console.log('[Analyzer] fast-path: no repeated canonicals, no scenarios — returning flatItems unchanged');
    return { decisionUnits: [], flatItems: items };
  }

  const multipleCanonicals = Object.entries(canonicalCounts).filter(([, c]) => c > 1).map(([n]) => n);
  if (hasScenarios) {
    console.log(`[Analyzer] calling Claude — multi-scenario document (${scenarios.join(', ')}), ${multipleCanonicals.length} repeated canonical(s): ${multipleCanonicals.join(', ')}`);
  } else {
    console.log(`[Analyzer] calling Claude — repeated canonicals: ${multipleCanonicals.join(', ')}`);
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildUserMessage(rawText, items, context) }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';

  if (debug) {
    process.stderr.write('\n[analyzer debug] raw model output:\n');
    process.stderr.write(raw + '\n\n');
  }

  const json = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Analyzer: model returned invalid JSON.\n\nRaw output:\n${raw}`);
  }

  const output = parsed as AnalyzerOutput;

  if (!output.decisionUnits || !output.flatItems) {
    throw new Error(`Analyzer: response missing required fields decisionUnits/flatItems.\n\nParsed: ${JSON.stringify(output)}`);
  }

  console.log(`[Analyzer] done — ${output.decisionUnits.length} DecisionUnit(s), ${output.flatItems.length} flatItem(s)`);
  if (output.decisionUnits.length > 0) {
    output.decisionUnits.forEach(du => {
      console.log(`  DU "${du.canonicalName}": ${du.variantDimensions.map(d => `${d.name}[${d.options.join('|')}]`).join(', ')} — ${Object.keys(du.priceMatrix).length} matrix entries`);
    });
  }

  return output;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

// ─── Standalone test ──────────────────────────────────────────────────────────
// Runs the full pipeline up to and including the analyzer, then prints results.
//
// Usage:
//   npm run test:analyzer -- "Quote/Cost Rifeshow.pdf" --stages "Primary Packaging,Secondary Packaging,Freight"
//   npm run test:analyzer -- "Quote/Cost Saphired.pdf" --stages "Primary Packaging,Secondary Packaging,Freight"
//
// Expected outputs:
//   Rifeshow: 1 DecisionUnit (Rigid Box, Finish dimension), rest flatItems
//   Saphired: 1 DecisionUnit (Gift Box, Size + Tray Finish dimensions, 2×2 matrix)

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { extractText } = await import('../lib/extractText.js');
  const { extractLineItems, validateAgainstSource } = await import('./extractor.js');
  const { classifyItems } = await import('./classifier.js');

  const args = process.argv.slice(2);
  const debug = process.env.DEBUG === '1';

  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.error('Usage: npm run test:analyzer -- "<path-to-pdf>" --stages "Stage A,Stage B"');
    process.exit(1);
  }

  const stagesFlag = args.find(a => a.startsWith('--stages='))?.slice(9) ??
    (args.includes('--stages') ? args[args.indexOf('--stages') + 1] : undefined);

  if (!stagesFlag) {
    console.error([
      'ERROR: --stages is required.',
      'Example: npm run test:analyzer -- "Quote/Cost Rifeshow.pdf"',
      '  --stages "Primary Packaging,Secondary Packaging,Freight,Filling & Assembly"',
    ].join('\n'));
    process.exit(1);
  }

  const stages = stagesFlag.split(',').map(s => s.trim()).filter(Boolean);
  const supplierName = basename(filePath, extname(filePath));
  const PLACEHOLDER_SUPPLIER_ID = 'test-supplier';

  function sep(label: string) {
    console.log('\n' + '─'.repeat(60));
    console.log(` ${label}`);
    console.log('─'.repeat(60));
  }

  console.log('QuoteLens — Variant Analyzer test');
  console.log(`  File:   ${filePath}`);
  console.log(`  Stages: ${stages.join(' | ')}`);

  try {
    // ── Step 1: Extract text ────────────────────────────────────────────────────
    sep('STEP 1 — Extract text');
    const ext = extname(filePath).toLowerCase();
    const docType = ext === '.pdf' ? 'pdf' : ext === '.xlsx' || ext === '.xls' ? 'excel' : 'text';
    const buffer = readFileSync(filePath);
    const { text, pageCount } = await extractText(buffer, docType);
    console.log(`\n${text.length.toLocaleString()} chars extracted${pageCount ? ` (${pageCount} pages)` : ''}`);
    if (debug) { sep('DEBUG — Raw text'); console.log(text); }

    // ── Step 2: Extract line items ──────────────────────────────────────────────
    sep('STEP 2 — Extract line items (Claude)');
    const rawItems = await extractLineItems({ content: text, supplierName, docType, debug });
    console.log(`\n${rawItems.length} raw items extracted`);
    const warnings = validateAgainstSource(rawItems, text);
    if (warnings.length) warnings.forEach(w => console.warn('  ⚠', w));

    // ── Step 3: Classify ────────────────────────────────────────────────────────
    sep('STEP 3 — Classify (Claude)');
    const classified = await classifyItems(rawItems, { stages, existingCanonicals: [] });
    console.log(`\n${classified.length} items classified`);

    // ── Step 4: Attach temp IDs + supplierId for analyzer ──────────────────────
    const analyzerItems: AnalyzerInputItem[] = classified.map((c, i) => ({
      ...c,
      id: `item-${i}`,
      supplierId: PLACEHOLDER_SUPPLIER_ID,
    }));

    // ── Step 5: Analyze variants ────────────────────────────────────────────────
    sep('STEP 4 — Analyze variants (Claude)');
    console.log('\nCalling analyzer agent...');
    const result = await analyzeVariants(text, analyzerItems, debug);

    // ── Output ──────────────────────────────────────────────────────────────────
    sep('OUTPUT — AnalyzerOutput');
    console.log('\n' + JSON.stringify(result, null, 2));

    sep('SUMMARY');
    console.log();

    if (result.decisionUnits.length === 0) {
      console.log('No variant groups detected — all items returned as flatItems.');
    } else {
      console.log(`${result.decisionUnits.length} DecisionUnit${result.decisionUnits.length !== 1 ? 's' : ''} detected:\n`);
      result.decisionUnits.forEach((du, i) => {
        console.log(`  [${i + 1}] "${du.canonicalName}"  confidence=${Math.round(du.confidence * 100)}%`);
        console.log(`       Stages: ${du.stages.join(', ')}`);
        du.variantDimensions.forEach(dim => {
          console.log(`       Dimension "${dim.name}": ${dim.options.join(' | ')}`);
        });
        console.log(`       Price matrix (${Object.keys(du.priceMatrix).length} combinations):`);
        Object.entries(du.priceMatrix).forEach(([k, v]) => {
          console.log(`         "${k}" → $${v}`);
        });
        if (du.invariants.length) {
          console.log(`       Invariants: ${du.invariants.join('; ')}`);
        }
        console.log(`       Source items: ${du.sourceItemIds.join(', ')}`);
        console.log();
      });
    }

    console.log(`${result.flatItems.length} flatItem${result.flatItems.length !== 1 ? 's' : ''} (no variants):`);
    result.flatItems.forEach(it => {
      console.log(`  - "${it.canonicalName}"  $${it.unitCost}  [${it.stages.join(', ')}]`);
    });
  } catch (err) {
    console.error('\nAnalyzer test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
