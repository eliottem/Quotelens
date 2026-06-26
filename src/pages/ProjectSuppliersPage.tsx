import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import Flag from '@/components/Flag';
import { useStore } from '@/lib/store';
import { parseDocument, classifyItems, analyzeDocument } from '@/lib/api';
import { STAGE_COLORS } from '@/lib/data';
import type { RawLineItem, ClassifiedItem } from '@/lib/api';
import type { Supplier, Document, SupplierItem, DecisionUnit } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function AddSupplierModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { projects, items, addSupplier, addDocument, updateDocument, bulkAddItems, bulkAddDecisionUnits } = useStore();
  const project = projects.find(p => p.id === projectId);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setFiles(f => [...f, ...Array.from(e.dataTransfer.files)]);
  }

  async function handleSubmit() {
    if (!name.trim() || !project || submitting) return;
    setSubmitting(true);

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

    if (files.length === 0) {
      onClose();
      return;
    }

    // Create document records immediately so the supplier card shows them
    const docRecords = files.map(f => {
      const doc: Document = {
        id: randomId(),
        supplierId,
        projectId,
        name: f.name,
        type: f.name.endsWith('.pdf') ? 'pdf' : f.name.match(/\.xlsx?$/) ? 'excel' : 'text',
        uploadedAt: now,
        status: 'uploading',
      };
      addDocument(doc);
      return { file: f, doc };
    });

    // Snapshot accepted canonicals so the classifier can reuse them for new files
    const existingCanonicals = [
      ...new Set(
        items
          .filter(it => it.projectId === projectId &&
            (it.classificationStatus === 'accepted' || it.classificationStatus === 'edited'))
          .map(it => it.canonicalName)
      ),
    ];

    onClose();

    // Process files sequentially — avoids rate-limit issues on the Anthropic API
    for (const { file, doc } of docRecords) {
      try {
        console.log(`[QuoteLens] Starting pipeline for "${file.name}"`);
        updateDocument(doc.id, { status: 'processing' });

        // ── Step 1: Parse ──────────────────────────────────────────────────────
        let rawItems: RawLineItem[];
        let rawText = '';
        try {
          const parseResult = await parseDocument(file, {
            supplierId,
            projectId,
            docId: doc.id,
            supplierName: name.trim(),
            currency: project.currency || undefined,
          });
          rawItems = parseResult.items;
          rawText = parseResult.rawText;
          console.log(`[QuoteLens] Parse OK — ${rawItems.length} raw items from "${file.name}"`);
        } catch (parseErr) {
          console.error(`[QuoteLens] Parse FAILED for "${file.name}":`, parseErr);
          throw parseErr;
        }

        if (rawItems.length === 0) {
          console.warn(`[QuoteLens] "${file.name}" — 0 items extracted, skipping classification`);
          updateDocument(doc.id, { status: 'parsed' });
          continue;
        }

        if (project.stages.length === 0) {
          console.error(`[QuoteLens] Project has no stages defined — cannot classify "${file.name}"`);
          updateDocument(doc.id, { status: 'error', errorMessage: 'Project has no stages defined. Add stages to the project before uploading documents.' });
          continue;
        }

        // ── Step 2: Classify ───────────────────────────────────────────────────
        let classified: ClassifiedItem[];
        try {
          const classifyResult = await classifyItems(
            rawItems,
            project.stages,
            existingCanonicals,
            project.currency || undefined,
          );
          classified = classifyResult.classified;
          console.log(`[QuoteLens] Classify OK — ${classified.length} items from "${file.name}"`);
        } catch (classifyErr) {
          console.error(`[QuoteLens] Classify FAILED for "${file.name}":`, classifyErr);
          throw classifyErr;
        }

        // ── Step 3: Build candidate items (IDs assigned, not yet saved) ──────────
        const allNewItems: SupplierItem[] = classified.map(c => {
          if (!existingCanonicals.includes(c.canonicalName)) {
            existingCanonicals.push(c.canonicalName);
          }
          return {
            id: randomId(),
            supplierId,
            projectId,
            documentId: doc.id,
            rawName: c.rawName,
            canonicalName: c.canonicalName,
            variantNote: c.variantNote,
            stages: c.stages,
            unitCost: c.unitCost ?? 0,
            currency: c.currency,
            unit: c.unit,
            moq: c.moq,
            leadTime: c.leadTime,
            attributes: c.attributes,
            confidence: c.confidence,
            stageConfidence: c.stageConfidence,
            suggestedStage: c.suggestedStage,
            classificationStatus: 'pending',
          };
        });

        // ── Step 4: Analyze variants (sequential, before saving) ─────────────────
        let finalItems = allNewItems;
        const duUnits: DecisionUnit[] = [];

        if (rawText && allNewItems.length > 1) {
          try {
            const analyzeInput = allNewItems.map(it => ({
              ...classified.find(c => c.rawName === it.rawName)!,
              id: it.id,
              supplierId,
            }));
            const result = await analyzeDocument(rawText, analyzeInput);
            if (result.decisionUnits.length > 0) {
              result.decisionUnits.forEach(du => {
                duUnits.push({ ...du, id: randomId(), projectId, documentId: doc.id });
              });
              const duSourceIds = new Set(duUnits.flatMap(du => du.sourceItemIds));
              finalItems = allNewItems.filter(it => !duSourceIds.has(it.id));
              console.log(`[QuoteLens] Analyze OK — ${duUnits.length} DU(s), ${finalItems.length} flat item(s) saved (${allNewItems.length - finalItems.length} absorbed into DUs)`);
            } else {
              console.log(`[QuoteLens] Analyze OK — no variants, all ${allNewItems.length} items saved flat`);
            }
          } catch (err) {
            console.warn(`[QuoteLens] Analyze skipped for "${file.name}":`, err instanceof Error ? err.message : err);
          }
        }

        // ── Step 5: Save to store ─────────────────────────────────────────────────
        bulkAddItems(finalItems);
        if (duUnits.length > 0) bulkAddDecisionUnits(duUnits);
        const docStatus = finalItems.length > 0 || duUnits.length > 0 ? 'review' : 'parsed';
        updateDocument(doc.id, { status: docStatus });
        console.log(`[QuoteLens] "${file.name}" done — ${finalItems.length} flat items, ${duUnits.length} DUs, status → ${docStatus}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[QuoteLens] Pipeline FAILED for "${file.name}":`, msg);
        updateDocument(doc.id, { status: 'error', errorMessage: msg });
      }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(19,22,35,0.45)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={onClose}>
      <div className="ql-card" style={{ width: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Add supplier</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Company name', value: name, set: setName, placeholder: 'e.g. Acme Packaging Co.' },
            { label: 'Country', value: country, set: setCountry, placeholder: 'e.g. CN, DE, FR…' },
            { label: 'Contact', value: contact, set: setContact, placeholder: 'Full name' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'supplier@example.com' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6 }}>{f.label}</div>
              <input
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', color: 'var(--text)' }}
              />
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>Quote documents (optional)</div>
        <div
          className="dropzone"
          style={{ marginBottom: 16, position: 'relative' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.txt" style={{ display: 'none' }} onChange={e => setFiles(f => [...f, ...Array.from(e.target.files ?? [])])}/>
          <Icon name="upload" size={20}/>
          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-3)' }}>Drop PDF, Excel, or paste text</div>
          {files.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {files.map((f, i) => (
                <span key={i} className="ql-badge ql-badge-muted">{f.name}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ql-btn ql-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="ql-btn ql-btn-mint" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Adding…' : 'Add supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectSuppliersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, suppliers, documents, items, decisionUnits } = useStore();
  const [showAdd, setShowAdd] = useState(false);

  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  const projectSuppliers = suppliers.filter(s => s.projectIds.includes(project.id));

  // Derive overall project readiness for the header
  const totalPending = items.filter(
    it => it.projectId === project.id && it.classificationStatus === 'pending'
  ).length + decisionUnits.filter(
    du => du.projectId === project.id && du.reviewStatus !== 'confirmed'
  ).length;

  const readySuppliers = projectSuppliers.filter(s => {
    const sItems = items.filter(it => it.supplierId === s.id && it.projectId === project.id);
    const sDUs = decisionUnits.filter(du => du.supplierId === s.id && du.projectId === project.id);
    const confirmed = sItems.filter(it => it.classificationStatus === 'accepted' || it.classificationStatus === 'edited').length + sDUs.filter(du => du.reviewStatus === 'confirmed').length;
    const pending = sItems.filter(it => it.classificationStatus === 'pending').length + sDUs.filter(du => du.reviewStatus !== 'confirmed').length;
    return confirmed > 0 && pending === 0;
  }).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>
            Suppliers
            <span className="ql-badge ql-badge-muted mono">{project.name}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
            {projectSuppliers.length === 0 ? 'No suppliers yet' : `${projectSuppliers.length} supplier${projectSuppliers.length !== 1 ? 's' : ''}`}
            {projectSuppliers.length > 0 && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ color: readySuppliers === projectSuppliers.length ? 'var(--mint)' : 'var(--text-4)' }}>
                  {readySuppliers}/{projectSuppliers.length} ready
                </span>
                {totalPending > 0 && (
                  <><span style={{ color: 'var(--border)' }}>·</span>
                  <span style={{ color: 'var(--amber)' }}>{totalPending} item{totalPending !== 1 ? 's' : ''} need review</span></>
                )}
              </>
            )}
          </div>
        </div>
        <button className="ql-btn ql-btn-mint" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={13}/> Add supplier
        </button>
      </div>

      <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {projectSuppliers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
              <Icon name="suppliers" size={24}/>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}>Add your first supplier</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
                Upload a quote PDF or Excel file. Lynx extracts and classifies line items automatically.
              </div>
            </div>
            <button className="ql-btn ql-btn-mint" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13}/> Add supplier
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 780 }}>
            {projectSuppliers.map(s => {
              const docs = documents.filter(d => d.supplierId === s.id && d.projectId === project.id);
              const sItems = items.filter(it => it.supplierId === s.id && it.projectId === project.id && it.classificationStatus !== 'superseded');
              const sDUs = decisionUnits.filter(du => du.supplierId === s.id && du.projectId === project.id);

              const confirmedItems = sItems.filter(it => it.classificationStatus === 'accepted' || it.classificationStatus === 'edited');
              const confirmedDUs = sDUs.filter(du => du.reviewStatus === 'confirmed');
              const pendingItems = sItems.filter(it => it.classificationStatus === 'pending');
              const pendingDUs = sDUs.filter(du => du.reviewStatus !== 'confirmed');
              const pendingCount = pendingItems.length + pendingDUs.length;
              const confirmedCount = confirmedItems.length + confirmedDUs.length;

              // Stage coverage from confirmed items/DUs
              const stagesCovered = project.stages.filter(stage =>
                confirmedItems.some(it => it.stages.includes(stage)) ||
                confirmedDUs.some(du => du.stages.includes(stage))
              );

              // Estimated total cost contribution (sum of confirmed flat items)
              const totalCost = confirmedItems.reduce((sum, it) => sum + it.unitCost, 0);
              const hasCost = confirmedItems.length > 0;

              // Processing status from docs
              const isProcessing = docs.some(d => d.status === 'processing');
              const hasError = docs.some(d => d.status === 'error');

              // Overall status
              type SupplierStatus = 'processing' | 'error' | 'pending' | 'ready' | 'empty';
              const status: SupplierStatus = isProcessing ? 'processing'
                : hasError ? 'error'
                : pendingCount > 0 ? 'pending'
                : confirmedCount > 0 ? 'ready'
                : 'empty';

              return (
                <div
                  key={s.id}
                  className="ql-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    borderLeft: status === 'pending' ? '3px solid var(--amber)' : status === 'ready' ? '3px solid var(--mint)' : status === 'error' ? '3px solid var(--red)' : '3px solid transparent',
                  }}
                  onClick={() => navigate(`/projects/${projectId}/suppliers/${s.id}`)}
                >
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--cobalt-soft-2)', color: 'var(--cobalt)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 3 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.country && <><Flag code={s.country} size={11}/><span>{s.country}</span></>}
                      {s.contact && <span style={{ color: 'var(--border)' }}>·</span>}
                      {s.contact && <span>{s.contact}</span>}
                      {docs.length > 0 && <><span style={{ color: 'var(--border)' }}>·</span><span>{docs.length} doc{docs.length !== 1 ? 's' : ''}</span></>}
                    </div>
                  </div>

                  {/* Stage coverage */}
                  {stagesCovered.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 2 }}>COVERS</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 180 }}>
                        {stagesCovered.map(stage => (
                          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: STAGE_COLORS[stage] ?? 'var(--cobalt)', flexShrink: 0 }}/>
                            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{stage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items breakdown */}
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 100 }}>
                    {status === 'empty' ? (
                      <div style={{ fontSize: 11.5, color: 'var(--text-4)', fontStyle: 'italic' }}>No data yet</div>
                    ) : status === 'processing' ? (
                      <div style={{ fontSize: 11.5, color: 'var(--amber)' }}>Processing…</div>
                    ) : status === 'error' ? (
                      <div style={{ fontSize: 11.5, color: 'var(--red)' }}>Error in doc</div>
                    ) : (
                      <>
                        {confirmedCount > 0 && (
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                            {confirmedCount} item{confirmedCount !== 1 ? 's' : ''} confirmed
                          </div>
                        )}
                        {pendingCount > 0 && (
                          <div style={{ fontSize: 11.5, color: 'var(--amber)', fontWeight: 500 }}>
                            {pendingCount} pending review
                          </div>
                        )}
                        {hasCost && pendingCount === 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                            <span className="mono">${totalCost.toFixed(2)}</span> est. contribution
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0, minWidth: 68, textAlign: 'right' }}>
                    {status === 'ready' && <span className="ql-badge ql-badge-mint" style={{ fontSize: 11 }}>Ready ✓</span>}
                    {status === 'pending' && <span className="ql-badge ql-badge-amber" style={{ fontSize: 11 }}>Action needed</span>}
                    {status === 'processing' && <span className="ql-badge ql-badge-amber" style={{ fontSize: 11 }}>Processing</span>}
                    {status === 'error' && <span className="ql-badge" style={{ background: 'var(--red-soft, #fce8e8)', color: 'var(--red)', fontSize: 11 }}>Error</span>}
                    {status === 'empty' && <span className="ql-badge ql-badge-muted" style={{ fontSize: 11 }}>No docs</span>}
                  </div>

                  <Icon name="chevron-right" size={14} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddSupplierModal projectId={project.id} onClose={() => setShowAdd(false)}/>}
    </div>
  );
}
