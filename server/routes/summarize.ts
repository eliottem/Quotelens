import { Router } from 'express';
import { anthropic, MODEL } from '../lib/anthropic.js';

const router = Router();

const SYSTEM = `\
You are a supplier quote analyst. Return ONLY a JSON object — no prose, no markdown, no code fences. Start with { and end with }.

Required shape:
{
  "summary": "<2-4 sentence plain English summary of what was extracted: item count, variant groups and their dimensions, which stages were assigned>",
  "conflict": null
}

If you detect a structural inconsistency — specifically the same service/product appearing BOTH as a total price (in a variant group) AND as a detailed cost breakdown (in flat items), or two conflicting pricing methods for the same product — replace null with:
{
  "description": "<one sentence describing the conflict>",
  "option1": {
    "label": "<short label for method 1>",
    "description": "<what this method captures>",
    "canonicalNames": ["<exact canonicalName or name of each item/DU in this option>"]
  },
  "option2": {
    "label": "<short label for method 2>",
    "description": "<what this method captures>",
    "canonicalNames": ["<exact canonicalName or name of each item/DU in this option>"]
  }
}

Use the exact canonicalName values from the input data in the canonicalNames arrays.`;

function extractJson(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON in summarize response');
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Malformed JSON in summarize response');
  return text.slice(start, end + 1);
}

router.post('/', async (req, res) => {
  try {
    const { decisionUnits, flatItems, projectStages, projectInstructions } = req.body as {
      decisionUnits: unknown[];
      flatItems: unknown[];
      projectStages: string[];
      projectInstructions?: string;
    };

    const userMessage = `\
Flat items (${flatItems.length}):
${JSON.stringify(flatItems, null, 2)}

Variant groups (${decisionUnits.length}):
${JSON.stringify(decisionUnits, null, 2)}

Project stages: ${(projectStages ?? []).join(', ')}

Return the JSON object now.`;

    const system = projectInstructions
      ? `PROJECT INSTRUCTIONS — always keep these in mind:\n${projectInstructions}\n\n${SYSTEM}`
      : SYSTEM;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as { summary: string; conflict: unknown };

    res.json({ summary: parsed.summary ?? '', conflict: parsed.conflict ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarize failed';
    console.error('[summarize]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
