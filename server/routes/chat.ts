import { Router } from 'express';
import { anthropic, MODEL } from '../lib/anthropic.js';

const router = Router();

const SYSTEM = `\
You are a helpful assistant inside QuoteLens, a supplier quote review tool. Talk to the user directly and naturally — say "you" not "the user", be concise, skip pleasantries.

Your job:
- Answer questions about what was extracted (items, prices, stages, variant groups)
- Flag inconsistencies you notice in the document — e.g. if the same service is priced two different ways (a total price AND an itemised breakdown), say so clearly and ask which one to keep
- Explain concepts when asked ("what is a variant group?")
- When there's ambiguity or a real choice to make, surface the options and ask

UNIT VIGILANCE — always be alert to unit ambiguity. Whenever a price is mentioned, ask yourself: "per what? per piece, per set, per kg, per batch?" If the unit isn't clear from the document or the extracted data, say so and ask the user to clarify. This is especially important when items could be sold individually or as groups.

What a variant group is: items sharing the same base product but differing on one dimension (size, volume tier, material) — grouped into a price matrix instead of separate line items.

Tone: direct, brief, like a sharp colleague. No bullet walls. No code or JSON. No re-summarising the whole document. Just answer what was asked — or flag the problem if you spotted one.`;

router.post('/', async (req, res) => {
  try {
    const { message, rawText, itemsSummary, history, projectInstructions } = req.body as {
      message: string;
      rawText?: string;
      itemsSummary?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      projectInstructions?: string;
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const contextBlock = [
      rawText ? `Document excerpt:\n${rawText.slice(0, 3000)}` : null,
      itemsSummary ? `Current classification:\n${itemsSummary}` : null,
    ].filter(Boolean).join('\n\n');

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(contextBlock ? [
        { role: 'user' as const, content: contextBlock },
        { role: 'assistant' as const, content: 'I have the document context. What would you like to know?' },
      ] : []),
      ...(history ?? []),
      { role: 'user' as const, content: message },
    ];

    const system = projectInstructions
      ? `PROJECT INSTRUCTIONS — always keep these in mind:\n${projectInstructions}\n\n${SYSTEM}`
      : SYSTEM;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    });

    const reply = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    res.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    console.error('[chat]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
