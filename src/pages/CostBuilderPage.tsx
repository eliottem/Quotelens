import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import { Lynx } from '@/components/Lynx';
import { useStore } from '@/lib/store';
import { STAGE_COLORS } from '@/lib/data';
import { evaluateRules } from '@/lib/api';
import type { RuleViolation } from '@/lib/api';
import type { ScenarioSelection, ScenarioItemSnapshot, Scenario, SupplierItem, DecisionUnit } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function CostBuilderPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, suppliers, items, decisionUnits, addScenario, updateProject } = useStore();

  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  // Eligible items: accepted or edited only
  const eligibleItems = items.filter(
    it => it.projectId === project.id &&
      (it.classificationStatus === 'accepted' || it.classificationStatus === 'edited'),
  );

  const projectDUs = decisionUnits.filter(du => du.projectId === project.id && du.reviewStatus === 'confirmed');

  // ── Diagnostic: log what the store actually contains ──────────────────────
  useEffect(() => {
    console.log('[CostBuilder] ── store snapshot ──────────────────────────────');
    console.log(`  eligibleItems (${eligibleItems.length}):`, eligibleItems.map(it =>
      `"${it.canonicalName}" [${it.stages.join(',')}] sup=${it.supplierId.slice(0, 6)} id=${it.id.slice(0, 6)}`
    ));
    console.log(`  projectDUs (${projectDUs.length}):`, projectDUs.map(du =>
      `"${du.canonicalName}" [${du.stages.join(',')}] sup=${du.supplierId.slice(0, 6)} dims=${du.variantDimensions.map(d => d.name).join('+')} sources=${du.sourceItemIds.length}`
    ));
    const duSourceIds = new Set(projectDUs.flatMap(du => du.sourceItemIds));
    const leaked = eligibleItems.filter(it => duSourceIds.has(it.id));
    if (leaked.length > 0) {
      console.warn(`  ⚠ ${leaked.length} DU-source item(s) still in eligibleItems — pipeline fix not yet applied to existing data`);
    } else if (projectDUs.length > 0) {
      console.log('  ✓ No DU-source items in eligibleItems — data model is correct');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleItems.length, projectDUs.length]);

  // ── Selection state ────────────────────────────────────────────────────────
  // One supplier per stage (default). Selecting a supplier auto-includes all
  // their items for that stage as an atomic bundle.
  const [stageSupplier, setStageSupplier] = useState<Record<string, string>>({});
  // Variant dimension picks when a DecisionUnit exists for the stage/supplier
  const [stageDU, setStageDU] = useState<Record<string, { unitId: string; dims: Record<string, string> }>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [saved, setSaved] = useState(false);

  // Rules Engine
  const rules = project.rules ?? [];
  const [ruleInput, setRuleInput] = useState('');
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const evaluateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DU detail expand state
  const [expandedDUInfo, setExpandedDUInfo] = useState<Record<string, boolean>>({});

  // ── Helpers ────────────────────────────────────────────────────────────────

  function suppliersForStage(stage: string) {
    const lc = stage.toLowerCase();
    const fromItems = eligibleItems
      .filter(it => it.stages.some(s => s.toLowerCase() === lc))
      .map(it => it.supplierId);
    const fromDUs = projectDUs
      .filter(du => du.stages.some(s => s.toLowerCase() === lc))
      .map(du => du.supplierId);
    const ids = [...new Set([...fromItems, ...fromDUs])];
    return ids.map(id => suppliers.find(s => s.id === id)).filter(Boolean) as typeof suppliers;
  }

  function duForStageAndSupplier(stage: string, supplierId: string): DecisionUnit | undefined {
    return projectDUs.find(du =>
      du.supplierId === supplierId &&
      du.stages.some(s => s.toLowerCase() === stage.toLowerCase()),
    );
  }

  // All eligible items from this supplier for this stage
  function allItemsForStageSupplier(stage: string, supplierId: string): SupplierItem[] {
    return eligibleItems.filter(it =>
      it.supplierId === supplierId &&
      it.stages.some(s => s.toLowerCase() === stage.toLowerCase()),
    );
  }

  // Items NOT part of the DU for this stage/supplier (the flat atomic bundle)
  function flatBundleForStageSupplier(stage: string, supplierId: string): SupplierItem[] {
    const du = duForStageAndSupplier(stage, supplierId);
    if (!du) return allItemsForStageSupplier(stage, supplierId);
    const duIds = new Set(du.sourceItemIds);
    return allItemsForStageSupplier(stage, supplierId).filter(it => !duIds.has(it.id));
  }

  function duPriceKey(unitId: string, dims: Record<string, string>): string {
    const du = projectDUs.find(d => d.id === unitId);
    if (!du) return '';
    return du.variantDimensions.map(d => dims[d.name] ?? d.options[0]).join(' / ');
  }

  // ── Selection actions ──────────────────────────────────────────────────────

  function selectSupplier(stage: string, supplierId: string) {
    setSaved(false);
    setStageSupplier(prev => ({ ...prev, [stage]: supplierId }));
    setStageDU(prev => { const n = { ...prev }; delete n[stage]; return n; });
  }

  function selectDUOption(stage: string, unitId: string, dimName: string, option: string) {
    setSaved(false);
    setStageDU(prev => {
      const existing = prev[stage] ?? { unitId, dims: {} };
      return { ...prev, [stage]: { unitId, dims: { ...existing.dims, [dimName]: option } } };
    });
  }

  function resetStage(stage: string) {
    setSaved(false);
    setStageSupplier(prev => { const n = { ...prev }; delete n[stage]; return n; });
    setStageDU(prev => { const n = { ...prev }; delete n[stage]; return n; });
  }

  // ── Cost calculation ────────────────────────────────────────────────────────
  // Flat items: all bundle items across selected stages, deduped by item ID
  // (so a bundled item covering Primary+Secondary is counted once)
  const flatItemMap = new Map<string, SupplierItem>();
  project.stages.forEach(stage => {
    const supplierId = stageSupplier[stage];
    if (!supplierId) return;
    flatBundleForStageSupplier(stage, supplierId).forEach(it => flatItemMap.set(it.id, it));
  });
  const flatCost = [...flatItemMap.values()].reduce((sum, it) => sum + it.unitCost, 0);

  // DU costs: sum of selected price matrix entries
  const duCost = Object.entries(stageDU).reduce((sum, [, sel]) => {
    const key = duPriceKey(sel.unitId, sel.dims);
    const du = projectDUs.find(d => d.id === sel.unitId);
    return sum + (du?.priceMatrix[key] ?? 0);
  }, 0);

  const totalCost = flatCost + duCost;

  const hasAnySelection = Object.keys(stageSupplier).length > 0;

  // ── Rules ──────────────────────────────────────────────────────────────────

  function addRule(text: string) {
    const trimmed = text.trim();
    if (!trimmed || rules.includes(trimmed)) return;
    updateProject(project.id, { rules: [...rules, trimmed] });
    setRuleInput('');
  }

  function removeRule(idx: number) {
    updateProject(project.id, { rules: rules.filter((_, i) => i !== idx) });
  }

  useEffect(() => {
    if (evaluateTimeoutRef.current) clearTimeout(evaluateTimeoutRef.current);
    if (rules.length === 0) { setViolations([]); return; }

    const activeSelections = project.stages.flatMap(stage => {
      const supplierId = stageSupplier[stage];
      if (!supplierId) return [];
      const sup = suppliers.find(s => s.id === supplierId);
      if (!sup) return [];
      const duSel = stageDU[stage];
      if (duSel) {
        const du = decisionUnits.find(d => d.id === duSel.unitId);
        if (du) {
          const key = du.variantDimensions.map(d => duSel.dims[d.name] ?? d.options[0]).join(' / ');
          return [{ stage, supplierId, supplierName: sup.name, duName: du.canonicalName, duDims: duSel.dims, duPrice: du.priceMatrix[key] }];
        }
      }
      const bundle = flatBundleForStageSupplier(stage, supplierId);
      return [{ stage, supplierId, supplierName: sup.name, itemName: bundle.map(it => it.canonicalName).join(', '), itemCost: bundle.reduce((s, it) => s + it.unitCost, 0) }];
    });

    if (activeSelections.length === 0) { setViolations([]); return; }

    evaluateTimeoutRef.current = setTimeout(() => {
      evaluateRules({ rules, projectName: project.name, stages: project.stages, selections: activeSelections })
        .then(r => setViolations(r.violations))
        .catch(err => console.warn('[Rules] Evaluation failed:', err instanceof Error ? err.message : err));
    }, 800);

    return () => { if (evaluateTimeoutRef.current) clearTimeout(evaluateTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rules), JSON.stringify(stageSupplier), JSON.stringify(stageDU)]);

  // ── Scenario save ──────────────────────────────────────────────────────────

  function saveScenario() {
    if (!scenarioName.trim()) return;
    const sel: ScenarioSelection[] = project.stages
      .filter(stage => stageSupplier[stage])
      .map(stage => {
        const supplierId = stageSupplier[stage];
        const sup = suppliers.find(s => s.id === supplierId);
        const du = stageDU[stage] ? projectDUs.find(d => d.id === stageDU[stage].unitId) : undefined;
        const duSel = stageDU[stage];
        const flatBundle = flatBundleForStageSupplier(stage, supplierId);

        const snapshotItems: ScenarioItemSnapshot[] = [];

        if (du && duSel) {
          const key = duPriceKey(du.id, duSel.dims);
          snapshotItems.push({
            id: du.id,
            canonicalName: du.canonicalName,
            unitCost: du.priceMatrix[key] ?? 0,
            currency: project.currency || 'USD',
            unit: 'unit',
            moq: null,
            leadTime: null,
            isDU: true,
            chosenDims: duSel.dims,
            invariants: du.invariants,
          });
        }

        flatBundle.forEach(it => {
          snapshotItems.push({
            id: it.id,
            canonicalName: it.canonicalName,
            variantNote: it.variantNote,
            unitCost: it.unitCost,
            currency: it.currency,
            unit: it.unit,
            moq: it.moq,
            leadTime: it.leadTime,
            isDU: false,
          });
        });

        const stageCost = snapshotItems.reduce((sum, it) => sum + it.unitCost, 0);

        return {
          stage,
          supplierId,
          itemId: '',
          supplierName: sup?.name ?? '',
          stageCost,
          items: snapshotItems,
        };
      });

    const sc: Scenario = {
      id: randomId(),
      projectId: project.id,
      name: scenarioName.trim(),
      selections: sel,
      totalCostPerUnit: totalCost,
      targetRetailPrice: null,
      margin: null,
      createdAt: new Date().toISOString(),
    };
    addScenario(sc);
    setSaved(true);
  }

  const hasPendingItems = items.some(
    it => it.projectId === project.id && it.classificationStatus === 'pending',
  );
  const isEmpty = project.stages.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>
            Cost Builder
            <span className="ql-badge ql-badge-muted mono">{project.name}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {project.stages.length === 0
              ? 'Define stages in project settings to get started'
              : eligibleItems.length === 0 && projectDUs.length === 0
                ? `${project.stages.length} stage${project.stages.length !== 1 ? 's' : ''} · no items yet — accept classifications in supplier detail`
                : (() => {
                    const duItems = projectDUs.reduce((sum, du) => sum + du.sourceItemIds.length, 0);
                    const total = eligibleItems.length + duItems;
                    return `${total} item${total !== 1 ? 's' : ''} across ${project.stages.length} stage${project.stages.length !== 1 ? 's' : ''} · 1 supplier per stage`;
                  })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ql-btn ql-btn-ghost" onClick={() => navigate(`/projects/${projectId}/scenarios`)}>
            <Icon name="scenarios" size={13}/> Scenarios
          </button>
          <button className="ql-btn ql-btn-ghost" onClick={() => navigate(`/projects/${projectId}/suppliers`)}>
            <Icon name="suppliers" size={13}/> Suppliers
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
            <Icon name="builder" size={24}/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}>No stages defined</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380, lineHeight: 1.6 }}>
              Define your production stages in project settings first — they become the cost buckets that structure your Cost Builder.
            </div>
          </div>
          <button className="ql-btn ql-btn-mint" onClick={() => navigate(`/projects/${projectId}`)}>
            <Icon name="settings" size={13}/> Project settings
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: stage funnel */}
          <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>

            {/* Rules Engine */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>RULES</div>
              {rules.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {rules.map((rule, idx) => {
                    const violated = violations.some(v => v.rule === rule);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, background: violated ? 'var(--amber-soft, rgba(245,183,70,0.1))' : 'var(--surface-2)', border: `1px solid ${violated ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px 4px 10px', fontSize: 12, color: violated ? 'var(--amber)' : 'var(--text-2)' }}>
                        {violated && <Icon name="warn" size={11}/>}
                        <span>{rule}</span>
                        <button onClick={() => removeRule(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2, display: 'flex', lineHeight: 1, marginLeft: 2 }}>
                          <Icon name="close" size={10}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={ruleInput}
                  onChange={e => setRuleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule(ruleInput); } }}
                  placeholder="Add a rule in plain English… e.g. 'Only use EU suppliers for Primary Packaging'"
                  style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, outline: 'none', color: 'var(--text)' }}
                />
                <button className="ql-btn ql-btn-ghost" onClick={() => addRule(ruleInput)} disabled={!ruleInput.trim()} style={{ flexShrink: 0 }}>
                  <Icon name="plus" size={13}/>
                </button>
              </div>
            </div>

            {hasPendingItems && (
              <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 8, background: 'var(--amber-soft, rgba(245,183,70,0.1))', border: '1px solid var(--amber)', fontSize: 12.5, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="warn" size={14}/>
                Some items are still pending review — accept them in the supplier detail to include them here.
              </div>
            )}

            {violations.length > 0 && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {violations.map((v, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--amber-soft, rgba(245,183,70,0.1))', border: '1px solid var(--amber)', fontSize: 12.5, color: 'var(--amber)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name="warn" size={14}/></div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{v.message}</div>
                      {v.stage && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Stage: {v.stage}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-stage cards */}
            {project.stages.map(stage => {
              const color = STAGE_COLORS[stage] ?? 'var(--cobalt)';
              const stageSuppliers = suppliersForStage(stage);
              const selectedSupplierId = stageSupplier[stage];
              const isResolved = !!selectedSupplierId;

              let subLabel: string;
              if (isResolved) {
                const sup = suppliers.find(s => s.id === selectedSupplierId);
                subLabel = sup?.name ?? 'supplier selected';
              } else if (stageSuppliers.length === 0) {
                subLabel = 'no items yet';
              } else {
                subLabel = `${stageSuppliers.length} supplier${stageSuppliers.length !== 1 ? 's' : ''} available`;
              }

              return (
                <div key={stage} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isResolved ? color : 'var(--border)', flexShrink: 0 }}/>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: isResolved ? 'var(--text)' : 'var(--text-3)' }}>{stage}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{subLabel}</span>
                    {isResolved && (
                      <button className="ql-btn ql-btn-ghost" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 11, color: 'var(--text-3)' }} onClick={() => resetStage(stage)}>
                        ✕ clear
                      </button>
                    )}
                  </div>

                  <div className="ql-card" style={{ padding: '14px 18px', opacity: stageSuppliers.length === 0 ? 0.5 : 1 }}>
                    {stageSuppliers.length === 0 ? (
                      // Empty stage
                      <div style={{ fontSize: 12.5, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        No items for this stage yet.
                        <button className="ql-btn ql-btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => navigate(`/projects/${projectId}/suppliers`)}>
                          Add supplier →
                        </button>
                      </div>
                    ) : !selectedSupplierId ? (
                      // Supplier picker
                      <div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginBottom: 10 }}>Choose supplier</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {stageSuppliers.map(s => {
                            const lc = stage.toLowerCase();
                            const flatCount = eligibleItems.filter(it =>
                              it.supplierId === s.id && it.stages.some(st => st.toLowerCase() === lc)
                            ).length;
                            const duForSup = projectDUs.filter(du =>
                              du.supplierId === s.id && du.stages.some(st => st.toLowerCase() === lc)
                            );
                            const duItemCount = duForSup.reduce((sum, du) => sum + du.sourceItemIds.length, 0);
                            const count = flatCount + duItemCount;
                            const hasVariants = duForSup.length > 0;
                            return (
                              <button
                                key={s.id}
                                className="ql-btn ql-btn-ghost"
                                style={{ fontSize: 12.5, padding: '6px 14px', borderColor: 'var(--border)' }}
                                onClick={() => selectSupplier(stage, s.id)}
                              >
                                {s.name}
                                <span className="mono" style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 6 }}>
                                  {count} item{count !== 1 ? 's' : ''}
                                  {hasVariants ? ' · variants' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Supplier selected — left panel shows ONLY what needs an active choice
                      (() => {
                        const du = duForStageAndSupplier(stage, selectedSupplierId);
                        const flatBundle = flatBundleForStageSupplier(stage, selectedSupplierId);
                        const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name ?? '';
                        const sel = stageDU[stage] ?? (du ? { unitId: du.id, dims: {} } : undefined);
                        const totalItems = flatBundle.length + (du ? du.sourceItemIds.length : 0);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Back link + summary */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cobalt)', fontSize: 12, padding: 0 }}
                                onClick={() => { setStageSupplier(p => { const n = { ...p }; delete n[stage]; return n; }); setStageDU(p => { const n = { ...p }; delete n[stage]; return n; }); setSaved(false); }}
                              >
                                ← {supplierName}
                              </button>
                              <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
                                · {totalItems} item{totalItems !== 1 ? 's' : ''} included
                                {du ? ` · ${du.variantDimensions.length} choice${du.variantDimensions.length !== 1 ? 's' : ''} to make` : ''}
                              </span>
                            </div>

                            {/* Variant dimension pickers — only when there's a DU */}
                            {du && sel && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: 'var(--text-2)' }}>
                                  {du.canonicalName}
                                  <span className="ql-badge ql-badge-muted" style={{ fontSize: 9.5, marginLeft: 8 }}>variant</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {du.variantDimensions.map(dim => {
                                    const chosen = sel.dims[dim.name] ?? '';
                                    return (
                                      <div key={dim.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>{dim.name}</label>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                          <select
                                            value={chosen}
                                            onChange={e => selectDUOption(stage, du.id, dim.name, e.target.value)}
                                            style={{ width: '100%', appearance: 'none', background: chosen ? 'var(--cobalt-soft-2)' : 'var(--bg)', border: `1px solid ${chosen ? 'var(--cobalt)' : 'var(--border)'}`, borderRadius: 6, padding: '7px 28px 7px 10px', fontSize: 12.5, color: chosen ? 'var(--cobalt)' : 'var(--text-3)', outline: 'none', cursor: 'pointer', fontWeight: chosen ? 600 : 400 }}
                                          >
                                            <option value="">— choose —</option>
                                            {dim.options.map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-4)' }}>
                                            <Icon name="chevron-down" size={12}/>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Price result */}
                                {(() => {
                                  const key = duPriceKey(du.id, sel.dims);
                                  const price = du.priceMatrix[key];
                                  const allChosen = du.variantDimensions.every(d => sel.dims[d.name]);
                                  return (
                                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
                                        {allChosen ? 'Price for this combination' : 'Select all options to see price'}
                                      </span>
                                      {price != null && (
                                        <span className="mono" style={{ fontWeight: 700, fontSize: 15, color }}>${price.toFixed(3)}</span>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Invariants — informational, collapsed by default */}
                                {du.invariants.length > 0 && (
                                  <div style={{ marginTop: 10 }}>
                                    <button
                                      onClick={() => setExpandedDUInfo(prev => ({ ...prev, [du.id]: !prev[du.id] }))}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: 11, color: expandedDUInfo[du.id] ? 'var(--cobalt)' : 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                      <Icon name="info" size={11}/> {expandedDUInfo[du.id] ? 'Hide' : 'Shared specs'}
                                    </button>
                                    {expandedDUInfo[du.id] && (
                                      <div style={{ marginTop: 6, padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
                                        {du.invariants.join(' · ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* No DU — nothing to choose, bundle is fully determined */}
                            {!du && flatBundle.length > 0 && (
                              <div style={{ fontSize: 12, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, background: color, display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff' }}>
                                  <Icon name="check" size={8} strokeWidth={3}/>
                                </div>
                                Bundle included — see recap →
                              </div>
                            )}

                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: scenario recap */}
          <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Scenario recap</div>

            {!hasAnySelection ? (
              <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6 }}>
                Select a supplier per stage to build your cost scenario.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {project.stages.map(stage => {
                    const color = STAGE_COLORS[stage] ?? 'var(--cobalt)';
                    const supplierId = stageSupplier[stage];
                    if (!supplierId) return null;

                    const sup = suppliers.find(s => s.id === supplierId);
                    const du = stageDU[stage] ? projectDUs.find(d => d.id === stageDU[stage].unitId) : undefined;
                    const duSel = stageDU[stage];
                    const flatBundle = flatBundleForStageSupplier(stage, supplierId);

                    return (
                      <div key={stage} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
                          {stage.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginBottom: 5 }}>{sup?.name}</div>

                        {du && duSel && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: flatBundle.length > 0 ? 4 : 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>
                                {du.canonicalName}
                                <span className="ql-badge ql-badge-muted" style={{ fontSize: 9, marginLeft: 4 }}>variant</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                                {du.variantDimensions.map(d => duSel.dims[d.name] ?? d.options[0]).join(' / ')}
                              </div>
                            </div>
                            {(() => {
                              const price = du.priceMatrix[duPriceKey(du.id, duSel.dims)];
                              return price != null
                                ? <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>${price.toFixed(3)}</span>
                                : <span style={{ fontSize: 11, color: 'var(--text-4)' }}>—</span>;
                            })()}
                          </div>
                        )}

                        {flatBundle.map(it => (
                          <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {it.canonicalName}
                              {it.stages.length > 1 && <span className="ql-badge ql-badge-muted" style={{ fontSize: 9, marginLeft: 4 }}>bundled</span>}
                            </div>
                            <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>${it.unitCost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Total / unit</span>
                    <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>${totalCost.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Set selling price in Scenarios to see margin.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={scenarioName}
                    onChange={e => { setScenarioName(e.target.value); setSaved(false); }}
                    placeholder="Scenario name…"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, outline: 'none', color: 'var(--text)', width: '100%' }}
                  />
                  <button
                    className={`ql-btn ${saved ? 'ql-btn-ghost' : 'ql-btn-mint'}`}
                    style={{ justifyContent: 'center' }}
                    onClick={saveScenario}
                    disabled={!scenarioName.trim() || saved}
                  >
                    {saved ? <><Icon name="check" size={12}/> Saved</> : 'Save scenario'}
                  </button>
                </div>
              </>
            )}

            <div style={{ marginTop: 'auto', background: 'var(--cobalt-soft-2)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cobalt)', marginBottom: 6, fontWeight: 500 }}>
                <Lynx size={14}/> Lynx
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {!hasAnySelection
                  ? 'Select a supplier per stage to see cost intelligence.'
                  : `${Object.keys(stageSupplier).length} stage${Object.keys(stageSupplier).length !== 1 ? 's' : ''} resolved. Total $${totalCost.toFixed(2)}/unit.`
                }
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
