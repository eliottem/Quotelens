/* global React, Icon, Flag, Sidebar, STAGE_COLORS */
const { useState: useState3 } = React;

const Lynx = window.Lynx;
const LynxEye = window.LynxEye;

/* ============== SCREEN 7 — COST BUILDER ============== */
const ScreenCostBuilder = () => {
  const [approach, setApproach] = useState3('split');
  const [volume, setVolume] = useState3('10k');

  const stageRows = [
    { stage: 'Primary Packaging', supplier: { name: 'Rifeshow', country: 'CN' }, cost: 2.41, pct: 26.4, dotColor: STAGE_COLORS['Primary Packaging'] },
    { stage: 'Secondary Packaging', supplier: { name: 'Kraftwerk', country: 'DE' }, cost: 1.18, pct: 12.9, dotColor: STAGE_COLORS['Secondary Packaging'] },
    { stage: 'Filling & Assembly', supplier: { name: 'Parmaz', country: 'PT', fast: true }, cost: 3.02, pct: 33.1, dotColor: STAGE_COLORS['Filling & Assembly'] },
    { stage: 'Freight (Air)', supplier: { name: 'Flexship', country: 'GB' }, cost: 1.84, pct: 20.2, dotColor: STAGE_COLORS['Freight'] },
    { stage: 'Customs & Duties', supplier: null, cost: 0.67, pct: 7.4, dotColor: STAGE_COLORS['Customs & Duties'], muted: true },
  ];

  return (
    <div className="ql-screen">
      <Sidebar active="builder"/>

      {/* Config panel */}
      <div style={{width: 320, background: 'var(--surface-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0}}>
        <div style={{padding: '20px 22px', borderBottom: '1px solid var(--border)'}}>
          <div style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>PROJECT</div>
          <div style={{fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em'}}>SPRKS Gift Set Q3</div>
          <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 2}}>Cosmetics · 5 stages · Draft</div>
        </div>

        <div className="ql-scroll" style={{flex: 1, overflow: 'auto', padding: 22}}>
          {/* Approach */}
          <div className="ql-label" style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Approach</span>
            <span style={{color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0}}>?</span>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 22}}>
            <button onClick={() => setApproach('split')} className="ql-btn" style={{justifyContent: 'center', padding: '10px 8px', fontSize: 12, background: approach==='split' ? 'var(--mint-dim)' : 'var(--surface)', borderColor: approach==='split' ? 'var(--mint-border)' : 'var(--border)', color: approach==='split' ? 'var(--mint)' : 'var(--text-2)'}}>Split sourcing</button>
            <button onClick={() => setApproach('full')} className="ql-btn" style={{justifyContent: 'center', padding: '10px 8px', fontSize: 12, background: approach==='full' ? 'var(--mint-dim)' : 'var(--surface)', borderColor: approach==='full' ? 'var(--mint-border)' : 'var(--border)', color: approach==='full' ? 'var(--mint)' : 'var(--text-2)'}}>Full service</button>
          </div>

          {/* Stage assignments */}
          <div className="ql-label" style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Stage assignments</span>
            <span style={{color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0}}>4 / 5</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22}}>
            {[
              { stage: 'Primary Packaging', s: 'Rifeshow', country: 'CN' },
              { stage: 'Secondary Packaging', s: 'Kraftwerk', country: 'DE' },
              { stage: 'Filling & Assembly', s: 'Parmaz', country: 'PT' },
              { stage: 'Freight', s: 'Flexship', country: 'GB' },
              { stage: 'Customs & Duties', s: null, country: null },
            ].map(row => (
              <div key={row.stage} style={{padding: '9px 11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4}}>
                  <div className="stage-dot" style={{background: STAGE_COLORS[row.stage] || '#71717A'}}/>
                  <span style={{fontSize: 11, color: 'var(--text-3)'}}>{row.stage}</span>
                </div>
                {row.s ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0'}}>
                    <Flag code={row.country} size={11}/>
                    <span style={{fontSize: 12.5, fontWeight: 500, flex: 1}}>{row.s}</span>
                    <span style={{color: 'var(--text-4)'}}><Icon name="chevron-down" size={11}/></span>
                  </div>
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic'}}>
                    No supplier assigned
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Volume */}
          <div className="ql-label">Units</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 22}}>
            {['1k', '5k', '10k', '25k'].map(v => (
              <button key={v} onClick={() => setVolume(v)} className="ql-btn mono" style={{justifyContent: 'center', padding: '8px 4px', fontSize: 12, background: volume===v ? 'var(--mint-dim)' : 'var(--surface)', borderColor: volume===v ? 'var(--mint-border)' : 'var(--border)', color: volume===v ? 'var(--mint)' : 'var(--text-2)'}}>{v}</button>
            ))}
          </div>

          {/* Retail price */}
          <div className="ql-label">Target retail price</div>
          <div style={{position: 'relative', marginBottom: 22}}>
            <span style={{position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace'}}>$</span>
            <input className="ql-input mono" defaultValue="50.00" style={{paddingLeft: 26}}/>
          </div>

          {/* Lead time mode */}
          <div className="ql-label">Freight mode</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6}}>
            <button className="ql-btn" style={{justifyContent: 'center', padding: '8px', fontSize: 12, background: 'var(--mint-dim)', borderColor: 'var(--mint-border)', color: 'var(--mint)'}}><Icon name="plane" size={11}/> Air</button>
            <button className="ql-btn ql-btn-subtle" style={{justifyContent: 'center', padding: '8px', fontSize: 12}}><Icon name="ship" size={11}/> Sea</button>
          </div>
        </div>

        <div style={{padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8}}>
          <button className="ql-btn ql-btn-subtle" style={{flex: 1, justifyContent: 'center'}}>Save draft</button>
          <button className="ql-btn ql-btn-mint" style={{flex: 1, justifyContent: 'center'}}>Save scenario</button>
        </div>
      </div>

      {/* Output panel */}
      <div className="ql-scroll" style={{flex: 1, overflow: 'auto'}}>
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em'}}>Cost Builder</div>
            <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>Live calculation · auto-saved 8s ago</div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="ql-btn ql-btn-ghost"><Icon name="link" size={13}/>Share</button>
            <button className="ql-btn ql-btn-ghost"><Icon name="download" size={13}/>Export</button>
            <button className="ql-btn ql-btn-mint"><Icon name="scenarios" size={13}/>Compare scenarios</button>
          </div>
        </div>

        <div style={{padding: 32, display: 'flex', flexDirection: 'column', gap: 20}}>
          {/* HERO */}
          <div className="ql-card grid-bg" style={{padding: 32, position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: 24, right: 32, opacity: 0.5}}>
              <LynxEye size={120}/>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative'}}>
              <div>
                <div style={{fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12}}>TOTAL COST / UNIT</div>
                <div className="hero-number" style={{fontSize: 84, lineHeight: 1}}>$9.12</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 14}}>
                  <span style={{color: 'var(--mint)', fontSize: 14, fontWeight: 500}} className="mono">+$40.88</span>
                  <span style={{fontSize: 13, color: 'var(--text-2)'}}>margin</span>
                  <span className="ql-badge ql-badge-mint mono">81.8% on $50.00</span>
                </div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end'}}>
                <div style={{fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em'}}>SUPPLIER MIX</div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                  <span className="ql-badge" style={{background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--text)', padding: '5px 10px'}}><Flag code="CN" size={10}/> Rifeshow</span>
                  <span className="ql-badge" style={{background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--text)', padding: '5px 10px'}}><Flag code="DE" size={10}/> Kraftwerk</span>
                  <span className="ql-badge" style={{background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--text)', padding: '5px 10px'}}><Flag code="PT" size={10}/> Parmaz <span style={{color: 'var(--mint)'}}><Icon name="bolt" size={9}/></span></span>
                  <span className="ql-badge" style={{background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--text)', padding: '5px 10px'}}><Flag code="GB" size={10}/> Flexship</span>
                </div>
              </div>
            </div>

            <div style={{marginTop: 26, padding: '12px 16px', background: 'var(--amber-dim)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center'}}>
              <span style={{color: 'var(--amber)'}}><Icon name="warn" size={15}/></span>
              <div style={{flex: 1, fontSize: 12.5}}>
                <span style={{color: 'var(--amber)', fontWeight: 500}}>MOQ warning · </span>
                <span style={{color: 'var(--text-2)'}}>Parmaz requires <span className="mono">15,000</span> units — you entered <span className="mono">10,000</span>. Tooling fee applies.</span>
              </div>
              <button className="ql-btn ql-btn-subtle" style={{padding: '5px 10px', fontSize: 11.5}}>Negotiate</button>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="ql-card" style={{overflow: 'hidden'}}>
            <div style={{padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <div style={{fontSize: 14, fontWeight: 500}}>Cost breakdown</div>
                <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1}}>Per unit at 10k volume · click any row for source</div>
              </div>
              <div style={{display: 'flex', gap: 4, fontSize: 11, color: 'var(--text-3)'}}>
                <span style={{padding: '4px 10px', background: 'var(--surface-hover)', borderRadius: 6}}>Per unit</span>
                <span style={{padding: '4px 10px', borderRadius: 6}}>Total</span>
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1.5fr 0.9fr 1.4fr 0.4fr', padding: '10px 22px', background: 'var(--bg-tint)', borderBottom: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace'}}>
              <div>Stage</div><div>Supplier</div><div style={{textAlign: 'right'}}>$ / unit</div><div>% of total</div><div></div>
            </div>
            {stageRows.map((r, i) => (
              <div key={r.stage} className="hover-parent" style={{display: 'grid', gridTemplateColumns: '1.4fr 1.5fr 0.9fr 1.4fr 0.4fr', padding: '14px 22px', borderBottom: i < stageRows.length-1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center', opacity: r.muted ? 0.6 : 1, cursor: 'pointer'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <div className="stage-dot" style={{background: r.dotColor}}/>
                  <span>{r.stage}</span>
                </div>
                <div>
                  {r.supplier ? (
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <Flag code={r.supplier.country} size={11}/>
                      <span>{r.supplier.name}</span>
                      {r.supplier.fast && <span style={{color: 'var(--mint)'}}><Icon name="bolt" size={11}/></span>}
                    </div>
                  ) : (
                    <span style={{color: 'var(--text-4)', fontStyle: 'italic'}}>Estimate (avg.)</span>
                  )}
                </div>
                <div className="mono" style={{textAlign: 'right'}}>${r.cost.toFixed(2)}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden'}}>
                    <div style={{height: '100%', width: `${r.pct}%`, background: r.dotColor}}/>
                  </div>
                  <span className="mono" style={{fontSize: 11.5, color: 'var(--text-3)', minWidth: 38, textAlign: 'right'}}>{r.pct.toFixed(1)}%</span>
                </div>
                <div className="hover-reveal" style={{textAlign: 'right', color: 'var(--text-3)'}}><Icon name="file" size={12}/></div>
              </div>
            ))}
            <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1.5fr 0.9fr 1.4fr 0.4fr', padding: '14px 22px', background: 'var(--surface-2)', fontSize: 13, alignItems: 'center', borderTop: '1px solid var(--border-strong)'}}>
              <div style={{fontWeight: 500}}>Total per unit</div>
              <div style={{color: 'var(--text-4)', fontSize: 12}}>= 4 suppliers + 1 estimate</div>
              <div className="mono" style={{textAlign: 'right', fontWeight: 600, color: 'var(--mint)'}}>$9.12</div>
              <div></div><div></div>
            </div>
          </div>

          {/* Lead time */}
          <div className="ql-card" style={{padding: 22}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18}}>
              <div>
                <div style={{fontSize: 14, fontWeight: 500}}>Production Lead Time</div>
                <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1}}>Critical path · 13 weeks total</div>
              </div>
              <div style={{display: 'flex', gap: 4, padding: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8}}>
                <button className="ql-btn" style={{padding: '5px 12px', fontSize: 11.5, background: 'var(--surface-hover)', borderColor: 'transparent'}}><Icon name="plane" size={11}/> Air</button>
                <button className="ql-btn" style={{padding: '5px 12px', fontSize: 11.5, background: 'transparent', borderColor: 'transparent', color: 'var(--text-3)'}}><Icon name="ship" size={11}/> Sea</button>
              </div>
            </div>

            {/* Gantt */}
            <div style={{position: 'relative'}}>
              <div style={{display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)'}}>
                <div style={{flex: 2, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--bg)'}}>Artwork · 2w</div>
                <div style={{flex: 8, background: '#3F3F46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--ink)'}}>Manufacturing · 8w</div>
                <div style={{flex: 2, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--ink)'}}>Assembly · 2w</div>
                <div style={{flex: 1, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--bg)'}}>Air · 1w</div>
              </div>
              <div className="mono" style={{display: 'flex', marginTop: 8, fontSize: 10.5, color: 'var(--text-4)'}}>
                <div style={{flex: 2}}>Apr 28</div>
                <div style={{flex: 8}}>May 12 → Jul 7</div>
                <div style={{flex: 2}}>Jul 8 → 22</div>
                <div style={{flex: 1, textAlign: 'right'}}>Jul 27</div>
              </div>
            </div>

            <div style={{marginTop: 16, padding: '10px 14px', background: 'var(--bg-tint)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between'}}>
              <span>If ordered today → <span style={{color: 'var(--text)', fontWeight: 500}} className="mono">Jul 27, 2026</span></span>
              <span>Worst case: <span className="mono" style={{color: 'var(--amber)'}}>Aug 17, 2026</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenCostBuilder = ScreenCostBuilder;

/* ============== SCREEN 8 — SCENARIOS ============== */
const ScreenScenarios = () => {
  const scenarios = [
    {
      name: 'Premium Split',
      mix: ['Vetro IT', 'Kraftwerk DE', 'Parmaz PT'],
      flags: ['IT', 'DE', 'PT'],
      volume: '10,000',
      cost: 12.84,
      margin: 74.3,
      lead: '14 weeks',
      moq: true,
      recommended: false,
      tone: 'mint',
    },
    {
      name: 'Cost-optimized',
      mix: ['Rifeshow CN', 'Kraftwerk DE', 'Parmaz PT'],
      flags: ['CN', 'DE', 'PT'],
      volume: '10,000',
      cost: 9.12,
      margin: 81.8,
      lead: '13 weeks',
      moq: false,
      recommended: true,
      tone: 'mint',
    },
    {
      name: 'Speed Run',
      mix: ['Rifeshow CN', 'Maison FR', 'Parmaz PT'],
      flags: ['CN', 'FR', 'PT'],
      volume: '5,000',
      cost: 18.42,
      margin: 63.2,
      lead: '9 weeks',
      moq: true,
      recommended: false,
      tone: 'amber',
    },
  ];

  return (
    <div className="ql-screen">
      <Sidebar active="scenarios"/>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10}}>
              Scenarios
              <span className="ql-badge ql-badge-muted mono">SPRKS Gift Set Q3</span>
            </div>
            <div style={{fontSize: 12.5, color: 'var(--text-3)', marginTop: 2}}>3 active scenarios · last edit 14 minutes ago</div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="ql-btn ql-btn-ghost"><Icon name="download" size={13}/>Export to PDF</button>
            <button className="ql-btn ql-btn-ghost"><Icon name="download" size={13}/>Export to Excel</button>
            <button className="ql-btn ql-btn-mint"><Icon name="plus" size={13}/>New scenario</button>
          </div>
        </div>

        <div className="ql-scroll" style={{flex: 1, overflow: 'auto', padding: 32}}>
          {/* Comparison row */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18}}>
            {scenarios.map((sc, i) => {
              const marginColor = sc.margin > 60 ? 'var(--mint)' : sc.margin > 40 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={sc.name} className="ql-card" style={{padding: 22, position: 'relative', overflow: 'hidden', border: sc.recommended ? '1px solid var(--mint-border)' : '1px solid var(--border)', background: sc.recommended ? 'linear-gradient(180deg, rgba(110, 231, 183, 0.05), var(--surface))' : 'var(--surface)'}}>
                  {sc.recommended && (
                    <div style={{position: 'absolute', top: 14, right: 14}}>
                      <span className="ql-badge ql-badge-mint" style={{padding: '4px 10px'}}><Icon name="star" size={9}/> Recommended</span>
                    </div>
                  )}

                  <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--text-3)'}}>
                    <span className="mono" style={{fontSize: 11, letterSpacing: '0.04em'}}>SCENARIO {String.fromCharCode(65 + i)}</span>
                  </div>
                  <div className="hover-parent" style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18}}>
                    <div style={{fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em'}}>{sc.name}</div>
                    <span className="hover-reveal" style={{color: 'var(--text-4)'}}><Icon name="pencil" size={12}/></span>
                  </div>

                  {/* Hero metric */}
                  <div style={{padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 18}}>
                    <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>COST / UNIT</div>
                    <div className="hero-number" style={{fontSize: 48, lineHeight: 1}}>${sc.cost.toFixed(2)}</div>
                    <div style={{marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8}}>
                      <span className="mono" style={{fontSize: 22, fontWeight: 500, color: marginColor}}>{sc.margin}%</span>
                      <span style={{fontSize: 12, color: 'var(--text-3)'}}>gross margin</span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18}}>
                    <div>
                      <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>VOLUME</div>
                      <div className="mono" style={{fontSize: 14}}>{sc.volume}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>LEAD TIME</div>
                      <div className="mono" style={{fontSize: 14}}>{sc.lead}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>MOQ</div>
                      <div style={{fontSize: 13, color: sc.moq ? 'var(--mint)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 4}}>
                        {sc.moq ? <><Icon name="check" size={12} strokeWidth={2.5}/> Met</> : <><Icon name="close" size={12} strokeWidth={2.5}/> Below</>}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4}}>SUPPLIERS</div>
                      <div style={{display: 'flex', gap: 4}}>
                        {sc.flags.map(f => <Flag key={f} code={f} size={11}/>)}
                      </div>
                    </div>
                  </div>

                  {/* Mix */}
                  <div style={{fontSize: 10.5, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8}}>SUPPLIER MIX</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18}}>
                    {sc.mix.map((m, j) => (
                      <div key={j} style={{fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6}}>
                        <div className="stage-dot" style={{background: ['#7C3AED', '#0EA5E9', 'var(--cobalt)'][j]}}/>
                        {m}
                      </div>
                    ))}
                  </div>

                  <button className="ql-btn ql-btn-subtle" style={{width: '100%', justifyContent: 'center'}}>Open in Cost Builder →</button>
                </div>
              );
            })}
          </div>

          {/* Delta row */}
          <div className="ql-card" style={{padding: 22, marginTop: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div>
                <div style={{fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8}}>
                  <Lynx size={18}/>
                  Lynx insight
                </div>
                <div style={{fontSize: 11.5, color: 'var(--text-4)', marginTop: 1}}>Auto-generated from scenario deltas</div>
              </div>
              <span style={{fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace'}}>UPDATED 2 MIN AGO</span>
            </div>
            <div style={{fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6}}>
              <span style={{color: 'var(--text)'}}>Cost-optimized</span> wins on margin (<span className="mono" style={{color: 'var(--mint)'}}>+18.6 pts</span> vs Speed Run, <span className="mono" style={{color: 'var(--mint)'}}>+7.5 pts</span> vs Premium) and meets Parmaz MOQ at 10k. Switching primary packaging from <span style={{color: 'var(--text)'}}>Vetro</span> to <span style={{color: 'var(--text)'}}>Rifeshow</span> saves <span className="mono" style={{color: 'var(--mint)'}}>$3.72</span>/unit but adds 1w in transit. If timing is critical, the Speed Run scenario ships <span className="mono">4 weeks earlier</span> at the cost of <span className="mono" style={{color: 'var(--red)'}}>−18.6 pts</span> margin.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenScenarios = ScreenScenarios;
