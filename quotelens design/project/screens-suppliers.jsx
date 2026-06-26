/* global React, Icon, Flag, STAGE_COLORS */
const { useState: useState2 } = React;

/* ============== APP SHELL ============== */
const Sidebar = ({ active = 'suppliers' }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
    { id: 'builder', label: 'Cost Builder', icon: 'builder' },
    { id: 'scenarios', label: 'Scenarios', icon: 'scenarios' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  return (
    <div className="ql-sidebar">
      <div className="ql-logo">
        <div style={{width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0}}>
          <window.Lynx size={20}/>
        </div>
        <span className="mono">quotelens</span>
      </div>

      <div style={{padding: '0 6px 12px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>WORKSPACE</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 18}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8}}>
          <div style={{width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, #6EE7B7, #60A5FA)', flexShrink: 0}}/>
          <div style={{fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>SPRKS Studio</div>
          <Icon name="chevron-down" size={12}/>
        </div>
      </div>

      <div style={{padding: '0 6px 8px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace'}}>NAVIGATE</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: 1}}>
        {items.map(it => (
          <div key={it.id} className={`ql-nav-item ${active === it.id ? 'active' : ''}`}>
            <span className="dot"><Icon name={it.icon} size={14}/></span>
            <span style={{flex: 1}}>{it.label}</span>
            {it.id === 'suppliers' && <span className="mono" style={{fontSize: 10.5, color: 'var(--text-4)'}}>12</span>}
          </div>
        ))}
      </div>

      <div style={{padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, fontSize: 11.5}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', marginBottom: 6}}>
          <Icon name="sparkle" size={11}/>
          <span style={{fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.05em'}}>PARSING CREDITS</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
          <span className="mono" style={{color: 'var(--text)'}}>87</span>
          <span className="mono" style={{color: 'var(--text-4)'}}>/ 200</span>
        </div>
        <div style={{height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden'}}>
          <div style={{height: '100%', width: '43%', background: 'var(--mint)'}}/>
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderTop: '1px solid var(--border)', paddingTop: 12}}>
        <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--cobalt-soft)', color: 'var(--mint)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>AR</div>
        <div style={{flex: 1, overflow: 'hidden'}}>
          <div style={{fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>Ari R.</div>
          <div style={{fontSize: 11, color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>Founder</div>
        </div>
        <span style={{color: 'var(--text-4)'}}><Icon name="settings" size={14}/></span>
      </div>
    </div>
  );
};

/* ============== SUPPLIERS DATA ============== */
const SUPPLIERS = [
  { id: 'rifeshow', name: 'Rifeshow Packaging', city: 'Yiwu', country: 'CN', contact: 'Lin Wei', docs: 3, status: 'parsed', updated: '2 hours ago', stage: 'Primary Packaging' },
  { id: 'vetro', name: 'Vetro Cristallino', city: 'Murano', country: 'IT', contact: 'Giulia Conti', docs: 2, status: 'parsed', updated: 'Yesterday', stage: 'Primary Packaging' },
  { id: 'parmaz', name: 'Parmaz Industries', city: 'Lisbon', country: 'PT', contact: 'João Ferreira', docs: 4, status: 'parsed', updated: '4 days ago', stage: 'Filling & Assembly' },
  { id: 'kraftwerk', name: 'Kraftwerk Print Co.', city: 'Stuttgart', country: 'DE', contact: 'Anna Voss', docs: 2, status: 'processing', updated: '12 minutes ago', stage: 'Secondary Packaging' },
  { id: 'maison', name: 'Maison Atelier', city: 'Lyon', country: 'FR', contact: 'Camille Dubois', docs: 1, status: 'review', updated: '6 hours ago', stage: 'Secondary Packaging' },
  { id: 'flexship', name: 'Flexship Logistics', city: 'Rotterdam', country: 'GB', contact: 'Owen Hartley', docs: 3, status: 'parsed', updated: '3 days ago', stage: 'Freight' },
];

const StatusBadge = ({ status }) => {
  if (status === 'parsed') return <span className="ql-badge ql-badge-mint"><Icon name="check" size={9} strokeWidth={3}/>Parsed</span>;
  if (status === 'processing') return <span className="ql-badge ql-badge-amber"><span className="dot-pulse" style={{width:6,height:6,borderRadius:'50%',background:'var(--amber)'}}/>Processing…</span>;
  if (status === 'review') return <span className="ql-badge ql-badge-red">Needs review</span>;
  return null;
};

const SupplierCard = ({ s, onClick, selected }) => (
  <div className="ql-card hover-parent" onClick={onClick} style={{padding: 18, cursor: 'pointer', position: 'relative', borderColor: selected ? 'var(--border-strong)' : 'var(--border)', transition: 'all 0.15s', overflow: 'hidden'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <Flag code={s.country} size={14}/>
        <div>
          <div style={{fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em'}}>{s.name}</div>
          <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1}}>{s.city} · {s.country}</div>
        </div>
      </div>
      <StatusBadge status={s.status}/>
    </div>

    <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 12, color: 'var(--text-3)'}}>
      <div className="stage-dot" style={{background: STAGE_COLORS[s.stage] || '#71717A'}}/>
      <span>{s.stage}</span>
    </div>

    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)'}}>
      <div style={{fontSize: 11.5, color: 'var(--text-4)'}}>
        <span className="mono" style={{color: 'var(--text-2)'}}>{s.docs}</span> docs · {s.updated}
      </div>
      <div style={{fontSize: 11.5, color: 'var(--text-4)'}}>{s.contact}</div>
    </div>

    <div className="hover-reveal" style={{position: 'absolute', top: 14, right: 14}}>
      <button className="ql-btn ql-btn-subtle" style={{padding: '4px 10px', fontSize: 11}}>View</button>
    </div>
  </div>
);

/* ============== SCREEN 5 — SUPPLIERS ============== */
const ScreenSuppliers = () => (
  <div className="ql-screen">
    <Sidebar active="suppliers"/>
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
      <div style={{padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em'}}>Suppliers</div>
          <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>12 suppliers · 18 documents · last sync 2 min ago</div>
        </div>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <div style={{position: 'relative'}}>
            <span style={{position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)'}}><Icon name="search" size={13}/></span>
            <input className="ql-input" placeholder="Search suppliers, docs, stages…" style={{paddingLeft: 32, width: 280, padding: '9px 14px 9px 32px'}}/>
          </div>
          <button className="ql-btn ql-btn-ghost"><Icon name="filter" size={13}/>Filter</button>
          <button className="ql-btn ql-btn-mint"><Icon name="plus" size={13}/>Add supplier</button>
        </div>
      </div>

      <div style={{padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center'}}>
        {['All', 'Primary Packaging', 'Secondary Packaging', 'Filling & Assembly', 'Freight', 'Customs'].map((t, i) => (
          <span key={t} className="ql-badge" style={{background: i===0 ? 'var(--surface)' : 'transparent', borderColor: i===0 ? 'var(--border-strong)' : 'transparent', color: i===0 ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', padding: '5px 11px'}}>{t}</span>
        ))}
        <div style={{flex: 1}}/>
        <span style={{fontSize: 11.5, color: 'var(--text-4)'}}>Sort: <span style={{color: 'var(--text-2)'}}>Recently updated ↓</span></span>
      </div>

      <div className="ql-scroll" style={{flex: 1, padding: 28, overflow: 'auto'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14}}>
          {SUPPLIERS.map(s => <SupplierCard key={s.id} s={s}/>)}
          <div className="dropzone" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 156}}>
            <Icon name="plus" size={18}/>
            <div style={{marginTop: 8, fontWeight: 500, color: 'var(--text-2)'}}>Add new supplier</div>
            <div style={{fontSize: 11.5, marginTop: 2, color: 'var(--text-4)'}}>Or drop a quote PDF anywhere</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ============== SCREEN 6 — SUPPLIER DETAIL ============== */
const ScreenSupplierDetail = () => {
  const [tab, setTab] = useState2('documents');
  const supplier = SUPPLIERS[0];

  return (
    <div className="ql-screen">
      <Sidebar active="suppliers"/>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'}}>
        <div style={{padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em'}}>Suppliers</div>
            <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>12 suppliers · 18 documents · last sync 2 min ago</div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="ql-btn ql-btn-ghost"><Icon name="filter" size={13}/>Filter</button>
            <button className="ql-btn ql-btn-mint"><Icon name="plus" size={13}/>Add supplier</button>
          </div>
        </div>

        {/* Dimmed grid behind */}
        <div className="ql-scroll" style={{flex: 1, padding: 28, overflow: 'auto', filter: 'brightness(0.55)'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14}}>
            {SUPPLIERS.slice(0, 4).map(s => <SupplierCard key={s.id} s={s} selected={s.id === supplier.id}/>)}
          </div>
        </div>

        {/* Side panel */}
        <div style={{position: 'absolute', top: 0, right: 0, bottom: 0, width: 440, background: 'var(--surface-2)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 60px rgba(0,0,0,0.6)'}}>
          <div style={{padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12}}>
            <Flag code={supplier.country} size={16}/>
            <div style={{flex: 1}}>
              <div style={{fontSize: 15, fontWeight: 500}}>{supplier.name}</div>
              <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1}}>{supplier.contact} · {supplier.city}, China</div>
            </div>
            <button style={{background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', padding: 6, cursor: 'pointer'}}><Icon name="pencil" size={13}/></button>
            <button style={{background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', padding: 6, cursor: 'pointer'}}><Icon name="close" size={13}/></button>
          </div>

          <div style={{padding: '0 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4}}>
            <div className={`ql-tab ${tab==='documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents <span className="mono" style={{fontSize: 10, opacity: 0.5}}>3</span></div>
            <div className={`ql-tab ${tab==='extracted' ? 'active' : ''}`} onClick={() => setTab('extracted')}>Extracted Data</div>
            <div className={`ql-tab ${tab==='notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>Notes</div>
          </div>

          <div className="ql-scroll" style={{flex: 1, overflow: 'auto', padding: 22}}>
            {tab === 'documents' && (
              <Fragment>
                {[
                  { name: 'Quote_SPRKS_Q3_v2.pdf', type: 'PDF', date: 'Apr 24, 2026', status: 'parsed' },
                  { name: 'Glass_specs_30ml.xlsx', type: 'XLSX', date: 'Apr 22, 2026', status: 'parsed' },
                  { name: 'Re: Updated MOQ for caps.eml', type: 'EML', date: 'Apr 18, 2026', status: 'parsed' },
                ].map(f => (
                  <div key={f.name} className="hover-parent" style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8}}>
                    <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: f.type==='PDF' ? '#B22A2A' : f.type==='XLSX' ? 'var(--cobalt)' : '#0EA5E9'}}>
                      <Icon name={f.type==='EML' ? 'mail' : 'file'} size={14}/>
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{f.name}</div>
                      <div style={{fontSize: 11, color: 'var(--text-4)', marginTop: 1}}>{f.type} · {f.date}</div>
                    </div>
                    <StatusBadge status={f.status}/>
                    <span className="hover-reveal" style={{color: 'var(--text-4)', cursor: 'pointer'}}><Icon name="trash" size={13}/></span>
                  </div>
                ))}

                <div className="dropzone" style={{marginTop: 14}}>
                  <div style={{color: 'var(--text-2)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', marginBottom: 4}}>
                    <Icon name="upload" size={14}/>
                    <span style={{fontWeight: 500}}>Drop more documents</span>
                  </div>
                  <div style={{fontSize: 11.5}}>PDF · XLSX · EML — parsed in ~12s</div>
                </div>
              </Fragment>
            )}

            {tab === 'extracted' && (
              <div style={{border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden'}}>
                <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 0.7fr 0.7fr 0.5fr', padding: '10px 12px', background: 'var(--bg-tint)', borderBottom: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace'}}>
                  <div>Stage</div><div>Item</div><div>Unit cost</div><div>Unit</div><div>MOQ</div><div>Conf.</div>
                </div>
                {[
                  { stage: 'Primary Pkg', item: '30ml frosted glass bottle', cost: '$1.42', unit: 'ea', moq: '5,000', conf: 'g' },
                  { stage: 'Primary Pkg', item: 'Aluminum twist cap (matte)', cost: '$0.38', unit: 'ea', moq: '5,000', conf: 'g' },
                  { stage: 'Primary Pkg', item: 'Pump dispenser (FEA 15)', cost: '$0.61', unit: 'ea', moq: '10,000', conf: 'y' },
                  { stage: 'Secondary', item: 'Custom outer carton', cost: '$0.88', unit: 'ea', moq: '2,000', conf: 'g' },
                  { stage: 'Secondary', item: 'Velvet pouch w/ logo', cost: '$1.24', unit: 'ea', moq: '3,000', conf: 'r' },
                ].map((r, i) => (
                  <div key={i} style={{display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 0.7fr 0.7fr 0.5fr', padding: '11px 12px', borderBottom: i<4 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center'}}>
                    <div style={{color: 'var(--text-3)'}}>{r.stage}</div>
                    <div style={{color: 'var(--text)'}}>{r.item}</div>
                    <div className="mono" style={{color: 'var(--text)'}}>{r.cost}</div>
                    <div className="mono" style={{color: 'var(--text-3)'}}>{r.unit}</div>
                    <div className="mono" style={{color: 'var(--text-3)'}}>{r.moq}</div>
                    <div><span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.conf==='g' ? 'var(--mint)' : r.conf==='y' ? 'var(--amber)' : 'var(--red)'}}/></div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'notes' && (
              <div>
                <textarea className="ql-input" rows="6" style={{resize: 'none'}} defaultValue={"Met at Cosmoprof Bologna 2026. Lin is responsive within 24h.\n\nMOQ negotiable above 8k units. Tooling fee ($1,200) waived if PO > $20k.\n\nBacklog Apr–May. Confirm capacity before quoting Q3."}/>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenSuppliers = ScreenSuppliers;
window.ScreenSupplierDetail = ScreenSupplierDetail;
window.Sidebar = Sidebar;
window.SUPPLIERS = SUPPLIERS;
window.StatusBadge = StatusBadge;
