export interface Project {
  id: string;
  name: string;
  code: string;
  color: string;
  industry: string;
  stages: string[];
  rules?: string[];
  instructions?: string;
  targetVolume: number | null;
  currency: string;
  targetRetailPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  projectIds: string[];
  name: string;
  contact: string;
  email: string;
  country: string;
  city: string;
  notes: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ConflictOption {
  label: string;
  description: string;
  canonicalNames: string[];
}

export interface ConflictInfo {
  description: string;
  option1: ConflictOption;
  option2: ConflictOption;
  chosen?: 1 | 2;
}

export interface Document {
  id: string;
  supplierId: string;
  projectId: string;
  name: string;
  type: 'pdf' | 'excel' | 'text';
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'review' | 'parsed' | 'error';
  errorMessage?: string;
  rawText?: string;
  aiSummary?: string;
  chatHistory?: ChatMessage[];
  conflictInfo?: ConflictInfo | null;
}

export type ClassificationStatus = 'pending' | 'accepted' | 'rejected' | 'edited' | 'superseded';

export interface SupplierNote {
  id: string;
  supplierId: string;
  projectId: string;
  body: string;
  createdAt: string;
}

export interface SupplierItem {
  id: string;
  supplierId: string;
  projectId: string;
  documentId: string;
  rawName: string;
  canonicalName: string;
  variantNote?: string;
  stages: string[];
  unitCost: number;
  currency: string;
  unit: string;
  moq: number | null;
  leadTime: string | null;
  attributes: Record<string, string>;
  confidence: number;
  stageConfidence?: 'high' | 'medium' | 'low';
  suggestedStage?: string;
  classificationStatus: ClassificationStatus;
}

export interface VariantDimension {
  name: string;
  options: string[];
}

export interface DecisionUnit {
  id: string;
  supplierId: string;
  projectId: string;
  documentId: string;
  canonicalName: string;
  stages: string[];
  invariants: string[];
  variantDimensions: VariantDimension[];
  priceMatrix: Record<string, number>;
  confidence: number;
  sourceItemIds: string[];
  reviewStatus?: 'pending' | 'confirmed'; // undefined treated as 'pending'
}

export interface ScenarioItemSnapshot {
  id: string;
  canonicalName: string;
  variantNote?: string;
  unitCost: number;
  currency: string;
  unit: string;
  moq: number | null;
  leadTime: string | null;
  isDU: boolean;
  chosenDims?: Record<string, string>;
  invariants?: string[];
}

export interface ScenarioSelection {
  stage: string;
  supplierId: string;
  itemId: string;
  supplierName?: string;
  stageCost?: number;
  items?: ScenarioItemSnapshot[];
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  selections: ScenarioSelection[];
  totalCostPerUnit: number | null;
  targetRetailPrice: number | null;
  margin: number | null;
  createdAt: string;
}
