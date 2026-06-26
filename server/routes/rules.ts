import { Router } from 'express';
import { anthropic, MODEL } from '../lib/anthropic.js';

const router = Router();

interface Selection {
  stage: string;
  supplierId: string;
  supplierName: string;
  itemId?: string;
  itemName?: string;
  itemCost?: number;
  duName?: string;
  duDims?: Record<string, string>;
  duPrice?: number;
}

interface EvaluateRequest {
  rules: string[];
  projectName: string;
  stages: string[];
  selections: Selection[];
}

router.post('/', async (req, res) => {
  try {
    const { rules, projectName, stages, selections } = req.body as EvaluateRequest;

    if (!rules?.length || !selections?.length) {
      return res.json({ violations: [] });
    }

    const selectionsText = selections.map(s => {
      const parts = [`Stage "${s.stage}": supplier "${s.supplierName}"`];
      if (s.itemName) parts.push(`item "${s.itemName}" ($${s.itemCost}/unit)`);
      if (s.duName) parts.push(`variant "${s.duName}" (${JSON.stringify(s.duDims)}, $${s.duPrice}/unit)`);
      return '- ' + parts.join(', ');
    }).join('\n');

    const prompt = `You are a supply chain cost rules engine for a product cost builder.

Project: ${projectName}
Production stages: ${stages.join(', ')}

User-defined rules (plain English):
${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Current selections:
${selectionsText}

Identify which rules (if any) are currently violated by the selections. Be conservative: only flag clear, unambiguous violations. If a rule is vague or doesn't clearly apply, do not flag it.

Return ONLY a JSON object with no additional text:
{
  "violations": [
    { "rule": "exact rule text from the list above", "stage": "stage name or null", "message": "one sentence explaining the violation" }
  ]
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.json({ violations: [] });
    }

    const result = JSON.parse(jsonMatch[0]) as { violations: Array<{ rule: string; stage?: string | null; message: string }> };
    console.log(`[Rules] ${rules.length} rule(s) evaluated → ${result.violations.length} violation(s)`);
    res.json(result);
  } catch (err) {
    console.error('[Rules] Evaluation error:', err);
    res.status(500).json({ error: 'Rules evaluation failed' });
  }
});

export default router;
