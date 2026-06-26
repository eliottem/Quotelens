import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Icon from '@/components/Icon';
import Flag from '@/components/Flag';
import ConversationalReview from '@/components/ConversationalReview';
import { useStore } from '@/lib/store';
import { parseDocument, classifyItems, analyzeDocument } from '@/lib/api';
import type { RawLineItem, ClassifiedItem } from '@/lib/api';
import type { Document, SupplierItem, SupplierNote, DecisionUnit } from '@/lib/types';

// Module-level cache: docId → blob URL (survives re-renders, cleared on page unload)
const fileCache = new Map<string, { url: string; mimeType: string }>();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FeedEntry =
  | { kind: 'doc'; date: string; doc: Document }
  | { kind: 'note'; date: string; note: SupplierNote };

export default function SupplierDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, supplierId } = useParams<{ projectId: string; supplierId: string }>();
  const {
    projects, suppliers, documents, items, notes, decisionUnits, scenarios,
    addDocument, updateDocument, deleteDocumentWithItems, addNote, deleteNote, bulkAddItems, updateItem, bulkAddDecisionUnits, updateDecisionUnit, clearItemsForDoc,
  } = useStore();

  const [tab, setTab] = useState<'state' | 'quotes'>('state');
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ files: FileList; context: string } | null>(null);
  const [pendingText, setPendingText] = useState<{ title: string; body: string; context: string } | null>(null);

  type ReviewSession = { doc: Document; rawText: string };
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null);

  const project = projects.find(p => p.id === projectId);
  const supplier = suppliers.find(s => s.id === supplierId);

  if (!supplier || !project) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', flexDirection: 'column', gap: 12 }}>
        <div>Supplier not found.</div>
        <button className="ql-btn ql-btn-ghost" onClick={() => navigate(`/projects/${projectId}/suppliers`)}>← Back</button>
      </div>
    );
  }

  const supplierDocs = documents.filter(d => d.supplierId === supplier.id && d.projectId === project.id);
  const supplierItems = items.filter(it => it.supplierId === supplier.id && it.projectId === project.id);
  const supplierNotes = notes.filter(n => n.supplierId === supplier.id && n.projectId === project.id);

  const feed: FeedEntry[] = [
    ...supplierDocs.map(d => ({ kind: 'doc' as const, date: d.uploadedAt, doc: d })),
    ...supplierNotes.map(n => ({ kind: 'note' as const, date: n.createdAt, note: n })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  function handleAddNote() {
    if (!noteBody.trim()) return;
    addNote({
      id: randomId(),
      supplierId: supplier.id,
      projectId: project.id,
      body: noteBody.trim(),
      createdAt: new Date().toISOString(),
    });
    setNoteBody('');
    setShowNoteComposer(false);
  }

  // Pick up files dropped during onboarding (SupplierSetupPage passes them via router state)
  useEffect(() => {
    const setupFiles = (location.state as { pendingFiles?: File[] } | null)?.pendingFiles;
    if (setupFiles?.length) {
      const dt = new DataTransfer();
      setupFiles.forEach(f => dt.items.add(f));
      setPendingUpload({ files: dt.files, context: '' });
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared pipeline: parse → classify → analyze → save → open review
  async function runPipeline(
    file: File,
    doc: Document,
    context: string,
    existingCanonicals: string[],
    preExisting: SupplierItem[],
  ) {
    try {
      console.log(`[QuoteLens] Starting pipeline for "${file.name}"`);
      updateDocument(doc.id, { status: 'processing' });

      let rawItems: RawLineItem[];
      let rawText = '';
      try {
        const parseResult = await parseDocument(file, {
          supplierId: supplier.id,
          projectId: project.id,
          docId: doc.id,
          supplierName: supplier.name,
          currency: project.currency || undefined,
          context: context || undefined,
        });
        rawItems = parseResult.items;
        rawText = parseResult.rawText;
        console.log(`[QuoteLens] Parse OK — ${rawItems.length} raw items from "${file.name}"`);
      } catch (parseErr) {
        console.error(`[QuoteLens] Parse FAILED for "${file.name}":`, parseErr);
        throw parseErr;
      }

      if (rawItems.length === 0) {
        console.warn(`[QuoteLens] "${file.name}" — 0 items extracted`);
        updateDocument(doc.id, { status: 'parsed' });
        return;
      }

      if (project.stages.length === 0) {
        updateDocument(doc.id, { status: 'error', errorMessage: 'Project has no stages defined.' });
        return;
      }

      let classified: ClassifiedItem[];
      try {
        const classifyResult = await classifyItems(
          rawItems,
          project.stages,
          existingCanonicals,
          project.currency || undefined,
          context || undefined,
          project.instructions || undefined,
        );
        classified = classifyResult.classified;
        console.log(`[QuoteLens] Classify OK — ${classified.length} items`);
      } catch (classifyErr) {
        console.error(`[QuoteLens] Classify FAILED:`, classifyErr);
        throw classifyErr;
      }

      const allNewItems: SupplierItem[] = classified.map(c => {
        if (!existingCanonicals.includes(c.canonicalName)) existingCanonicals.push(c.canonicalName);
        return {
          id: randomId(),
          supplierId: supplier.id,
          projectId: project.id,
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

      let finalItems = allNewItems;
      const duUnits: DecisionUnit[] = [];

      if (rawText && allNewItems.length > 1) {
        try {
          const analyzeInput = allNewItems.map((it, i) => ({ ...classified[i], id: it.id, supplierId: supplier.id }));
          const result = await analyzeDocument(rawText, analyzeInput, context || undefined);
          result.decisionUnits.forEach(du => {
            duUnits.push({ ...du, id: randomId(), projectId: project.id, documentId: doc.id });
          });
          const survivingIds = new Set(result.flatItems.map((it: { id: string }) => it.id));
          finalItems = allNewItems.filter(it => survivingIds.has(it.id));
          console.log(`[QuoteLens] Analyze OK — ${duUnits.length} DU(s), ${finalItems.length} flat item(s)`);
        } catch (err) {
          console.warn(`[QuoteLens] Analyze skipped:`, err instanceof Error ? err.message : err);
        }
      }

      bulkAddItems(finalItems);
      if (duUnits.length > 0) bulkAddDecisionUnits(duUnits);

      const newCanonicals = new Set([...finalItems.map(it => it.canonicalName), ...duUnits.map(du => du.canonicalName)]);
      preExisting
        .filter(it => (it.classificationStatus === 'accepted' || it.classificationStatus === 'edited') && newCanonicals.has(it.canonicalName))
        .forEach(it => updateItem(it.id, { classificationStatus: 'superseded' }));

      updateDocument(doc.id, { status: 'review', rawText });
      setReviewSession({ doc, rawText });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[QuoteLens] Pipeline FAILED for "${file.name}":`, msg);
      updateDocument(doc.id, { status: 'error', errorMessage: msg });
    }
  }

  async function handleFiles(fileList: FileList | null, context = '') {
    if (!fileList?.length) return;

    const fileArray = Array.from(fileList);
    const now = new Date().toISOString();

    const preExisting = [...items.filter(it => it.supplierId === supplier.id && it.projectId === project.id)];
    const existingCanonicals = [
      ...new Set(preExisting.filter(it => it.classificationStatus === 'accepted' || it.classificationStatus === 'edited').map(it => it.canonicalName)),
    ];

    const docRecords = fileArray.map(f => {
      const doc: Document = {
        id: randomId(),
        supplierId: supplier.id,
        projectId: project.id,
        name: f.name,
        type: f.name.endsWith('.pdf') ? 'pdf' : f.name.match(/\.xlsx?$/) ? 'excel' : 'text',
        uploadedAt: now,
        status: 'uploading',
      };
      addDocument(doc);
      const blobUrl = URL.createObjectURL(f);
      fileCache.set(doc.id, { url: blobUrl, mimeType: f.type || (doc.type === 'pdf' ? 'application/pdf' : 'application/octet-stream') });
      return { file: f, doc };
    });

    if (fileRef.current) fileRef.current.value = '';

    for (const { file, doc } of docRecords) {
      await runPipeline(file, doc, context, existingCanonicals, preExisting);
    }
  }

  async function handleTextPaste(title: string, body: string, context: string) {
    if (!body.trim()) return;
    const now = new Date().toISOString();
    const docName = title.trim() || `Text — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const preExisting = [...items.filter(it => it.supplierId === supplier.id && it.projectId === project.id)];
    const existingCanonicals = [
      ...new Set(preExisting.filter(it => it.classificationStatus === 'accepted' || it.classificationStatus === 'edited').map(it => it.canonicalName)),
    ];

    const doc: Document = {
      id: randomId(),
      supplierId: supplier.id,
      projectId: project.id,
      name: docName,
      type: 'text',
      uploadedAt: now,
      status: 'uploading',
    };
    addDocument(doc);

    // Create a synthetic .txt file from the pasted text
    const blob = new Blob([body], { type: 'text/plain' });
    const file = new File([blob], docName + '.txt', { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    fileCache.set(doc.id, { url: blobUrl, mimeType: 'text/plain' });

    await runPipeline(file, doc, context, existingCanonicals, preExisting);
  }

  function handleReviewConfirm() {
    if (!reviewSession) return;
    updateDocument(reviewSession.doc.id, { status: 'parsed' });
    setReviewSession(null);
    setTab('state');
  }

  function handleApplyCorrection(newFlatItems: SupplierItem[], newDUs: DecisionUnit[]) {
    if (!reviewSession) return;
    clearItemsForDoc(reviewSession.doc.id);
    if (newFlatItems.length > 0) bulkAddItems(newFlatItems);
    if (newDUs.length > 0) bulkAddDecisionUnits(newDUs);
  }

  const activeItems = supplierItems.filter(it => it.classificationStatus !== 'superseded');
  const supersededItems = supplierItems.filter(it => it.classificationStatus === 'superseded');
  const supplierDUs = decisionUnits.filter(d => d.supplierId === supplier.id && d.projectId === project.id);

  const pendingItems = activeItems.filter(it => it.classificationStatus === 'pending');
  const rejectedItems = activeItems.filter(it => it.classificationStatus === 'rejected');
  const confirmedItems = activeItems.filter(it => it.classificationStatus === 'accepted' || it.classificationStatus === 'edited');
  const pendingDUs = supplierDUs.filter(du => du.reviewStatus !== 'confirmed');
  const confirmedDUs = supplierDUs.filter(du => du.reviewStatus === 'confirmed');
  const stagesCovered = project.stages.filter(s =>
    confirmedItems.some(it => it.stages.includes(s)) || confirmedDUs.some(du => du.stages.includes(s))
  ).length;

  function sourceDocName(docId: string) {
    const doc = supplierDocs.find(d => d.id === docId);
    return doc ? doc.name.replace(/\.[^.]+$/, '') : '';
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ql-btn ql-btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate(`/projects/${projectId}/suppliers`)}>
            ← Back
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--cobalt-soft-2)', color: 'var(--cobalt)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
              {supplier.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{supplier.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {supplier.country && <><Flag code={supplier.country} size={11}/> {supplier.country}</>}
                {supplier.contact && <> · {supplier.contact}</>}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.txt"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) setPendingUpload({ files: e.target.files, context: '' }); }}
          />
          <button className="ql-btn ql-btn-ghost" onClick={() => { setShowNoteComposer(s => !s); setTab('quotes'); }}>
            <Icon name="plus" size={13}/> Add note
          </button>
          <button className="ql-btn ql-btn-ghost" onClick={() => { setTab('quotes'); setPendingText({ title: '', body: '', context: '' }); }}>
            <Icon name="mail" size={13}/> Paste text
          </button>
          <button className="ql-btn ql-btn-mint" onClick={() => { setTab('quotes'); fileRef.current?.click(); }}>
            <Icon name="upload" size={13}/> Upload doc
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <button className={`ql-tab ${tab === 'state' ? 'active' : ''}`} onClick={() => setTab('state')}>
          State
          {(pendingItems.length + pendingDUs.length + rejectedItems.length) > 0 && (
            <span className="ql-badge ql-badge-amber" style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px' }}>{pendingItems.length + pendingDUs.length + rejectedItems.length}</span>
          )}
        </button>
        <button className={`ql-tab ${tab === 'quotes' ? 'active' : ''}`} onClick={() => setTab('quotes')}>
          Quotes
          <span className="mono" style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--text-4)' }}>{supplierDocs.length}</span>
        </button>
      </div>

      {/* ── Conversational review (inline, takes over content area) ── */}
      {reviewSession && (
        <ConversationalReview
          doc={reviewSession.doc}
          rawText={reviewSession.rawText}
          flatItems={items.filter(it => it.documentId === reviewSession.doc.id)}
          dus={decisionUnits.filter(du => du.documentId === reviewSession.doc.id)}
          projectStages={project.stages}
          onConfirm={handleReviewConfirm}
          onApplyCorrection={handleApplyCorrection}
          onCancel={() => {
            updateDocument(reviewSession.doc.id, { status: 'parsed' });
            setReviewSession(null);
          }}
        />
      )}

      <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', display: reviewSession ? 'none' : undefined }}>

        {/* ── State tab ── */}
        {tab === 'state' && (
          activeItems.length === 0 && supplierDUs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 14, textAlign: 'center', padding: 32 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
                <Icon name="file" size={22}/>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>No quotes processed yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, lineHeight: 1.6 }}>Upload a supplier quote to start building your cost picture.</div>
              </div>
              <button className="ql-btn ql-btn-mint" onClick={() => { setTab('quotes'); fileRef.current?.click(); }}>
                <Icon name="upload" size={13}/> Upload quote
              </button>
            </div>
          ) : (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* ── Summary strip ── */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="ql-card" style={{ flex: 1, padding: '16px 20px' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{confirmedItems.length + confirmedDUs.length}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 3 }}>item{confirmedItems.length + confirmedDUs.length !== 1 ? 's' : ''} confirmed</div>
                </div>
                <div className="ql-card" style={{ flex: 1, padding: '16px 20px' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {stagesCovered}
                    <span style={{ fontSize: 15, color: 'var(--text-4)', fontWeight: 400 }}>/{project.stages.length}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 3 }}>stage{project.stages.length !== 1 ? 's' : ''} covered</div>
                </div>
                {(pendingItems.length + pendingDUs.length) > 0 && (
                  <div className="ql-card" style={{ flex: 1, padding: '16px 20px', border: '1px solid var(--amber)', background: 'rgba(245,183,70,0.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--amber)' }}>{pendingItems.length + pendingDUs.length}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 3 }}>need attention</div>
                  </div>
                )}
              </div>

              {/* ── Needs attention — grouped by document, links to review page ── */}
              {(pendingItems.length > 0 || pendingDUs.length > 0 || rejectedItems.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="warn" size={11}/> NEEDS ATTENTION
                  </div>
                  {/* Group docs that have pending/rejected items */}
                  {supplierDocs
                    .filter(doc => {
                      const docPending = pendingItems.filter(it => it.documentId === doc.id).length;
                      const docRejected = rejectedItems.filter(it => it.documentId === doc.id).length;
                      const docPendingDUs = pendingDUs.filter(du => du.documentId === doc.id).length;
                      return docPending + docRejected + docPendingDUs > 0;
                    })
                    .map(doc => {
                      const docPending = pendingItems.filter(it => it.documentId === doc.id).length;
                      const docRejected = rejectedItems.filter(it => it.documentId === doc.id).length;
                      const docPendingDUs = pendingDUs.filter(du => du.documentId === doc.id).length;
                      const parts: string[] = [];
                      if (docPending > 0) parts.push(`${docPending} pending`);
                      if (docRejected > 0) parts.push(`${docRejected} removed`);
                      if (docPendingDUs > 0) parts.push(`${docPendingDUs} variant group${docPendingDUs !== 1 ? 's' : ''}`);
                      return (
                        <div key={doc.id} className="ql-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--amber)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>{parts.join(' · ')}</div>
                          </div>
                          <button
                            className="ql-btn ql-btn-ghost"
                            style={{ fontSize: 12, padding: '5px 12px', color: 'var(--cobalt)', fontWeight: 500, flexShrink: 0 }}
                            onClick={() => navigate(`/projects/${projectId}/suppliers/${supplierId}/docs/${doc.id}`)}
                          >
                            Review →
                          </button>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {/* ── Per-stage breakdown ── */}
              {project.stages.map(stage => {
                const stageItems = confirmedItems.filter(it => it.stages.includes(stage));
                const stageDUs = confirmedDUs.filter(du => du.stages.includes(stage));
                const isEmpty = stageItems.length === 0 && stageDUs.length === 0;

                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)' }}>
                        {stage.toUpperCase()}
                      </div>
                      {!isEmpty && (
                        <span className="ql-badge ql-badge-muted" style={{ fontSize: 9 }}>{stageItems.length + stageDUs.length}</span>
                      )}
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                    </div>

                    {isEmpty ? (
                      <div style={{ fontSize: 12.5, color: 'var(--text-4)', fontStyle: 'italic', paddingLeft: 4 }}>
                        — No items assigned yet
                      </div>
                    ) : (
                      <div className="ql-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {stageItems.map((item, i) => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: i < stageItems.length - 1 || stageDUs.length > 0 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.canonicalName}</div>
                              {item.variantNote && <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1 }}>{item.variantNote}</div>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-4)', flexShrink: 0 }}>{sourceDocName(item.documentId)}</div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>${item.unitCost.toFixed(2)}</div>
                          </div>
                        ))}
                        {stageDUs.map((du, i) => {
                          const prices = Object.values(du.priceMatrix);
                          const min = prices.length ? Math.min(...prices) : 0;
                          const max = prices.length ? Math.max(...prices) : 0;
                          const priceStr = min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
                          return (
                            <div key={du.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '11px 16px', borderBottom: i < stageDUs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {du.canonicalName}
                                  <span className="ql-badge ql-badge-muted" style={{ fontSize: 9 }}>variants</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                                  {du.variantDimensions.map(dim => (
                                    <span key={dim.name} className="ql-badge ql-badge-muted" style={{ fontSize: 10.5 }}>
                                      <span style={{ color: 'var(--cobalt)' }}>{dim.name}</span>: {dim.options.join(' / ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-4)', flexShrink: 0 }}>{sourceDocName(du.documentId)}</div>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>{priceStr}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Superseded (collapsed footer) ── */}
              {supersededItems.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 11.5, color: 'var(--text-4)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="chevron-right" size={11}/>
                    {supersededItems.length} superseded item{supersededItems.length !== 1 ? 's' : ''} (from older quotes)
                  </summary>
                  <div style={{ marginTop: 10 }}>
                    <ItemsTable items={supersededItems} title="Superseded" muted/>
                  </div>
                </details>
              )}

            </div>
          )
        )}

        {/* ── Quotes tab ── */}
        {tab === 'quotes' && (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680 }}>

            {showNoteComposer && (
              <div className="ql-card" style={{ padding: 16, marginBottom: 4 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>New note</div>
                <textarea
                  autoFocus
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Paste an email, summarise a call, flag a concern…"
                  rows={5}
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, outline: 'none', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAddNote();
                    if (e.key === 'Escape') { setShowNoteComposer(false); setNoteBody(''); }
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="ql-btn ql-btn-ghost" onClick={() => { setShowNoteComposer(false); setNoteBody(''); }}>Cancel</button>
                  <button className="ql-btn ql-btn-mint" onClick={handleAddNote} disabled={!noteBody.trim()}>Save note</button>
                </div>
              </div>
            )}

            {feed.length === 0 && !showNoteComposer ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="file" size={22}/>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>No quotes yet</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, lineHeight: 1.6 }}>
                    Upload a quote PDF or Excel file, or add a note from a call or email.
                  </div>
                </div>
              </div>
            ) : (
              feed.map(entry =>
                entry.kind === 'doc'
                  ? <DocEntry key={entry.doc.id} doc={entry.doc} onPreview={() => setPreviewDoc(entry.doc)} onReview={() => navigate(`/projects/${projectId}/suppliers/${supplierId}/docs/${entry.doc.id}`)}/>
                  : <NoteEntry key={entry.note.id} note={entry.note}/>
              )
            )}
          </div>
        )}
      </div>

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)}/>
      )}

      {/* ── Context modal ── */}
      {pendingUpload && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { handleFiles(pendingUpload.files, pendingUpload.context); setPendingUpload(null); } }}
        >
          <div className="ql-card" style={{ width: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Add context for the AI (optional)</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                e.g. "This doc has 2 finish options for the same box" or "Ignore the pricing table on page 2"
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Array.from(pendingUpload.files).map((f, i) => (
                <span key={i} className="ql-badge ql-badge-muted">{f.name}</span>
              ))}
            </div>
            <textarea
              autoFocus
              value={pendingUpload.context}
              onChange={e => setPendingUpload(p => p ? { ...p, context: e.target.value } : p)}
              placeholder="Optional context hint…"
              rows={3}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, outline: 'none', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  handleFiles(pendingUpload.files, pendingUpload.context);
                  setPendingUpload(null);
                }
                if (e.key === 'Escape') {
                  handleFiles(pendingUpload.files, '');
                  setPendingUpload(null);
                }
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="ql-btn ql-btn-ghost"
                onClick={() => { handleFiles(pendingUpload.files, ''); setPendingUpload(null); }}
              >
                Skip
              </button>
              <button
                className="ql-btn ql-btn-mint"
                onClick={() => { handleFiles(pendingUpload.files, pendingUpload.context); setPendingUpload(null); }}
              >
                Process document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Text paste modal ── */}
      {pendingText && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setPendingText(null); }}
        >
          <div className="ql-card" style={{ width: 560, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Paste text content</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Paste an email, a copied price list, or any supplier text. The AI will extract and classify items exactly like a document.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>TITLE (optional)</label>
              <input
                autoFocus
                value={pendingText.title}
                onChange={e => setPendingText(p => p ? { ...p, title: e.target.value } : p)}
                placeholder={`Email from supplier — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>CONTENT <span style={{ color: 'var(--red, #e03e3e)' }}>*</span></label>
              <textarea
                value={pendingText.body}
                onChange={e => setPendingText(p => p ? { ...p, body: e.target.value } : p)}
                placeholder="Paste email, price list, or any supplier text here…"
                rows={10}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, outline: 'none', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onKeyDown={e => { if (e.key === 'Escape') setPendingText(null); }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>CONTEXT FOR AI (optional)</label>
              <input
                value={pendingText.context}
                onChange={e => setPendingText(p => p ? { ...p, context: e.target.value } : p)}
                placeholder="e.g. 'This is a follow-up email with revised pricing'"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="ql-btn ql-btn-ghost" onClick={() => setPendingText(null)}>Cancel</button>
              <button
                className="ql-btn ql-btn-mint"
                disabled={!pendingText.body.trim()}
                onClick={() => {
                  const { title, body, context } = pendingText;
                  setPendingText(null);
                  handleTextPaste(title, body, context);
                }}
              >
                Extract &amp; review
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Feed entry components ──────────────────────────────────────────────────────

function DocEntry({ doc, onPreview, onReview }: { doc: Document; onPreview: () => void; onReview: () => void }) {
  const { updateDocument, deleteDocumentWithItems, items, decisionUnits, scenarios, deleteScenario } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const docItemCount = items.filter(it => it.documentId === doc.id).length;
  const docDUCount = decisionUnits.filter(du => du.documentId === doc.id).length;
  const docItemIds = new Set([
    ...items.filter(it => it.documentId === doc.id).map(it => it.id),
    ...decisionUnits.filter(du => du.documentId === doc.id).map(du => du.id),
  ]);
  const affectedScenarios = scenarios.filter(sc =>
    sc.projectId === doc.projectId &&
    sc.selections.some(sel => docItemIds.has(sel.itemId))
  );
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(doc.name);

  const typeLabel = doc.type === 'pdf' ? 'PDF' : doc.type === 'excel' ? 'Excel' : 'Text';
  const iconName = doc.type === 'pdf' ? 'file' : doc.type === 'excel' ? 'doc' : 'mail';
  // Only block editing/deleting while a file is actively uploading to the server.
  // 'processing' can take minutes (3 AI calls) and stuck docs must still be deletable.
  const canEdit = doc.status !== 'uploading';

  function commitRename() {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== doc.name) updateDocument(doc.id, { name: trimmed });
    setRenaming(false);
  }

  const cached = fileCache.get(doc.id);
  // Icon is always clickable — modal shows a graceful message when no blob is cached.
  const hasLivePreview = !!cached;

  return (
    <div className="ql-card hover-parent" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div
        style={{ width: 34, height: 34, borderRadius: 8, background: hasLivePreview ? 'var(--cobalt-soft-2)' : 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1, cursor: 'pointer', color: hasLivePreview ? 'var(--cobalt)' : undefined, transition: 'background 0.15s' }}
        onClick={onPreview}
        title="Preview document"
      >
        <Icon name={iconName} size={17}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenaming(false); setRenameVal(doc.name); }
            }}
            style={{ width: '100%', background: 'var(--cobalt-soft-2)', border: '1px solid var(--cobalt)', borderRadius: 4, padding: '3px 8px', fontSize: 13.5, outline: 'none', fontWeight: 500, color: 'var(--text)' }}
          />
        ) : (
          <div
            style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            onClick={onPreview}
          >
            {doc.name}
            {canEdit && (
              <span style={{ opacity: 0, color: 'var(--text-4)' }} className="hover-reveal" onClick={e => { e.stopPropagation(); setRenaming(true); setRenameVal(doc.name); }} title="Rename">
                <Icon name="pencil" size={11}/>
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ql-badge ql-badge-muted" style={{ fontSize: 10 }}>{typeLabel}</span>
          <span>{fmt(doc.uploadedAt)}</span>
        </div>
        {doc.status === 'error' && doc.errorMessage && (
          <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 6, lineHeight: 1.4 }}>{doc.errorMessage}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {doc.status === 'uploading' && <span className="ql-badge ql-badge-muted">Uploading</span>}
        {doc.status === 'processing' && <span className="ql-badge ql-badge-amber">Processing</span>}
        {doc.status === 'review' && <span className="ql-badge ql-badge-amber">Review</span>}
        {doc.status === 'parsed' && <span className="ql-badge ql-badge-mint">Parsed</span>}
        {doc.status === 'error' && <span className="ql-badge" style={{ background: 'var(--red-soft, #fce8e8)', color: 'var(--red)' }}>Error</span>}
        {(doc.status === 'parsed' || doc.status === 'review') && !confirmDelete && (
          <button
            className="ql-btn ql-btn-ghost"
            style={{ padding: '3px 10px', fontSize: 11.5, color: 'var(--cobalt)', fontWeight: 500 }}
            onClick={onReview}
            title="Open document review"
          >
            Review →
          </button>
        )}
        {canEdit && !confirmDelete && (
          <button
            className="ql-btn ql-btn-ghost"
            style={{ padding: '3px 8px', fontSize: 11, color: 'var(--text-4)' }}
            onClick={() => setConfirmDelete(true)}
            title="Delete document"
          >
            <Icon name="trash" size={12}/>
          </button>
        )}
        {confirmDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 360 }}>
            <span style={{ fontSize: 11.5, color: 'var(--red)', lineHeight: 1.4 }}>
              Remove {docItemCount} item{docItemCount !== 1 ? 's' : ''}
              {docDUCount > 0 ? ` + ${docDUCount} variant group${docDUCount !== 1 ? 's' : ''}` : ''}
              {affectedScenarios.length > 0 ? ` + ${affectedScenarios.length} scenario${affectedScenarios.length !== 1 ? 's' : ''}` : ''}?
            </span>
            <button className="ql-btn ql-btn-ghost" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--red)', flexShrink: 0 }} onClick={() => {
              affectedScenarios.forEach(sc => deleteScenario(sc.id));
              deleteDocumentWithItems(doc.id);
            }}>
              Yes
            </button>
            <button className="ql-btn ql-btn-ghost" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0 }} onClick={() => setConfirmDelete(false)}>
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteEntry({ note }: { note: SupplierNote }) {
  const { deleteNote } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = note.body.slice(0, 200);
  const isTruncated = note.body.length > 200;

  return (
    <div className="ql-card hover-parent" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
          <Icon name="mail" size={16}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ql-badge ql-badge-muted" style={{ fontSize: 10 }}>Note</span>
            <span>{fmt(note.createdAt)}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {expanded || !isTruncated ? note.body : preview + '…'}
          </div>
          {isTruncated && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ marginTop: 6, fontSize: 11.5, color: 'var(--cobalt)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {!confirmDelete ? (
            <button
              className="ql-btn ql-btn-ghost"
              style={{ padding: '3px 8px', fontSize: 11, color: 'var(--text-4)' }}
              onClick={() => setConfirmDelete(true)}
              title="Delete note"
            >
              <Icon name="trash" size={12}/>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--red)' }}>Delete?</span>
              <button className="ql-btn ql-btn-ghost" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--red)' }} onClick={() => deleteNote(note.id)}>Yes</button>
              <button className="ql-btn ql-btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Document preview modal ────────────────────────────────────────────────────

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then(r => r.text()).then(setText).catch(() => setText('Could not load file content.'));
  }, [url]);
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-3)' }}>
        {text ?? 'Loading…'}
      </pre>
    </div>
  );
}

function DocPreviewModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const cached = fileCache.get(doc.id);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 960, margin: '0 auto', boxShadow: '0 8px 40px rgba(0,0,0,0.28)' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>
              {doc.type === 'pdf' ? 'PDF' : doc.type === 'excel' ? 'Excel / CSV' : 'Text'} · {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {cached && (
            <a
              href={cached.url}
              download={doc.name}
              className="ql-btn ql-btn-ghost"
              style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
            >
              <Icon name="download" size={13}/> Download
            </a>
          )}
          <button className="ql-btn ql-btn-ghost" style={{ padding: '5px 10px', flexShrink: 0 }} onClick={onClose}>
            <Icon name="close" size={14}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
          {!cached ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-4)' }}>
              <Icon name="file" size={36}/>
              <div style={{ fontSize: 14 }}>Preview unavailable</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                This document was uploaded in a previous session. Re-upload it to preview.
              </div>
            </div>
          ) : doc.type === 'pdf' ? (
            <iframe
              src={cached.url}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title={doc.name}
            />
          ) : doc.type === 'excel' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-4)' }}>
              <Icon name="doc" size={36}/>
              <div style={{ fontSize: 14 }}>Excel preview not supported</div>
              <div style={{ fontSize: 12, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                Browsers can't render Excel files directly. Download the file to open it in Excel or Google Sheets.
              </div>
              <a href={cached.url} download={doc.name} className="ql-btn ql-btn-ghost" style={{ marginTop: 4 }}>
                <Icon name="download" size={13}/> Download
              </a>
            </div>
          ) : (
            <TextPreview url={cached.url}/>
          )}
        </div>
      </div>
    </div>
  );
}



// ── Items table ───────────────────────────────────────────────────────────────

function ItemsTable({ items, title, muted }: { items: SupplierItem[]; title: string; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>{title.toUpperCase()}</div>
      <div className="ql-card" style={{ padding: 0, overflow: 'hidden', opacity: muted ? 0.55 : 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['RAW NAME', 'CANONICAL', 'STAGE', 'COST', 'MOQ', 'LEAD', 'STATUS'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 16px', color: 'var(--text-3)', fontStyle: 'italic', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.rawName}</td>
                <td style={{ padding: '9px 16px', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.canonicalName}</td>
                <td style={{ padding: '9px 16px', color: 'var(--text-3)' }}>{item.stages[0] ?? '—'}</td>
                <td style={{ padding: '9px 16px' }} className="mono">${item.unitCost.toFixed(2)}</td>
                <td style={{ padding: '9px 16px', color: 'var(--text-3)' }} className="mono">{item.moq?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '9px 16px', color: 'var(--text-3)' }}>{item.leadTime ?? '—'}</td>
                <td style={{ padding: '9px 16px' }}>
                  {item.classificationStatus === 'pending' && <span className="ql-badge ql-badge-amber">Pending</span>}
                  {item.classificationStatus === 'accepted' && <span className="ql-badge ql-badge-mint">Accepted</span>}
                  {item.classificationStatus === 'edited' && <span className="ql-badge ql-badge-mint">Edited</span>}
                  {item.classificationStatus === 'rejected' && <span className="ql-badge ql-badge-muted">Rejected</span>}
                  {item.classificationStatus === 'superseded' && <span className="ql-badge ql-badge-muted">Superseded</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
