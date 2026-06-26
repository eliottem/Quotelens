import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lynx } from '@/components/Lynx';
import Icon from '@/components/Icon';

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="ql-screen" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0 }} className="dotted-bg" />
      <div style={{ position: 'relative', width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center' }}>
              <Lynx size={26}/>
            </div>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>quotelens</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, letterSpacing: '0.04em' }}>SUPPLIER COST INTELLIGENCE</div>
        </div>

        <div className="ql-card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.01em' }}>Sign in to your account</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Welcome back. Continue to your workspace.</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="ql-label">Work email</label>
            <input className="ql-input" type="email" defaultValue="ari@sprks-co.com" />
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="ql-label" style={{ margin: 0 }}>Password</label>
              <a style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', cursor: 'pointer' }}>Forgot?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <input className="ql-input" type={showPw ? 'text' : 'password'} defaultValue="••••••••••••" style={{ paddingRight: 40 }} />
              <button onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={15} />
              </button>
            </div>
          </div>

          <button className="ql-btn ql-btn-mint" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => navigate('/projects')}>
            Sign in
            <Icon name="arrow-right" size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0', color: 'var(--text-4)', fontSize: 11 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button className="ql-btn ql-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            Continue with SSO
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--text-3)' }}>
          New to QuoteLens?{' '}
          <a onClick={() => navigate('/onboarding')} style={{ color: 'var(--cobalt)', textDecoration: 'none', cursor: 'pointer' }}>Create account →</a>
        </div>
      </div>
    </div>
  );
}
