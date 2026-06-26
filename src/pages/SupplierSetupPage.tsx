import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lynx } from '@/components/Lynx';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import type { Supplier } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SupplierSetupPage() {
  const navigate = useNavigate();
  const { addSupplier } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const projectId = sessionStorage.getItem('ql_onb_projectId') ?? '';

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setFiles(f => [...f, ...Array.from(e.dataTransfer.files)]);
  }

  function handleFinish() {
    sessionStorage.removeItem('ql_onb_industry');
    sessionStorage.removeItem('ql_onb_projectId');

    if (name.trim() && projectId) {
      const supplierId = randomId();
      const now = new Date().toISOString();

      const supplier: Supplier = {
        id: supplierId,
        projectIds: [projectId],
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        country: country.trim(),
        city: '',
        notes: '',
        createdAt: now,
      };
      addSupplier(supplier);

      // Navigate directly to supplier detail page; pass files via router state so the
      // context modal opens there (same flow as uploading from an existing supplier page)
      navigate(
        `/projects/${projectId}/suppliers/${supplierId}`,
        files.length ? { state: { pendingFiles: files } } : undefined,
      );
    } else {
      navigate(projectId ? `/projects/${projectId}` : '/projects');
    }
  }

  function handleSkip() {
    sessionStorage.removeItem('ql_onb_industry');
    sessionStorage.removeItem('ql_onb_projectId');
    navigate(projectId ? `/projects/${projectId}` : '/projects');
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
        <div className="step-pill">Step 3 of 3</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 32px 60px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>Add your first supplier</div>
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Drop in their quote document — we'll extract costs, MOQs, and lead times automatically.</div>
          </div>

          <div className="ql-card" style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="ql-label">Company name</label>
                <input className="ql-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Packaging Co."/>
              </div>
              <div>
                <label className="ql-label">Contact name</label>
                <input className="ql-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="Full name"/>
              </div>
              <div>
                <label className="ql-label">Email</label>
                <input className="ql-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="supplier@example.com"/>
              </div>
              <div>
                <label className="ql-label">Country</label>
                <input className="ql-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. CN, DE, FR…"/>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '22px -24px' }}/>

            <div
              className="dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.txt" style={{ display: 'none' }} onChange={e => setFiles(f => [...f, ...Array.from(e.target.files ?? [])])}/>
              <div style={{ color: 'var(--text-2)', marginBottom: 6, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                <Icon name="upload" size={15}/>
                <span style={{ fontWeight: 500 }}>Drop your first document here</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>PDF, Excel, or paste an email — QuoteLens parses it in ~12 seconds.</div>
              {files.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  {files.map((f, i) => (
                    <span key={i} className="ql-badge ql-badge-muted"><Icon name="file" size={10}/> {f.name}</span>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  <span className="ql-badge ql-badge-muted"><Icon name="file" size={10}/> PDF</span>
                  <span className="ql-badge ql-badge-muted"><Icon name="doc" size={10}/> XLSX</span>
                  <span className="ql-badge ql-badge-muted"><Icon name="mail" size={10}/> EML</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
            <button className="ql-btn ql-btn-ghost" style={{ borderColor: 'transparent', color: 'var(--text-3)' }} onClick={() => navigate('/onboarding/project')}>← Back</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ql-btn ql-btn-ghost" onClick={handleSkip}>Skip — add later</button>
              <button className="ql-btn ql-btn-mint" onClick={handleFinish} disabled={!name.trim()}>
                Finish setup
                <Icon name="arrow-right" size={14}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
