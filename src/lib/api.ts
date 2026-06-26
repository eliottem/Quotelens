// Typed fetch wrappers for the QuoteLens API.
// All calls go through /api/* — proxied to Express in dev, served directly in prod.

import type { DecisionUnit } from './types';

export interface RawLineItem {
  rawName: string;
  unitCost: number | null;
  currency: string;
  unit: string;
  moq: number | null;
  leadTime: string | null;
  attributes: Record<string, string>;
}

export interface ClassifiedItem extends RawLineItem {
  canonicalName: string;
  variantNote?: string;
  stages: string[];
  confidence: number;
  stageConfidence: 'high' | 'medium' | 'low';
  suggestedStage?: string;
}

export interface AnalyzeRequestItem extends ClassifiedItem {
  id: string;
  supplierId: string;
}

async function apiCall<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.error as string) ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function parseDocument(
  file: File,
  meta: { supplierId: string; projectId: string; docId: string; supplierName: string; currency?: string; context?: string },
): Promise<{ items: RawLineItem[]; rawText: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('supplierId', meta.supplierId);
  form.append('projectId', meta.projectId);
  form.append('docId', meta.docId);
  form.append('supplierName', meta.supplierName);
  if (meta.currency) form.append('currency', meta.currency);
  if (meta.context) form.append('context', meta.context);

  return apiCall('/api/parse', { method: 'POST', body: form });
}

export async function classifyItems(
  items: RawLineItem[],
  stages: string[],
  existingCanonicals: string[],
  projectCurrency?: string,
  context?: string,
  projectInstructions?: string,
): Promise<{ classified: ClassifiedItem[] }> {
  return apiCall('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, stages, existingCanonicals, projectCurrency, context, projectInstructions }),
  });
}

export async function analyzeDocument(
  rawText: string,
  items: AnalyzeRequestItem[],
  context?: string,
): Promise<{ decisionUnits: Omit<DecisionUnit, 'id' | 'projectId' | 'documentId'>[]; flatItems: unknown[] }> {
  return apiCall('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, items, context }),
  });
}

export async function summarizeClassification(payload: {
  decisionUnits: unknown[];
  flatItems: unknown[];
  projectStages: string[];
  projectInstructions?: string;
}): Promise<{ summary: string; conflict: import('./types').ConflictInfo | null }> {
  return apiCall('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function correctClassification(payload: {
  correction: string;
  rawText: string;
  currentFlatItems: unknown[];
  currentDUs: unknown[];
  projectStages: string[];
  projectInstructions?: string;
}): Promise<{ decisionUnits: unknown[]; flatItems: unknown[]; reply?: string }> {
  return apiCall('/api/correct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function chatWithDoc(payload: {
  message: string;
  rawText?: string;
  itemsSummary?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  projectInstructions?: string;
}): Promise<{ reply: string }> {
  return apiCall('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export interface RuleSelection {
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

export interface RuleViolation {
  rule: string;
  stage?: string | null;
  message: string;
}

export async function evaluateRules(payload: {
  rules: string[];
  projectName: string;
  stages: string[];
  selections: RuleSelection[];
}): Promise<{ violations: RuleViolation[] }> {
  return apiCall('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
