import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, suppliers, documents, items, scenarios, updateProject } = useStore();
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState('');

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div style={{ padding: 32, color: 'var(--text-3)' }}>Project not found.</div>;

  const projectSuppliers = suppliers.filter(s => s.projectIds.includes(project.id));
  const projectDocs = documents.filter(d => d.projectId === project.id);
  const projectItems = items.filter(it => it.projectId === project.id);
  const projectScenarios = scenarios.filter(sc => sc.projectId === project.id);

  const stats = [
    { label: 'SUPPLIERS', value: projectSuppliers.length, icon: 'suppliers', href: `/projects/${projectId}/suppliers` },
    { label: 'QUOTES', value: projectDocs.length, icon: 'file', href: `/projects/${projectId}/suppliers` },
    { label: 'LINE ITEMS', value: projectItems.length, icon: 'doc', href: `/projects/${projectId}/builder` },
    { label: 'SCENARIOS', value: projectScenarios.length, icon: 'scenarios', href: `/projects/${projectId}/scenarios` },
  ];

  const isEmpty = projectSuppliers.length === 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>
            {project.name}
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: project.color }}/>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {project.industry} · {project.stages.length} stages
          </div>
        </div>
        <button className="ql-btn ql-btn-mint" onClick={() => navigate(`/projects/${projectId}/suppliers`)}>
          <Icon name="plus" size={13}/> Add supplier
        </button>
      </div>

      <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {stats.map(s => (
            <div
              key={s.label}
              className="ql-card"
              style={{ padding: 20, cursor: 'pointer' }}
              onClick={() => navigate(s.href)}
            >
              <div style={{ fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{s.label}</div>
              <div className="hero-number" style={{ fontSize: 36, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* AI instructions card */}
        <div className="ql-card" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingInstructions ? 12 : (project.instructions ? 10 : 0) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)' }}>AI INSTRUCTIONS</span>
              {project.instructions && !editingInstructions && (
                <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 4, background: 'var(--cobalt-soft-2)', color: 'var(--cobalt)', fontFamily: 'JetBrains Mono, monospace' }}>ACTIVE</span>
              )}
            </div>
            {editingInstructions ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ql-btn ql-btn-ghost" style={{ fontSize: 11.5, padding: '3px 10px' }} onClick={() => setEditingInstructions(false)}>Cancel</button>
                <button className="ql-btn ql-btn-mint" style={{ fontSize: 11.5, padding: '3px 10px' }} onClick={() => {
                  updateProject(project.id, { instructions: instructionsDraft.trim() || undefined });
                  setEditingInstructions(false);
                }}>Save</button>
              </div>
            ) : (
              <button
                className="ql-btn ql-btn-ghost"
                style={{ fontSize: 11.5, padding: '3px 10px' }}
                onClick={() => { setInstructionsDraft(project.instructions ?? ''); setEditingInstructions(true); }}
              >
                {project.instructions ? 'Edit' : '+ Add instructions'}
              </button>
            )}
          </div>
          {editingInstructions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-4)', lineHeight: 1.55 }}>
                Standing rules every AI agent sees on every call — units, naming conventions, product structure, things to always double-check.
              </div>
              <textarea
                autoFocus
                value={instructionsDraft}
                onChange={e => setInstructionsDraft(e.target.value)}
                rows={4}
                placeholder={`e.g. "We make Sets of 6 perfumes. Always clarify if a quote is per unit (single perfume) or per set. When in doubt about units, ask the user."`}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '9px 12px', fontSize: 12.5, lineHeight: 1.65, outline: 'none', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }}
                onKeyDown={e => {
                  if (e.key === 'Escape') setEditingInstructions(false);
                }}
              />
            </div>
          ) : project.instructions ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{project.instructions}</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>
              No instructions yet. Add standing rules to help AI agents handle your project's specific structure — units, product groupings, naming conventions.
            </div>
          )}
        </div>

        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)', marginBottom: 4 }}>Get started</div>
            {[
              {
                step: '1',
                title: 'Add a supplier',
                desc: 'Upload a quote PDF, Excel sheet, or paste raw text. Lynx extracts line items automatically.',
                action: 'Add supplier',
                href: `/projects/${projectId}/suppliers`,
                color: '#7C3AED',
              },
              {
                step: '2',
                title: 'Review classifications',
                desc: 'Lynx maps each line item to a canonical name and stage. Verify or edit before building costs.',
                action: 'Review items',
                href: `/projects/${projectId}/builder`,
                color: '#2541E8',
              },
              {
                step: '3',
                title: 'Build cost scenarios',
                desc: 'Mix and match suppliers per stage. Save scenarios and compare margin impact side by side.',
                action: 'Open builder',
                href: `/projects/${projectId}/builder`,
                color: '#0EA5E9',
              },
            ].map(step => (
              <div key={step.step} className="ql-card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: step.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                  {step.step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
                <button className="ql-btn ql-btn-ghost" onClick={() => navigate(step.href)}>
                  {step.action} <Icon name="arrow-right" size={12}/>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="ql-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Suppliers
                <button className="ql-btn ql-btn-ghost" style={{ fontSize: 11.5 }} onClick={() => navigate(`/projects/${projectId}/suppliers`)}>
                  View all <Icon name="arrow-right" size={11}/>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projectSuppliers.slice(0, 5).map(s => {
                  const docs = projectDocs.filter(d => d.supplierId === s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--cobalt-soft-2)', color: 'var(--cobalt)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{s.country} · {docs.length} doc{docs.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ql-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Scenarios
                <button className="ql-btn ql-btn-ghost" style={{ fontSize: 11.5 }} onClick={() => navigate(`/projects/${projectId}/scenarios`)}>
                  View all <Icon name="arrow-right" size={11}/>
                </button>
              </div>
              {projectScenarios.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 10, color: 'var(--text-4)', fontSize: 12.5 }}>
                  No scenarios yet
                  <button className="ql-btn ql-btn-ghost" onClick={() => navigate(`/projects/${projectId}/builder`)}>
                    <Icon name="plus" size={12}/> Create in builder
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {projectScenarios.slice(0, 5).map(sc => (
                    <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{sc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                          {sc.totalCostPerUnit != null ? `$${sc.totalCostPerUnit.toFixed(2)} / unit` : 'No cost yet'}
                          {sc.margin != null ? ` · ${sc.margin.toFixed(1)}% margin` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
