import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lynx } from '@/components/Lynx';
import Icon from '@/components/Icon';

const industries = [
  { id: 'Cosmetics', name: 'Cosmetics & Fragrance', desc: 'Skincare, perfume, beauty kits with packaging tiers.', glyph: 'CF' },
  { id: 'Food', name: 'Food & Beverage', desc: 'Specialty food, beverages, gift hampers and DTC kits.', glyph: 'FB' },
  { id: 'Apparel', name: 'Apparel & Accessories', desc: 'Cut-and-sew, leather goods, multi-SKU collections.', glyph: 'AA' },
  { id: 'Events', name: 'Events & Production', desc: 'Activations, brand experiences, custom production runs.', glyph: 'EP' },
];

export default function IndustryPage() {
  const [selected, setSelected] = useState('Cosmetics');
  const navigate = useNavigate();

  function handleContinue() {
    sessionStorage.setItem('ql_onb_industry', selected);
    navigate('/onboarding/project');
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
        <div className="step-pill">Step 1 of 3</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 760 }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>What's your industry?</div>
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>QuoteLens adapts to your production workflow — pre-filled stages, suppliers, and unit conventions.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
            {industries.map(ind => (
              <div key={ind.id} className={`option-card ${selected === ind.id ? 'selected' : ''}`} onClick={() => setSelected(ind.id)} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: selected === ind.id ? 'var(--cobalt-soft-2)' : 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: selected === ind.id ? 'var(--cobalt)' : 'var(--text-3)', border: '1px solid var(--border)' }}>
                    {ind.glyph}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{ind.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45 }}>{ind.desc}</div>
                  </div>
                </div>
                {selected === ind.id && (
                  <div style={{ position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderRadius: '50%', background: 'var(--cobalt)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                    <Icon name="check" size={11} strokeWidth={2.5}/>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="ql-btn ql-btn-ghost" style={{ borderColor: 'transparent', color: 'var(--text-3)' }} onClick={() => navigate('/projects')}>
              Skip — I'll set up later
            </button>
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
