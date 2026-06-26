import { Router } from 'express';
import { classifyItems } from '../agents/classifier.js';
import type { RawLineItem } from '../agents/extractor.js';
import type { ClassifierContext } from '../agents/classifier.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { items, stages, existingCanonicals, projectCurrency, context, projectInstructions } = req.body as {
      items: RawLineItem[];
      stages: string[];
      existingCanonicals?: string[];
      projectCurrency?: string;
      context?: string;
      projectInstructions?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items must be a non-empty array' });
      return;
    }
    if (!Array.isArray(stages) || stages.length === 0) {
      res.status(400).json({ error: 'stages must be a non-empty array' });
      return;
    }

    const ctx: ClassifierContext = {
      stages,
      existingCanonicals: existingCanonicals ?? [],
      projectCurrency,
      context,
      projectInstructions,
    };

    const classified = await classifyItems(items, ctx);
    res.json({ classified });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Classify failed';
    console.error('[classify]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
