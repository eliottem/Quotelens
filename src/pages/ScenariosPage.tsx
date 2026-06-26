import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import { Lynx } from '@/components/Lynx';
import { useStore } from '@/lib/store';
import { STAGE_COLORS } from '@/lib/data';
import type { Scenario } from '@/lib/types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ScenariosPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, scenarios, updateScenario, deleteScenario, reorderScenarios, updateProject } = useStore();

  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  const projectScenarios = scenarios.filter(sc => sc.projectId === project.id);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [priceInput, setPriceInput] = useState<string | null>(null);

  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const globalPrice = project.targetRetailPrice;

  function computeMargin(totalCost: number | null): number | null {
    if (totalCost == null || !globalPrice || globalPrice <= 0) return null;
    return ((globalPrice - totalCost) / globalPrice) * 100;
  }

  function commitGlobalPrice() {
    if (priceInput === null) return;
    const parsed = parseFloat(priceInput);
    if (!isNaN(parsed) && parsed > 0) updateProject(project.id, { targetRetailPrice: parsed });
    else if (priceInput === '') updateProject(project.id, { targetRetailPrice: null });
    setPriceInput(null);
  }

  function startRename(sc: Scenario) { setEditingId(sc.id); setEditingName(sc.name); }
  function commitRename(sc: Scenario) {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== sc.name) updateScenario(sc.id, { name: trimmed });
    setEditingId(null);
  }
  function toggleExpand(id: string) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault(); overIdx.current = idx; setDragOver(idx);
  }
  function onDrop() {
    const from = dragIdx.current, to = overIdx.current;
    if (from !== null && to !== null && from !== to) {
      const r = [...projectScenarios];
      const [m] = r.splice(from, 1); r.splice(to, 0, m);
      reorderScenarios(project.id, r.map(s => s.id));
    }
    dragIdx.current = null; overIdx.current = null; setDragOver(null);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>
            Scenarios
            <span className="ql-badge ql-badge-muted mono">{project.name}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {projectScenarios.length === 0 ? 'No scenarios yet' : `${projectScenarios.length} scenario${projectScenarios.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Selling price</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>$</span>
            <input
              type="number" min="0" step="0.01"
              value={priceInput ?? (globalPrice?.toString() ?? '')}
              placeholder="—"
              onFocus={() => setPriceInput(globalPrice?.toString() ?? '')}
              onChange={e => setPriceInput(e.target.value)}
              onBlur={commitGlobalPrice}
              onKeyDown={e => { if (e.key === 'Enter') commitGlobalPrice(); if (e.key === 'Escape') setPriceInput(null); }}
              style={{ width: 80, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', padding: 0 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>/unit</span>
          </div>
          <button className="ql-btn ql-btn-mint" onClick={() => navigate(`/projects/${projectId}/builder`)}>
            <Icon name="plus" size={13}/>New scenario
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {projectScenarios.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
              <Icon name="scenarios" size={24}/>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}>No scenarios yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
                Build a cost scenario by selecting suppliers per stage in the Cost Builder.
              </div>
            </div>
            <button className="ql-btn ql-btn-mint" onClick={() => navigate(`/projects/${projectId}/builder`)}>
              Open Cost Builder
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Scenarios side by side — equal width, fill available space */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {projectScenarios.map((sc, idx) => {
                const isExpanded = expandedIds.has(sc.id);
                const isEditing = editingId === sc.id;
                const margin = computeMargin(sc.totalCostPerUnit);
                const marginColor = margin != null
                  ? margin > 60 ? 'var(--mint)' : margin > 40 ? 'var(--amber)' : 'var(--red)'
                  : 'var(--text-4)';
                const isDragTarget = dragOver === idx;

                return (
                  <div
                    key={sc.id}
                    className="ql-card"
                    style={{ flex: 1, minWidth: 260, maxWidth: 420, padding: 0, overflow: 'hidden', opacity: dragIdx.current === idx ? 0.4 : 1, outline: isDragTarget ? '2px solid var(--cobalt)' : 'none' }}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDrop={onDrop}
                    onDragEnd={() => { dragIdx.current = null; setDragOver(null); }}
                  >
                    {/* Name + actions */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-4)', cursor: 'grab', fontSize: 16, lineHeight: 1, flexShrink: 0 }} title="Drag to reorder">⠿</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <input
                            autoFocus value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => commitRename(sc)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(sc); if (e.key === 'Escape') setEditingId(null); }}
                            style={{ fontSize: 15, fontWeight: 600, background: 'var(--cobalt-soft-2)', border: '1px solid var(--cobalt)', borderRadius: 4, padding: '2px 8px', outline: 'none', color: 'var(--text)', width: '100%' }}
                          />
                        ) : (
                          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 5, cursor: 'text' }} onDoubleClick={() => startRename(sc)} title="Double-click to rename">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.name}</span>
                            <span onClick={() => startRename(sc)} style={{ opacity: 0.25, cursor: 'pointer', flexShrink: 0 }}><Icon name="pencil" size={11}/></span>
                          </div>
                        )}
                      </div>
                      <button className="ql-btn ql-btn-ghost" style={{ padding: '3px 7px', color: 'var(--red)', flexShrink: 0 }} onClick={() => deleteScenario(sc.id)}>
                        <Icon name="trash" size={12}/>
                      </button>
                    </div>

                    {/* Cost + margin — centred block */}
                    <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 6 }}>COST / UNIT</div>
                      <div className="hero-number" style={{ fontSize: 44, lineHeight: 1, marginBottom: 16 }}>
                        {sc.totalCostPerUnit != null ? `$${fmt(sc.totalCostPerUnit)}` : '—'}
                      </div>
                      {margin != null ? (
                        <>
                          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 4 }}>MARGIN</div>
                          <div style={{ fontSize: 34, fontWeight: 700, color: marginColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{margin.toFixed(1)}%</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>
                          {globalPrice ? 'No cost data' : 'Set selling price to see margin'}
                        </div>
                      )}
                    </div>

                    {/* Stages */}
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sc.selections.map(sel => {
                        const color = STAGE_COLORS[sel.stage] ?? 'var(--cobalt)';
                        const cost = sel.stageCost ?? sel.items?.reduce((s, i) => s + i.unitCost, 0);
                        return (
                          <div key={sel.stage}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{sel.stage}</span>
                              {cost != null && <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>${fmt(cost)}</span>}
                            </div>
                            {sel.supplierName && (
                              <div style={{ fontSize: 11.5, color: 'var(--text-4)', paddingLeft: 15 }}>{sel.supplierName}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detail toggle */}
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <button
                        className="ql-btn ql-btn-ghost"
                        style={{ width: '100%', justifyContent: 'center', borderRadius: 0, fontSize: 12, padding: '10px 0' }}
                        onClick={() => toggleExpand(sc.id)}
                      >
                        {isExpanded ? 'Close ↑' : 'Detail ↓'}
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {!sc.selections[0]?.items ? (
                            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>
                              Re-save in Cost Builder to capture item detail.
                            </div>
                          ) : (
                            sc.selections.map((sel, i) => {
                              const items = sel.items ?? [];
                              const color = STAGE_COLORS[sel.stage] ?? 'var(--cobalt)';
                              return (
                                <div key={sel.stage} style={{ borderBottom: i < sc.selections.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <div style={{ padding: '7px 20px', background: 'var(--surface)', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }}/>
                                    {sel.stage.toUpperCase()}
                                  </div>
                                  {items.map(item => {
                                    const dimStr = item.isDU && item.chosenDims ? Object.values(item.chosenDims).join(' / ') : item.variantNote ?? '';
                                    return (
                                      <div key={item.id} style={{ padding: '8px 20px', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.canonicalName}</span>
                                          <span style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, flexShrink: 0 }}>${fmt(item.unitCost)}</span>
                                        </div>
                                        {dimStr && <div style={{ fontSize: 11, color: 'var(--cobalt)', marginTop: 2 }}>{dimStr}</div>}
                                        {(item.moq != null || item.leadTime) && (
                                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                                            {item.moq != null && `MOQ ${item.moq.toLocaleString()}`}
                                            {item.moq != null && item.leadTime && ' · '}
                                            {item.leadTime}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lynx — only when ≥ 2 scenarios */}
            {projectScenarios.length >= 2 && (
              <div className="ql-card" style={{ padding: 22 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Lynx size={17}/>Lynx insight
                </div>

                {/* Insight text */}
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(() => {
                    const withCost = projectScenarios.filter(s => s.totalCostPerUnit != null);
                    if (withCost.length < 2) return null;

                    function getStageCost(sc: Scenario, stage: string): number | null {
                      const sel = sc.selections.find(s => s.stage === stage);
                      if (!sel) return null;
                      return sel.stageCost ?? sel.items?.reduce((s, i) => s + i.unitCost, 0) ?? null;
                    }

                    // Per-stage analysis — only stages present in ALL scenarios (apples-to-apples)
                    const stageAnalysis = project.stages.map(stage => {
                      const entries = withCost.map(sc => ({
                        sc,
                        cost: getStageCost(sc, stage),
                        supplier: sc.selections.find(s => s.stage === stage)?.supplierName ?? null,
                      })).filter(x => x.cost !== null) as { sc: Scenario; cost: number; supplier: string | null }[];
                      if (entries.length < withCost.length) return null;
                      const min = Math.min(...entries.map(e => e.cost));
                      const max = Math.max(...entries.map(e => e.cost));
                      return { stage, delta: max - min, entries };
                    }).filter(Boolean).sort((a, b) => b!.delta - a!.delta) as { stage: string; delta: number; entries: { sc: Scenario; cost: number; supplier: string | null }[] }[];

                    // Comparable total = sum of stages shared by ALL scenarios only
                    const comparableStageNames = new Set(stageAnalysis.map(s => s.stage));
                    function getComparableTotal(sc: Scenario): number {
                      return project.stages.reduce((sum, stage) => {
                        if (!comparableStageNames.has(stage)) return sum;
                        return sum + (getStageCost(sc, stage) ?? 0);
                      }, 0);
                    }

                    // Stages covered by at least one scenario but not all — the excluded ones
                    const partialStages = project.stages.filter(stage =>
                      withCost.some(sc => getStageCost(sc, stage) !== null) &&
                      !comparableStageNames.has(stage)
                    );

                    // Sort cheapest → priciest by COMPARABLE total
                    const sortedByCost = [...withCost].sort((a, b) => getComparableTotal(a) - getComparableTotal(b));
                    const cheapest = sortedByCost[0];
                    const priciest = sortedByCost[sortedByCost.length - 1];
                    const totalDelta = getComparableTotal(priciest) - getComparableTotal(cheapest);

                    const driver = stageAnalysis[0];
                    const identicalStages = stageAnalysis.filter(s => s.delta < 0.005);

                    const paragraphs: React.ReactNode[] = [];

                    // § 0 — Warning when stages are excluded from comparison
                    if (partialStages.length > 0) {
                      paragraphs.push(
                        <span key="p0" style={{ fontSize: 12, color: '#b45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '7px 11px', display: 'block', lineHeight: 1.6 }}>
                          ⚠️ <strong>{partialStages.join(', ')}</strong> {partialStages.length === 1 ? 'is' : 'are'} not covered by all scenarios and {partialStages.length === 1 ? 'is' : 'are'} excluded from this comparison. Only shared stages are used — cost figures below reflect those stages only.
                        </span>
                      );
                    }

                    // § 1 — Cost summary (comparable totals only)
                    if (globalPrice) {
                      const cm = computeMargin(getComparableTotal(cheapest));
                      const pm = computeMargin(getComparableTotal(priciest));
                      const marginDelta = ((cm ?? 0) - (pm ?? 0)).toFixed(1);
                      paragraphs.push(
                        <span key="p1">
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cheapest.name}</span> costs{' '}
                          <span className="mono" style={{ color: 'var(--mint)', fontWeight: 600 }}>${fmt(totalDelta)}/unit</span> less than{' '}
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{priciest.name}</span>, translating to{' '}
                          <span className="mono" style={{ color: 'var(--mint)', fontWeight: 600 }}>+{marginDelta} pts</span> of margin
                          {cm != null && <> (<span className="mono" style={{ color: 'var(--mint)' }}>{cm.toFixed(1)}%</span> vs <span className="mono" style={{ color: 'var(--red)' }}>{(pm ?? 0).toFixed(1)}%</span>)</>} at your{' '}
                          <span className="mono" style={{ color: 'var(--cobalt)' }}>${fmt(globalPrice)}</span> selling price.
                        </span>
                      );
                    } else {
                      paragraphs.push(
                        <span key="p1">
                          Across shared stages, <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cheapest.name}</span> is{' '}
                          <span className="mono" style={{ color: 'var(--mint)', fontWeight: 600 }}>${fmt(totalDelta)}/unit</span> cheaper than{' '}
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{priciest.name}</span>.
                          {' '}Set a selling price above to see the margin impact.
                        </span>
                      );
                    }

                    // § 2 — Main driver
                    if (driver && driver.delta > 0.005) {
                      const pct = totalDelta > 0 ? Math.round((driver.delta / totalDelta) * 100) : 0;
                      const driverEntries = [...driver.entries].sort((a, b) => a.cost - b.cost);
                      const cheapE = driverEntries[0], priceE = driverEntries[driverEntries.length - 1];
                      paragraphs.push(
                        <span key="p2">
                          The gap is driven primarily by <span style={{ color: 'var(--text)', fontWeight: 600 }}>{driver.stage}</span>
                          {pct > 0 && withCost.length === 2 && <> ({pct}% of the total delta)</>}:{' '}
                          {cheapE.supplier && <><span style={{ fontWeight: 500 }}>{cheapE.supplier}</span> quotes </>}
                          <span className="mono" style={{ color: 'var(--mint)', fontWeight: 600 }}>${fmt(cheapE.cost)}</span>
                          {priceE.supplier && <> vs <span style={{ fontWeight: 500 }}>{priceE.supplier}</span> at </>}
                          {!priceE.supplier && ' vs '}
                          <span className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>${fmt(priceE.cost)}</span>
                          {' '}—{' '}a <span className="mono" style={{ color: 'var(--cobalt)' }}>${fmt(driver.delta)}</span> difference per unit.
                        </span>
                      );
                    }

                    // § 3 — Identical stages (informational)
                    if (identicalStages.length > 0 && stageAnalysis.length > 1) {
                      const names = identicalStages.map(s => s.stage).join(', ');
                      paragraphs.push(
                        <span key="p3" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                          {identicalStages.length === 1 ? `${names} costs` : `${names} cost`} the same across all scenarios — no savings available there.
                        </span>
                      );
                    }

                    // § 4 — Secondary drivers (if 3+ stages with deltas)
                    const secondaryDrivers = stageAnalysis.filter(s => s.delta > 0.005).slice(1);
                    if (secondaryDrivers.length > 0 && driver) {
                      const parts = secondaryDrivers.map(s => {
                        const e = [...s.entries].sort((a, b) => a.cost - b.cost);
                        return `${s.stage} ($${fmt(e[e.length-1].cost - e[0].cost)} delta)`;
                      });
                      paragraphs.push(
                        <span key="p4" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                          Other cost differences: {parts.join(', ')}.
                        </span>
                      );
                    }

                    return paragraphs;
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
