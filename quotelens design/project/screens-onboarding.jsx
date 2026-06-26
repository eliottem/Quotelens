/* global React, Icon, Flag */
const { useState } = React;

/* ============== SCREEN 1 — LOGIN ============== */
const ScreenLogin = () => {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="ql-screen" style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <div style={{position: 'absolute', inset: 0}} className="dotted-bg" />
      <div style={{position: 'relative', width: 400}}>
        <div style={{textAlign: 'center', marginBottom: 36}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 4}}>
            <div style={{width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center'}}>
              <Lynx size={26}/>
            </div>
            <span className="mono" style={{fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em'}}>quotelens</span>
          </div>
          <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 14, letterSpacing: '0.04em'}}>SUPPLIER COST INTELLIGENCE</div>
        </div>

        <div className="ql-card" style={{padding: 32}}>
          <div style={{marginBottom: 18}}>
            <div style={{fontSize: 18, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.01em'}}>Sign in to your account</div>
            <div style={{fontSize: 13, color: 'var(--text-3)'}}>Welcome back. Continue to your workspace.</div>
          </div>

          <div style={{marginBottom: 14}}>
            <label className="ql-label">Work email</label>
            <input className="ql-input" type="email" defaultValue="ari@sprks-co.com" />
          </div>

          <div style={{marginBottom: 22}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
              <label className="ql-label" style={{margin: 0}}>Password</label>
              <a style={{fontSize: 11, color: 'var(--text-3)', textDecoration: 'none'}}>Forgot?</a>
            </div>
            <div style={{position: 'relative'}}>
              <input className="ql-input" type={showPw ? 'text' : 'password'} defaultValue="••••••••••••" style={{paddingRight: 40}} />
              <button onClick={() => setShowPw(s => !s)} style={{position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4}}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={15} />
              </button>
            </div>
          </div>

          <button className="ql-btn ql-btn-mint" style={{width: '100%', justifyContent: 'center', padding: '12px'}}>
            Sign in
            <Icon name="arrow-right" size={14} />
          </button>

          <div style={{display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0', color: 'var(--text-4)', fontSize: 11}}>
            <div style={{flex: 1, height: 1, background: 'var(--border)'}} />
            <span>OR</span>
            <div style={{flex: 1, height: 1, background: 'var(--border)'}} />
          </div>

          <button className="ql-btn ql-btn-ghost" style={{width: '100%', justifyContent: 'center'}}>
            Continue with SSO
          </button>
        </div>

        <div style={{textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--text-3)'}}>
          New to QuoteLens? <a style={{color: 'var(--mint)', textDecoration: 'none', cursor: 'pointer'}}>Create account →</a>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN 2 — INDUSTRY ============== */
const ScreenIndustry = () => {
  const [selected, setSelected] = useState('cosmetics');
  const industries = [
    { id: 'cosmetics', name: 'Cosmetics & Fragrance', desc: 'Skincare, perfume, beauty kits with packaging tiers.', glyph: 'CF' },
    { id: 'food', name: 'Food & Beverage', desc: 'Specialty food, beverages, gift hampers and DTC kits.', glyph: 'FB' },
    { id: 'apparel', name: 'Apparel & Accessories', desc: 'Cut-and-sew, leather goods, multi-SKU collections.', glyph: 'AA' },
    { id: 'events', name: 'Events & Production', desc: 'Activations, brand experiences, custom production runs.', glyph: 'EP' },
  ];
  return (
    <div className="ql-screen" style={{flexDirection: 'column'}}>
      <div style={{padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)'}}>
        <div className="ql-logo" style={{padding: 0}}>
          <div style={{width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0}}><Lynx size={20}/></div>
          <span className="mono">quotelens</span>
        </div>
        <div className="step-pill">Step 1 of 3</div>
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflow: 'auto'}}>
        <div style={{width: '100%', maxWidth: 760}}>
          <div style={{marginBottom: 36}}>
            <div style={{fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8}}>What's your industry?</div>
            <div style={{color: 'var(--text-3)', fontSize: 14}}>QuoteLens adapts to your production workflow — pre-filled stages, suppliers, and unit conventions.</div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32}}>
            {industries.map(ind => (
              <div key={ind.id} className={`option-card ${selected === ind.id ? 'selected' : ''}`} onClick={() => setSelected(ind.id)} style={{position: 'relative'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: 14}}>
                  <div style={{width: 44, height: 44, borderRadius: 10, background: selected === ind.id ? 'rgba(110, 231, 183, 0.18)' : 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: selected === ind.id ? 'var(--mint)' : 'var(--text-3)', border: '1px solid var(--border)'}}>
                    {ind.glyph}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 15, fontWeight: 500, marginBottom: 4}}>{ind.name}</div>
                    <div style={{fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45}}>{ind.desc}</div>
                  </div>
                </div>
                {selected === ind.id && (
                  <div style={{position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center', color: 'var(--ink)'}}>
                    <Icon name="check" size={11} strokeWidth={2.5}/>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <button className="ql-btn ql-btn-ghost" style={{borderColor: 'transparent', color: 'var(--text-3)'}}>
              Skip — I'll set up later
            </button>
            <button className="ql-btn ql-btn-mint">
              Continue
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN 3 — PROJECT STAGES ============== */
const STAGE_COLORS = {
  'Primary Packaging': '#7C3AED',
  'Secondary Packaging': '#0EA5E9',
  'Filling & Assembly': 'var(--cobalt)',
  'Freight': '#B57614',
  'Customs & Duties': '#B22A2A',
  'Artwork': '#0EA5E9',
};

const ScreenProject = () => {
  const [stages, setStages] = useState([
    { name: 'Primary Packaging', on: true },
    { name: 'Secondary Packaging', on: true },
    { name: 'Filling & Assembly', on: true },
    { name: 'Freight', on: true },
    { name: 'Customs & Duties', on: true },
  ]);
  const toggle = (i) => setStages(s => s.map((st, j) => j === i ? {...st, on: !st.on} : st));

  return (
    <div className="ql-screen" style={{flexDirection: 'column'}}>
      <div style={{padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)'}}>
        <div className="ql-logo" style={{padding: 0}}>
          <div style={{width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0}}><Lynx size={20}/></div>
          <span className="mono">quotelens</span>
        </div>
        <div className="step-pill">Step 2 of 3</div>
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflow: 'auto'}}>
        <div style={{width: '100%', maxWidth: 920}}>
          <div style={{marginBottom: 32}}>
            <div style={{fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8}}>Configure your first project</div>
            <div style={{color: 'var(--text-3)', fontSize: 14}}>Projects bundle suppliers, stages, and scenarios. We pre-filled defaults for cosmetics — adjust freely.</div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 28}}>
            {/* LEFT */}
            <div>
              <label className="ql-label">Project name</label>
              <input className="ql-input" defaultValue="SPRKS Gift Set Q3" />

              <label className="ql-label" style={{marginTop: 18}}>Target volume</label>
              <input className="ql-input mono" defaultValue="10,000 units" />

              <label className="ql-label" style={{marginTop: 18}}>Reference currency</label>
              <div style={{position: 'relative'}}>
                <select className="ql-input" defaultValue="USD" style={{appearance: 'none', cursor: 'pointer'}}>
                  <option>USD — US Dollar</option>
                  <option>EUR — Euro</option>
                  <option>GBP — British Pound</option>
                </select>
                <Icon name="chevron-down" size={14} className="" />
                <div style={{position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none'}}><Icon name="chevron-down" size={14} /></div>
              </div>

              <div style={{marginTop: 24, padding: 16, background: 'rgba(110, 231, 183, 0.05)', border: '1px solid rgba(110, 231, 183, 0.15)', borderRadius: 12, display: 'flex', gap: 10}}>
                <div style={{color: 'var(--mint)', flexShrink: 0, marginTop: 1}}><Icon name="sparkle" size={15}/></div>
                <div style={{fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5}}>
                  <div style={{color: 'var(--text)', fontWeight: 500, marginBottom: 2}}>Smart defaults applied</div>
                  Stages are pre-filled for <span style={{color: 'var(--mint)'}}>Cosmetics & Fragrance</span>. Drag to reorder, toggle to disable.
                </div>
              </div>
            </div>

            {/* RIGHT — stages */}
            <div>
              <label className="ql-label" style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Production stages</span>
                <span style={{color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0}}>{stages.filter(s=>s.on).length} active</span>
              </label>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {stages.map((st, i) => (
                  <div key={st.name} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, opacity: st.on ? 1 : 0.5}}>
                    <span style={{color: 'var(--text-4)', cursor: 'grab', display: 'flex'}}><Icon name="drag" size={14}/></span>
                    <div className="stage-dot" style={{background: STAGE_COLORS[st.name]}} />
                    <span style={{fontSize: 13.5, flex: 1}}>{st.name}</span>
                    <span className="mono" style={{fontSize: 11, color: 'var(--text-4)'}}>0{i+1}</span>
                    <div className={`ql-toggle ${st.on ? 'on' : ''}`} onClick={() => toggle(i)} />
                  </div>
                ))}
                <button className="ql-btn ql-btn-subtle" style={{justifyContent: 'center', borderStyle: 'dashed', marginTop: 4}}>
                  <Icon name="plus" size={13}/> Add custom stage
                </button>
              </div>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36}}>
            <button className="ql-btn ql-btn-ghost" style={{borderColor: 'transparent', color: 'var(--text-3)'}}>← Back</button>
            <button className="ql-btn ql-btn-mint">
              Continue
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============== SCREEN 4 — FIRST SUPPLIER ============== */
const ScreenSupplierSetup = () => {
  return (
    <div className="ql-screen" style={{flexDirection: 'column'}}>
      <div style={{padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)'}}>
        <div className="ql-logo" style={{padding: 0}}>
          <div style={{width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0}}><Lynx size={20}/></div>
          <span className="mono">quotelens</span>
        </div>
        <div className="step-pill">Step 3 of 3</div>
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 32px 60px', overflow: 'auto'}}>
        <div style={{width: '100%', maxWidth: 720}}>
          <div style={{marginBottom: 32}}>
            <div style={{fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8}}>Add your first supplier</div>
            <div style={{color: 'var(--text-3)', fontSize: 14}}>You'll be able to drop in their quote document — we'll extract costs, MOQs, and lead times automatically.</div>
          </div>

          <div className="ql-card" style={{padding: 24}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
              <div>
                <label className="ql-label">Company name</label>
                <input className="ql-input" defaultValue="Rifeshow Packaging Co." />
              </div>
              <div>
                <label className="ql-label">Contact name</label>
                <input className="ql-input" defaultValue="Lin Wei" />
              </div>
              <div>
                <label className="ql-label">Email</label>
                <input className="ql-input" defaultValue="lin@rifeshow.cn" />
              </div>
              <div>
                <label className="ql-label">Country</label>
                <div style={{position: 'relative'}}>
                  <div className="ql-input" style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'}}>
                    <Flag code="CN" size={13}/>
                    <span style={{flex: 1}}>China</span>
                    <span style={{color: 'var(--text-4)'}}><Icon name="chevron-down" size={14}/></span>
                  </div>
                </div>
              </div>
              <div>
                <label className="ql-label">Currency</label>
                <div className="ql-input" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                  <span style={{flex: 1}} className="mono">USD</span>
                  <span style={{color: 'var(--text-4)'}}><Icon name="chevron-down" size={14}/></span>
                </div>
              </div>
              <div>
                <label className="ql-label">Stage focus</label>
                <div className="ql-input" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <div className="stage-dot" style={{background: STAGE_COLORS['Primary Packaging']}}/>
                  <span style={{flex: 1, fontSize: 13.5}}>Primary Packaging</span>
                  <span style={{color: 'var(--text-4)'}}><Icon name="chevron-down" size={14}/></span>
                </div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label className="ql-label">Notes <span style={{color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0}}>— optional</span></label>
                <textarea className="ql-input" rows="2" style={{resize: 'none'}} placeholder="Met at Cosmoprof Bologna 2026, recommended by Mara." />
              </div>
            </div>

            <div style={{height: 1, background: 'var(--border)', margin: '22px -24px'}} />

            <div className="dropzone">
              <div style={{color: 'var(--text-2)', marginBottom: 6, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center'}}>
                <Icon name="upload" size={15}/>
                <span style={{fontWeight: 500}}>Drop your first document here</span>
              </div>
              <div style={{fontSize: 12, color: 'var(--text-4)'}}>PDF, Excel, or paste an email — QuoteLens parses it in ~12 seconds.</div>
              <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12}}>
                <span className="ql-badge ql-badge-muted"><Icon name="file" size={10}/> PDF</span>
                <span className="ql-badge ql-badge-muted"><Icon name="doc" size={10}/> XLSX</span>
                <span className="ql-badge ql-badge-muted"><Icon name="mail" size={10}/> EML</span>
              </div>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28}}>
            <button className="ql-btn ql-btn-ghost" style={{borderColor: 'transparent', color: 'var(--text-3)'}}>← Back</button>
            <div style={{display: 'flex', gap: 10}}>
              <button className="ql-btn ql-btn-ghost">Skip — add later</button>
              <button className="ql-btn ql-btn-mint">
                Create supplier & finish setup
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenLogin = ScreenLogin;
window.ScreenIndustry = ScreenIndustry;
window.ScreenProject = ScreenProject;
window.ScreenSupplierSetup = ScreenSupplierSetup;
window.STAGE_COLORS = STAGE_COLORS;
