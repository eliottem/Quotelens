import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lynx } from '@/components/Lynx';
import Icon from '@/components/Icon';
import { STAGE_COLORS } from '@/lib/data';
import { useStore } from '@/lib/store';
import type { Project } from '@/lib/types';

const INDUSTRY_STAGE_EXAMPLES: Record<string, string[]> = {
  Cosmetics: ['Primary Packaging', 'Secondary Packaging', 'Filling & Assembly', 'Freight', 'Customs & Duties', 'Artwork'],
  Food: ['Ingredients', 'Primary Packaging', 'Contract Manufacturing', 'Cold Chain Freight', 'Import Duties', 'Labelling'],
  Apparel: ['Fabric & Trims', 'Cut & Sew', 'Washing & Finishing', 'Freight', 'Import Duties', 'Quality Control'],
  Events: ['Fabrication', 'AV & Tech', 'Logistics & Transport', 'Venue & Permits', 'Talent & Crew', 'Print & Signage'],
};

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 3) || 'P';
}

const PROJECT_COLORS = ['#6EE7B7', '#A78BFA', '#FBBF24', '#60A5FA', '#F472B6', '#34D399', '#F87171'];

export default function ProjectPage() {
  const { addProject } = useStore();
  const navigate = useNavigate();
  const industry = sessionStorage.getItem('ql_onb_industry') ?? 'Cosmetics';

  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [retailPrice, setRetailPrice] = useState('');
  const [stages, setStages] = useState<string[]>([]);
  const [stageInput, setStageInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color] = useState(() => PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);

  const exampleStages = INDUSTRY_STAGE_EXAMPLES[industry] ?? INDUSTRY_STAGE_EXAMPLES['Cosmetics'];

  function addStage(name: string) {
    const trimmed = name.trim();
    if (!trimmed || stages.includes(trimmed)) return;
    setStages(s => [...s, trimmed]);
    setStageInput('');
  }

  function removeStage(name: string) {
    setStages(s => s.filter(st => st !== name));
  }

  function handleContinue() {
    const projectName = name.trim() || 'New Project';
    const code = initials(projectName);
    const now = new Date().toISOString();
    const id = randomId();

    const project: Project = {
      id,
      name: projectName,
      code,
      color,
      industry,
      stages,
      instructions: instructions.trim() || undefined,
      targetVolume: volume ? parseInt(volume.replace(/\D/g, '')) : null,
      currency,
      targetRetailPrice: retailPrice ? parseFloat(retailPrice) : null,
      createdAt: now,
      updatedAt: now,
    };

    addProject(project);
    sessionStorage.setItem('ql_onb_projectId', id);
    navigate('/onboarding/supplier');
  }

  return (
    <div className="ql-screen" style={{ flexDirection: 'column' }}>
      <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <div className="ql-logo" style={{ padding: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Lynx size={20}/>
          </div>
          <span className="mono">quotelens</span>
        </div>
        <div className="step-pill">Step 2 of 3</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 920 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>Configure your project</div>
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Projects bundle suppliers, stages, and scenarios for a single product or collection.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 28 }}>
            <div>
              <label className="ql-label">Project name</label>
              <input className="ql-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gift Set Q3, Refill Line…"/>

              <label className="ql-label" style={{ marginTop: 18 }}>Target volume <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
              <input className="ql-input mono" value={volume} onChange={e => setVolume(e.target.value)} placeholder="10,000 units"/>

              <label className="ql-label" style={{ marginTop: 18 }}>Target retail price <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
              <input className="ql-input mono" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} placeholder="e.g. 49.99"/>

              <label className="ql-label" style={{ marginTop: 18 }}>Reference currency</label>
              <div style={{ position: 'relative' }}>
                <select className="ql-input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CNY">CNY — Chinese Yuan</option>
                </select>
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}><Icon name="chevron-down" size={14}/></div>
              </div>

              <label className="ql-label" style={{ marginTop: 18 }}>
                AI instructions <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
              </label>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 8, lineHeight: 1.5 }}>
                Standing rules every AI agent will always keep in mind — units, naming conventions, things to watch out for.
              </div>
              <textarea
                className="ql-input"
                rows={3}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder={`e.g. "We make Sets of 6 perfumes. Always clarify if a quote is per unit (single perfume) or per set. When in doubt about units, ask the user."`}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            </div>

            <div>
              <label className="ql-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Production stages</span>
                {stages.length > 0 && (
                  <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{stages.length} stage{stages.length !== 1 ? 's' : ''}</span>
                )}
              </label>

              {/* Explanation */}
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 14, padding: '10px 13px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                Stages are the distinct cost buckets in your supply chain — each quote you receive will map to one of them.
                Define them to match how your suppliers invoice you. You can always rename or add stages later.
              </div>

              {/* Industry-specific example chips */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', marginBottom: 8 }}>
                  SUGGESTIONS FOR {industry.toUpperCase()} — click to add
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {exampleStages.map(ex => {
                    const already = stages.includes(ex);
                    return (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => !already && addStage(ex)}
                        style={{
                          background: already ? 'var(--cobalt-soft-2)' : 'var(--surface)',
                          border: `1px solid ${already ? 'var(--cobalt)' : 'var(--border)'}`,
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 12,
                          color: already ? 'var(--cobalt)' : 'var(--text-3)',
                          cursor: already ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {already ? <Icon name="check" size={10} strokeWidth={2.5}/> : <Icon name="plus" size={10}/>}
                        {ex}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Added stages */}
              {stages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {stages.map((st, i) => (
                    <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div className="stage-dot" style={{ background: STAGE_COLORS[st] ?? 'var(--cobalt)', flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, flex: 1 }}>{st}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => removeStage(st)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2, display: 'flex', lineHeight: 1 }}
                        title="Remove"
                      >
                        <Icon name="close" size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom stage input */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="ql-input"
                  style={{ flex: 1, margin: 0 }}
                  value={stageInput}
                  onChange={e => setStageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStage(stageInput); } }}
                  placeholder="Add a stage… press Enter"
                />
                <button
                  type="button"
                  className="ql-btn ql-btn-ghost"
                  onClick={() => addStage(stageInput)}
                  disabled={!stageInput.trim()}
                >
                  <Icon name="plus" size={13}/>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36 }}>
            <button className="ql-btn ql-btn-ghost" style={{ borderColor: 'transparent', color: 'var(--text-3)' }} onClick={() => navigate('/onboarding')}>← Back</button>
            <button className="ql-btn ql-btn-mint" onClick={handleContinue}>
              Continue
              <Icon name="arrow-right" size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
