/**
 * REAL PIPELINE TEST
 *
 * Full end-to-end run: PDF/Excel/text → extract → validate → classify → output
 *
 * Usage:
 *   npm run test:pipeline -- "Quote/Cost Rifeshow.pdf" --stages "Stage A,Stage B,Stage C"
 *
 * Flags:
 *   --stages "A,B"       REQUIRED — comma-separated project stage list (no silent default)
 *   --debug              print raw PDF text and raw model output
 *   --supplier "X"       override supplier name (default: inferred from filename)
 *   --canonicals "A,B"   inject existing canonical names for cross-supplier normalisation
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { extractText, type DocType } from '../lib/extractText.js';
import { extractLineItems, validateAgainstSource } from './extractor.js';
import { classifyItems, type ClassifierContext } from './classifier.js';

// ─── CLI parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const filePath = args.find(a => !a.startsWith('--'));
if (!filePath) {
  console.error('Usage: tsx server/agents/pipeline.ts <path-to-document> [--debug] [--stages "A,B,C"] [--supplier "Name"]');
  process.exit(1);
}

const debug = args.includes('--debug');

const stagesFlag = args.find(a => a.startsWith('--stages='))?.slice(9) ??
  (args.includes('--stages') ? args[args.indexOf('--stages') + 1] : undefined);

const supplierFlag = args.find(a => a.startsWith('--supplier='))?.slice(11) ??
  (args.includes('--supplier') ? args[args.indexOf('--supplier') + 1] : undefined);

const canonicalsFlag = args.find(a => a.startsWith('--canonicals='))?.slice(13) ??
  (args.includes('--canonicals') ? args[args.indexOf('--canonicals') + 1] : undefined);

// Dev/test preset — must be passed explicitly via --stages, never injected silently.
export const DEFAULT_STAGES_DEV = [
  'Primary Packaging',
  'Secondary Packaging',
  'Filling & Assembly',
  'Freight',
  'Customs & Duties',
  'Artwork',
];

if (!stagesFlag) {
  console.error([
    'ERROR: --stages is required.',
    '',
    'Stages are defined at the project level and are the source of truth for classification.',
    'The classifier must receive them explicitly — there is no safe default.',
    '',
    'Example:',
    '  npm run test:pipeline -- "file.pdf" --stages "Stage A,Stage B,Stage C"',
    '',
    'For dev/test with the cosmetics preset:',
    `  --stages "${DEFAULT_STAGES_DEV.join(',')}"`,
  ].join('\n'));
  process.exit(1);
}

const stages = stagesFlag.split(',').map(s => s.trim()).filter(Boolean);

const existingCanonicals = canonicalsFlag
  ? canonicalsFlag.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const supplierName = supplierFlag ?? basename(filePath, extname(filePath));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function separator(label: string) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(` ${label}`);
  console.log(line);
}

function inferDocType(path: string): DocType {
  const ext = extname(path).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.xlsx', '.xls', '.csv'].includes(ext)) return 'excel';
  return 'text';
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('QuoteLens pipeline');
  console.log(`  File:     ${filePath}`);
  console.log(`  Supplier: ${supplierName}`);
  console.log(`  Stages:   ${stages.join(' | ')}`);
  console.log(`  Debug:    ${debug}`);

  // ── Step 1: Read and extract text ──────────────────────────────────────────
  separator('STEP 1 — Extract text from document');

  const buffer = readFileSync(filePath);
  const docType = inferDocType(filePath);
  console.log(`\nDocument type detected: ${docType}`);

  const { text, pageCount } = await extractText(buffer, docType);
  console.log(`Extracted ${text.length.toLocaleString()} characters${pageCount != null ? ` across ${pageCount} page${pageCount !== 1 ? 's' : ''}` : ''}.`);

  if (!text.trim()) {
    console.error('\nERROR: No text extracted. The document may be scanned/image-only.');
    process.exit(1);
  }

  if (debug) {
    separator('DEBUG — Raw document text');
    console.log(text);
  }

  // ── Step 2: Extract line items ─────────────────────────────────────────────
  separator('STEP 2 — Extract line items (Claude)');
  console.log('\nCalling extractor agent...');

  const rawItems = await extractLineItems({
    content: text,
    supplierName,
    docType,
    debug,
  });

  console.log(`\nExtracted ${rawItems.length} raw line item${rawItems.length !== 1 ? 's' : ''}.`);

  if (debug) {
    separator('DEBUG — Raw extracted items');
    console.log(JSON.stringify(rawItems, null, 2));
  }

  // ── Step 3: Validate against source text ───────────────────────────────────
  separator('STEP 3 — Validate extraction against source');

  const warnings = validateAgainstSource(rawItems, text);
  if (warnings.length === 0) {
    console.log('\n✓ All items appear to be grounded in the source text.');
  } else {
    console.log(`\n⚠  ${warnings.length} validation warning${warnings.length !== 1 ? 's' : ''}:`);
    warnings.forEach(w => console.warn('   WARNING:', w));
  }

  // ── Step 4: Classify ───────────────────────────────────────────────────────
  separator('STEP 4 — Classify & normalise (Claude)');
  console.log('\nCalling classifier agent...');
  console.log(`(${existingCanonicals.length} existing canonical${existingCanonicals.length !== 1 ? 's' : ''} provided${existingCanonicals.length ? ': ' + existingCanonicals.join(', ') : ''})\n`);

  const ctx: ClassifierContext = {
    stages,
    existingCanonicals,
  };

  const classified = await classifyItems(rawItems, ctx);
  console.log(`Classified ${classified.length} item${classified.length !== 1 ? 's' : ''}.`);

  // ── Step 5: Output ─────────────────────────────────────────────────────────
  separator('OUTPUT — Final classified items');

  console.log('\n' + JSON.stringify(classified, null, 2));

  separator('SUMMARY');
  console.log();
  let stageFitWarnings = 0;
  classified.forEach(it => {
    const conf = `${Math.round(it.confidence * 100)}%`.padStart(4);
    const cost = it.unitCost != null ? `$${it.unitCost}` : '—';
    const stage = it.stages.join(' + ');
    const stageFitFlag = it.stageConfidence === 'low' ? '  ⚠ poor stage fit' : '';
    if (it.stageConfidence === 'low') stageFitWarnings++;
    console.log(`  [${conf}] ${it.rawName}`);
    console.log(`         → "${it.canonicalName}"  [${stage}]  ${cost}${stageFitFlag}`);
    if (it.suggestedStage) {
      console.log(`         ↳ suggested stage: "${it.suggestedStage}"`);
    }
  });

  if (warnings.length > 0) {
    console.log(`\n⚠  ${warnings.length} extraction warning${warnings.length !== 1 ? 's' : ''} above — review before accepting.`);
  }
  if (stageFitWarnings > 0) {
    console.log(`⚠  ${stageFitWarnings} item${stageFitWarnings !== 1 ? 's' : ''} fit poorly into the provided stages — consider expanding your project stage list.`);
  }
}

run().catch(err => {
  console.error('\nPipeline failed:', err.message);
  process.exit(1);
});
