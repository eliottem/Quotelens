import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import Flag from '@/components/Flag';
import { useStore } from '@/lib/store';

export default function NetworkSuppliersPage() {
  const navigate = useNavigate();
  const { suppliers, projects, documents } = useStore();
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.country.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em' }}>Supplier Network</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {suppliers.length === 0 ? 'No suppliers yet' : `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} across all projects`}
          </div>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
            <Icon name="suppliers" size={24}/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}>No suppliers yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
              Suppliers appear here once you add them to a project. They're shared across your whole workspace.
            </div>
          </div>
          <button className="ql-btn ql-btn-mint" onClick={() => navigate('/projects')}>
            Go to Projects
          </button>
        </div>
      ) : (
        <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}>
                <Icon name="search" size={13}/>
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search suppliers…"
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, outline: 'none', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div className="ql-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['SUPPLIER', 'COUNTRY', 'CONTACT', 'PROJECTS', 'DOCS', ''].map(h => (
                    <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const supplierProjects = projects.filter(p => s.projectIds.includes(p.id));
                  const docs = documents.filter(d => d.supplierId === s.id);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--cobalt-soft-2)', color: 'var(--cobalt)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.country && <Flag code={s.country} size={12}/>}
                          <span style={{ color: 'var(--text-3)' }}>{s.country || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>{s.contact || '—'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {supplierProjects.map(p => (
                            <span
                              key={p.id}
                              className="ql-badge ql-badge-muted"
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/projects/${p.id}/suppliers`)}
                            >
                              {p.code}
                            </span>
                          ))}
                          {supplierProjects.length === 0 && <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }} className="mono">{docs.length}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <button className="ql-btn ql-btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }}>
                          View <Icon name="arrow-right" size={11}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
