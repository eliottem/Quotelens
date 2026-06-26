import { Router } from 'express';
import { analyzeVariants } from '../agents/analyzer.js';
import type { AnalyzerInputItem } from '../agents/analyzer.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { rawText, items, context } = req.body as {
      rawText: string;
      items: AnalyzerInputItem[];
      context?: string;
    };

    if (typeof rawText !== 'string' || !rawText.trim()) {
      res.status(400).json({ error: 'rawText is required' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items must be a non-empty array' });
      return;
    }

    console.log(`[analyze] ${items.length} items — detecting variant groups`);

    const result = await analyzeVariants(rawText, items, false, context);

    console.log(
      `[analyze] done — ${result.decisionUnits.length} DecisionUnit${result.decisionUnits.length !== 1 ? 's' : ''}, ` +
      `${result.flatItems.length} flatItem${result.flatItems.length !== 1 ? 's' : ''}`,
    );

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analyze failed';
    console.error('[analyze]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
