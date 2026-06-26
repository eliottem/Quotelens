import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Project, Supplier, Document, SupplierItem, Scenario, SupplierNote, DecisionUnit } from './types';

interface StoreState {
  projects: Project[];
  suppliers: Supplier[];
  documents: Document[];
  items: SupplierItem[];
  scenarios: Scenario[];
  notes: SupplierNote[];
  decisionUnits: DecisionUnit[];
}

interface StoreActions {
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addDocument: (d: Document) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  deleteDocumentWithItems: (docId: string) => void;

  addItem: (item: SupplierItem) => void;
  bulkAddItems: (items: SupplierItem[]) => void;
  updateItem: (id: string, patch: Partial<SupplierItem>) => void;
  deleteItem: (id: string) => void;

  addScenario: (sc: Scenario) => void;
  updateScenario: (id: string, patch: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  reorderScenarios: (projectId: string, orderedIds: string[]) => void;

  addNote: (n: SupplierNote) => void;
  deleteNote: (id: string) => void;

  bulkAddDecisionUnits: (units: DecisionUnit[]) => void;
  updateDecisionUnit: (id: string, patch: Partial<DecisionUnit>) => void;
  deleteDecisionUnitsForDoc: (docId: string) => void;
  clearItemsForDoc: (docId: string) => void;
}

type StoreCtx = StoreState & StoreActions;

const Ctx = createContext<StoreCtx | null>(null);

const STORAGE_KEY = 'ql_store_v1';

function load(): StoreState {
  const defaults: StoreState = { projects: [], suppliers: [], documents: [], items: [], scenarios: [], notes: [], decisionUnits: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<StoreState>) };
  } catch {
    // ignore
  }
  return defaults;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function patch<K extends keyof StoreState>(key: K, updater: (prev: StoreState[K]) => StoreState[K]) {
    setState(s => ({ ...s, [key]: updater(s[key]) }));
  }

  const ctx: StoreCtx = {
    ...state,

    addProject: p => patch('projects', ps => [...ps, p]),
    updateProject: (id, p) => patch('projects', ps => ps.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteProject: id => patch('projects', ps => ps.filter(x => x.id !== id)),

    addSupplier: s => patch('suppliers', ss => [...ss, s]),
    updateSupplier: (id, p) => patch('suppliers', ss => ss.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteSupplier: id => patch('suppliers', ss => ss.filter(x => x.id !== id)),

    addDocument: d => patch('documents', ds => [...ds, d]),
    updateDocument: (id, p) => patch('documents', ds => ds.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteDocumentWithItems: docId => setState(s => ({
      ...s,
      documents: s.documents.filter(d => d.id !== docId),
      items: s.items.filter(it => it.documentId !== docId),
      decisionUnits: s.decisionUnits.filter(du => du.documentId !== docId),
    })),

    addItem: item => patch('items', is => [...is, item]),
    bulkAddItems: newItems => patch('items', is => [...is, ...newItems]),
    updateItem: (id, p) => patch('items', is => is.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteItem: id => patch('items', is => is.filter(x => x.id !== id)),

    addScenario: sc => patch('scenarios', ss => [...ss, sc]),
    updateScenario: (id, p) => patch('scenarios', ss => ss.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteScenario: id => patch('scenarios', ss => ss.filter(x => x.id !== id)),
    reorderScenarios: (projectId, orderedIds) => patch('scenarios', ss => {
      const forProject = orderedIds.map(id => ss.find(s => s.id === id)).filter(Boolean) as Scenario[];
      const others = ss.filter(s => s.projectId !== projectId);
      return [...others, ...forProject];
    }),

    addNote: n => patch('notes', ns => [...ns, n]),
    deleteNote: id => patch('notes', ns => ns.filter(x => x.id !== id)),

    bulkAddDecisionUnits: units => patch('decisionUnits', dus => [...dus, ...units]),
    updateDecisionUnit: (id, p) => patch('decisionUnits', dus => dus.map(x => x.id === id ? { ...x, ...p } : x)),
    deleteDecisionUnitsForDoc: docId => patch('decisionUnits', dus => dus.filter(du => du.documentId !== docId)),
    clearItemsForDoc: docId => setState(s => ({
      ...s,
      items: s.items.filter(it => it.documentId !== docId),
      decisionUnits: s.decisionUnits.filter(du => du.documentId !== docId),
    })),
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
