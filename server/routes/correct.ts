import { Router } from 'express';
import { anthropic, MODEL } from '../lib/anthropic.js';

const router = Router();

const SYSTEM = `\
You are a supplier quote classification correction engine. Apply ONLY the correction described and return the result as JSON.

UNIT REVIEW — before writing any item back, ask yourself: "What is this price per? Is it per piece, per set, per kg, per batch?" If the unit is ambiguous, set confidence ≤ 0.4 and add a variantNote flagging the ambiguity.

CRITICAL: Your entire response must be valid JSON only — no prose, no explanation, no markdown, no code fences. Start with { and end with }. Nothing before or after the JSON object.`;

function extractJson(text: string): string {
  // Find the outermost { } pair, ignoring any prose before/after
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object in model response');
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Malformed JSON: unclosed brace');
  return text.slice(start, end + 1);
}

router.post('/', async (req, res) => {
  try {
    const { correction, rawText, currentFlatItems, currentDUs, projectStages, projectInstructions } = req.body as {
      correction: string;
      rawText: string;
      currentFlatItems: unknown[];
      currentDUs: unknown[];
      projectStages: string[];
      projectInstructions?: string;
    };

    if (!correction || typeof correction !== 'string') {
      res.status(400).json({ error: 'correction is required' });
      return;
    }

    const userMessage = `\
Current classification:
Flat items: ${JSON.stringify(currentFlatItems, null, 2)}
Variant groups: ${JSON.stringify(currentDUs, null, 2)}

Original document text (first 20000 chars):
${(rawText ?? '').slice(0, 20000)}

Correction to apply: "${correction}"

Return ONLY this JSON structure — no prose, no explanation, nothing else:
{"decisionUnits":[...],"flatItems":[...]}

Change only what the correction asks for. Preserve all other fields (id, supplierId, projectId, documentId, classificationStatus, etc.) exactly.`;

    const system = projectInstructions
      ? `PROJECT INSTRUCTIONS — always keep these in mind:\n${projectInstructions}\n\n${SYSTEM}`
      : SYSTEM;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const json = extractJson(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error(`Correct: model returned invalid JSON.\n\nRaw output:\n${raw}`);
    }

    const output = parsed as { decisionUnits: unknown[]; flatItems: unknown[] };
    if (!output.decisionUnits || !output.flatItems) {
      throw new Error('Correct: response missing decisionUnits or flatItems');
    }

    res.json({ ...output, reply: 'Done — classification updated.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Correct failed';
    console.error('[correct]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
