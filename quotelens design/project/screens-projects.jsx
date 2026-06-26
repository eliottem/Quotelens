/* global React, Icon, Flag, Lynx, Sidebar, PROJECTS_DB, SUPPLIERS_DB, projectById, supplierById, STAGE_COLORS, StatusBadge */
const { useState: useStateP } = React;

/* ============== UPGRADED SIDEBAR with PROJECT SWITCHER ============== */
const SidebarMP = ({ active = 'suppliers', currentProject = 'sprks', onProject }) => {
  const [open, setOpen] = useStateP(false);
  const items = [
    { id: 'projects', label: 'Projects', icon: 'dashboard' },
    { id: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
    { id: 'builder', label: 'Cost Builder', icon: 'builder' },
    { id: 'scenarios', label: 'Scenarios', icon: 'scenarios' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  const proj = projectById(currentProject);

  return (
    <div className="ql-sidebar" style={{position: 'relative'}}>
      <div className="ql-logo">
        <div style={{width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0}}>
          <Lynx size={20}/>
        </div>
        <span className="mono">quotelens</span>
      </div>

      {/* Project switcher */}
      <div style={{padding: '0 6px 8px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>CURRENT PROJECT</div>
      <div style={{position: 'relative', marginBottom: 18}}>
        <div onClick={() => setOpen(o => !o)} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer'}}>
          <div style={{width: 22, height: 22, borderRadius: 6, background: proj.color, color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, flexShrink: 0}}>{proj.code}</div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{proj.name}</div>
            <div style={{fontSize: 10.5, color: 'var(--text-4)', marginTop: 1}}>{proj.industry} · {proj.stages} stages</div>
          </div>
          <span style={{color: 'var(--text-4)'}}><Icon name="chevron-down" size={12}/></span>
        </div>

        {open && (
          <div style={{position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: 6, zIndex: 20, boxShadow: '0 12px 32px rgba(0,0,0,0.5)'}}>
            <div style={{fontSize: 10, color: 'var(--text-4)', padding: '6px 8px', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>SWITCH TO</div>
            {PROJECTS_DB.filter(p => p.id !== currentProject).map(p => (
              <div key={p.id} onClick={() => { onProject && onProject(p.id); setOpen(false); }} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 6, cursor: 'pointer'}} className="hover-parent">
                <div style={{width: 20, height: 20, borderRadius: 5, background: p.color, color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace'}}>{p.code}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.name}</div>
                  <div style={{fontSize: 10, color: 'var(--text-4)'}}>{p.industry} · {p.suppliers.length} suppliers</div>
                </div>
                {p.status === 'archived' && <span className="ql-badge ql-badge-muted" style={{padding: '2px 6px', fontSize: 9}}>archived</span>}
              </div>
            ))}
            <div style={{height: 1, background: 'var(--border)', margin: '4px 0'}}/>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', color: 'var(--mint)', fontSize: 12.5}}>
              <Icon name="plus" size={13}/> New project
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', fontSize: 12.5}}>
              <Icon name="dashboard" size={13}/> All projects
            </div>
          </div>
        )}
      </div>

      <div style={{padding: '0 6px 8px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>NAVIGATE</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: 1}}>
        {items.map(it => (
          <div key={it.id} className={`ql-nav-item ${active === it.id ? 'active' : ''}`}>
            <span className="dot"><Icon name={it.icon} size={14}/></span>
            <span style={{flex: 1}}>{it.label}</span>
            {it.id === 'suppliers' && <span className="mono" style={{fontSize: 10.5, color: 'var(--text-4)'}}>{SUPPLIERS_DB.length}</span>}
            {it.id === 'projects' && <span className="mono" style={{fontSize: 10.5, color: 'var(--text-4)'}}>{PROJECTS_DB.length}</span>}
          </div>
        ))}
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderTop: '1px solid var(--border)', paddingTop: 12}}>
        <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--cobalt-soft)', color: 'var(--mint)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>AR</div>
        <div style={{flex: 1, overflow: 'hidden'}}>
          <div style={{fontSize: 12.5, fontWeight: 500}}>Ari R.</div>
          <div style={{fontSize: 11, color: 'var(--text-4)'}}>SPRKS Studio</div>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN — PROJECTS OVERVIEW ============== */
const ScreenProjects = () => {
  const StatusPill = ({ s }) => {
    const map = {
      active: { c: 'mint', l: 'Active' },
      draft: { c: 'amber', l: 'Draft' },
      archived: { c: 'muted', l: 'Archived' },
    };
    const { c, l } = map[s];
    return <span className={`ql-badge ql-badge-${c}`}>{l}</span>;
  };

  return (
    <div className="ql-screen">
      <SidebarMP active="projects" currentProject="sprks"/>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em'}}>Projects</div>
            <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>{PROJECTS_DB.length} projects · {SUPPLIERS_DB.length} suppliers shared across</div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="ql-btn ql-btn-ghost"><Icon name="filter" size={13}/>Filter</button>
            <button className="ql-btn ql-btn-mint"><Icon name="plus" size={13}/>New project</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18}}>
          {[
            { l: 'ACTIVE PROJECTS', v: '2', sub: '+1 this quarter' },
            { l: 'TOTAL SUPPLIERS', v: SUPPLIERS_DB.length.toString(), sub: 'across all projects' },
            { l: 'AVG MARGIN', v: '64.7%', sub: 'weighted by units' },
            { l: 'PARSING CREDITS', v: '87 / 200', sub: 'resets May 1' },
          ].map(k => (
            <div key={k.l}>
              <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6}}>{k.l}</div>
              <div className="hero-number" style={{fontSize: 28, lineHeight: 1}}>{k.v}</div>
              <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 4}}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="ql-scroll" style={{flex: 1, overflow: 'auto', padding: 28}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
            {PROJECTS_DB.map(p => {
              const sups = p.suppliers.map(supplierById).filter(Boolean);
              return (
                <div key={p.id} className="ql-card hover-parent" style={{padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden'}}>
                  {/* color bar */}
                  <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: p.color}}/>

                  <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      <div style={{width: 36, height: 36, borderRadius: 8, background: p.color, color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700}}>{p.code}</div>
                      <div>
                        <div style={{fontSize: 15, fontWeight: 500, letterSpacing: '-0.005em'}}>{p.name}</div>
                        <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 2}}>{p.industry} · {p.stages} stages · {p.scenarios} scenarios</div>
                      </div>
                    </div>
                    <StatusPill s={p.status}/>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18}}>
                    <div>
                      <div style={{fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>UNITS</div>
                      <div className="mono" style={{fontSize: 14}}>{p.units}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>COST / UNIT</div>
                      <div className="mono" style={{fontSize: 14}}>{p.cost}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>MARGIN</div>
                      <div className="mono" style={{fontSize: 14, color: p.margin > 60 ? 'var(--mint)' : p.margin > 40 ? 'var(--amber)' : 'var(--red)'}}>{p.margin}%</div>
                    </div>
                  </div>

                  <div style={{paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <div style={{display: 'flex'}}>
                        {sups.slice(0, 4).map((s, i) => (
                          <div key={s.id} style={{width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: 9, color: 'var(--text-2)', marginLeft: i ? -6 : 0, fontFamily: 'JetBrains Mono, monospace'}}>
                            {s.name.split(' ')[0].slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {sups.length > 4 && (
                          <div style={{width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: 9, color: 'var(--text-3)', marginLeft: -6, fontFamily: 'JetBrains Mono, monospace'}}>+{sups.length - 4}</div>
                        )}
                      </div>
                      <span style={{fontSize: 11.5, color: 'var(--text-3)'}}>{sups.length} suppliers</span>
                    </div>
                    <span style={{fontSize: 11.5, color: 'var(--text-4)'}}>{p.updated}</span>
                  </div>
                </div>
              );
            })}

            {/* New project card */}
            <div className="dropzone" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 220}}>
              <Lynx size={32}/>
              <div style={{marginTop: 10, fontWeight: 500, color: 'var(--text-2)'}}>Start a new project</div>
              <div style={{fontSize: 11.5, marginTop: 4, color: 'var(--text-4)', textAlign: 'center', maxWidth: 240}}>Reuse suppliers from your network or add new ones. Quotes carry over automatically.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN — GLOBAL SUPPLIERS LIBRARY ============== */
const ScreenSuppliersGlobal = () => {
  const [filter, setFilter] = useStateP('all');

  const filtered = filter === 'all' ? SUPPLIERS_DB : SUPPLIERS_DB.filter(s => s.usedIn.includes(filter));

  return (
    <div className="ql-screen">
      <SidebarMP active="suppliers" currentProject="sprks"/>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10}}>
              Supplier network
              <span className="ql-badge ql-badge-muted">global library</span>
            </div>
            <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>{SUPPLIERS_DB.length} suppliers · used across {PROJECTS_DB.length} projects · quotes auto-shared</div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="ql-btn ql-btn-ghost"><Icon name="download" size={13}/>Export</button>
            <button className="ql-btn ql-btn-mint"><Icon name="plus" size={13}/>Add supplier</button>
          </div>
        </div>

        {/* Project filter */}
        <div style={{padding: '14px 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', overflow: 'auto'}}>
          <span style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginRight: 6, flexShrink: 0}}>FILTER BY PROJECT</span>
          <span onClick={() => setFilter('all')} className="ql-badge" style={{cursor: 'pointer', padding: '5px 11px', background: filter==='all' ? 'var(--surface)' : 'transparent', borderColor: filter==='all' ? 'var(--border-strong)' : 'transparent', color: filter==='all' ? 'var(--text)' : 'var(--text-3)'}}>
            All <span className="mono" style={{opacity: 0.6, marginLeft: 4}}>{SUPPLIERS_DB.length}</span>
          </span>
          {PROJECTS_DB.map(p => {
            const count = SUPPLIERS_DB.filter(s => s.usedIn.includes(p.id)).length;
            const active = filter === p.id;
            return (
              <span key={p.id} onClick={() => setFilter(p.id)} className="ql-badge" style={{cursor: 'pointer', padding: '5px 11px', background: active ? 'var(--surface)' : 'transparent', borderColor: active ? 'var(--border-strong)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0}}>
                <span style={{width: 6, height: 6, borderRadius: '50%', background: p.color}}/>
                {p.name} <span className="mono" style={{opacity: 0.6, marginLeft: 4}}>{count}</span>
              </span>
            );
          })}
        </div>

        <div className="ql-scroll" style={{flex: 1, padding: 28, overflow: 'auto'}}>
          {/* Table-style for global library */}
          <div className="ql-card" style={{overflow: 'hidden'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.6fr 0.8fr 0.8fr 0.6fr', padding: '12px 22px', background: 'var(--bg-tint)', borderBottom: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace'}}>
              <div>Supplier</div>
              <div>Stage</div>
              <div>Status</div>
              <div>Used in projects</div>
              <div>Docs</div>
              <div>Avg lead</div>
              <div>Rating</div>
            </div>
            {filtered.map((s, i) => {
              const projs = s.usedIn.map(projectById).filter(Boolean);
              return (
                <div key={s.id} className="hover-parent" style={{display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.6fr 0.8fr 0.8fr 0.6fr', padding: '14px 22px', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center', cursor: 'pointer'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <Flag code={s.country} size={13}/>
                    <div>
                      <div style={{fontSize: 13, fontWeight: 500}}>{s.name}</div>
                      <div style={{fontSize: 11, color: 'var(--text-4)'}}>{s.contact} · {s.city}</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)'}}>
                    <div className="stage-dot" style={{background: STAGE_COLORS[s.stage] || '#71717A'}}/>
                    {s.stage}
                  </div>
                  <div><StatusBadge status={s.status}/></div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                    {projs.map(p => (
                      <span key={p.id} className="ql-badge" style={{padding: '3px 8px', background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 5}}>
                        <span style={{width: 6, height: 6, borderRadius: '50%', background: p.color}}/>
                        {p.code}
                      </span>
                    ))}
                  </div>
                  <div className="mono" style={{fontSize: 12, color: 'var(--text-2)'}}>{s.docs}</div>
                  <div className="mono" style={{fontSize: 12, color: 'var(--text-2)'}}>{s.avgLead}</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 12}}>
                    <span style={{color: 'var(--mint)'}}><Icon name="star" size={11}/></span>
                    <span className="mono">{s.rating}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN — PROJECT SETUP / SELECT SUPPLIERS ============== */
const ScreenProjectSetup = () => {
  const [selected, setSelected] = useStateP({
    rifeshow: { picked: true, reuseQuote: true },
    vetro: { picked: false, reuseQuote: false },
    parmaz: { picked: true, reuseQuote: true },
    kraftwerk: { picked: false, reuseQuote: false },
    flexship: { picked: true, reuseQuote: true },
    maison: { picked: false, reuseQuote: false },
    tavola: { picked: false, reuseQuote: false },
  });

  const toggle = (id, key) => setSelected(s => ({ ...s, [id]: { ...s[id], [key]: !s[id][key] } }));

  const pickedCount = Object.values(selected).filter(s => s.picked).length;

  return (
    <div className="ql-screen">
      <SidebarMP active="projects" currentProject="sprks"/>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)'}}>
          <div style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6}}>NEW PROJECT · STEP 2 OF 3</div>
          <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10}}>
            Select suppliers for <span style={{color: 'var(--mint)'}}>Typologie Refill Line</span>
          </div>
          <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 4}}>Pick from your supplier network. Existing quotes can be reused if relevant.</div>
        </div>

        <div className="ql-scroll" style={{flex: 1, overflow: 'auto', padding: 32}}>
          {/* Picked suppliers strip */}
          <div className="ql-card" style={{padding: 18, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{flex: '0 0 auto'}}>
              <div style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>PICKED FOR THIS PROJECT</div>
              <div className="hero-number" style={{fontSize: 28, lineHeight: 1}}>{pickedCount} <span style={{fontSize: 14, color: 'var(--text-4)'}} className="mono">/ {SUPPLIERS_DB.length}</span></div>
            </div>
            <div style={{flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 18, borderLeft: '1px solid var(--border)'}}>
              {SUPPLIERS_DB.filter(s => selected[s.id]?.picked).map(s => (
                <span key={s.id} className="ql-badge ql-badge-mint" style={{padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <Flag code={s.country} size={10}/>
                  {s.name}
                  {selected[s.id].reuseQuote && <span style={{opacity: 0.7}}>· quote reused</span>}
                </span>
              ))}
              {pickedCount === 0 && <span style={{fontSize: 12, color: 'var(--text-4)'}}>No suppliers picked yet — select from the list below.</span>}
            </div>
          </div>

          {/* Supplier picker list */}
          <div style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12}}>YOUR NETWORK · {SUPPLIERS_DB.length} SUPPLIERS</div>

          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {SUPPLIERS_DB.map(s => {
              const sel = selected[s.id] || { picked: false, reuseQuote: false };
              const projs = s.usedIn.map(projectById).filter(Boolean);
              return (
                <div key={s.id} style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: sel.picked ? 'var(--mint-dim)' : 'var(--surface)', border: '1px solid', borderColor: sel.picked ? 'var(--mint-border)' : 'var(--border)', borderRadius: 12, transition: 'all 0.15s'}}>
                  {/* checkbox */}
                  <div onClick={() => toggle(s.id, 'picked')} style={{width: 20, height: 20, borderRadius: 6, background: sel.picked ? 'var(--mint)' : 'transparent', border: '1.5px solid', borderColor: sel.picked ? 'var(--mint)' : 'var(--border-strong)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--ink)'}}>
                    {sel.picked && <Icon name="check" size={12} strokeWidth={3}/>}
                  </div>

                  <Flag code={s.country} size={14}/>

                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 13.5, fontWeight: 500}}>{s.name}</div>
                    <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8}}>
                      <span>{s.stage}</span>
                      <span>·</span>
                      <span>{s.contact}</span>
                      <span>·</span>
                      <span className="mono">{s.docs} docs</span>
                    </div>
                  </div>

                  {/* used in */}
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4}}>
                    <div style={{fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>USED IN</div>
                    <div style={{display: 'flex', gap: 4}}>
                      {projs.length === 0 && <span style={{fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic'}}>not yet used</span>}
                      {projs.map(p => (
                        <span key={p.id} style={{padding: '2px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 10.5, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                          <span style={{width: 5, height: 5, borderRadius: '50%', background: p.color}}/>
                          {p.code}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* reuse quote */}
                  <div style={{paddingLeft: 16, borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, opacity: sel.picked ? 1 : 0.4, pointerEvents: sel.picked ? 'auto' : 'none'}}>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: 11.5, color: 'var(--text-2)'}}>Reuse latest quote</div>
                      <div style={{fontSize: 10.5, color: 'var(--text-4)'}}>{s.docs > 0 ? `${s.updated}` : 'no quote yet'}</div>
                    </div>
                    <div className={`ql-toggle ${sel.reuseQuote ? 'on' : ''}`} onClick={() => toggle(s.id, 'reuseQuote')}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add new */}
          <div className="dropzone" style={{marginTop: 14}}>
            <div style={{color: 'var(--text-2)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', marginBottom: 4}}>
              <Icon name="plus" size={14}/>
              <span style={{fontWeight: 500}}>Add a new supplier to your network</span>
            </div>
            <div style={{fontSize: 11.5}}>They'll be available across all your projects automatically.</div>
          </div>
        </div>

        <div style={{padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <button className="ql-btn ql-btn-ghost" style={{borderColor: 'transparent', color: 'var(--text-3)'}}>← Back to project info</button>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span style={{fontSize: 12, color: 'var(--text-3)'}}>
              <span className="mono" style={{color: 'var(--mint)'}}>{pickedCount}</span> picked · <span className="mono">{Object.values(selected).filter(s => s.picked && s.reuseQuote).length}</span> quotes reused
            </span>
            <button className="ql-btn ql-btn-mint">Continue to Cost Builder <Icon name="arrow-right" size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.SidebarMP = SidebarMP;
window.ScreenProjects = ScreenProjects;
window.ScreenSuppliersGlobal = ScreenSuppliersGlobal;
window.ScreenProjectSetup = ScreenProjectSetup;
