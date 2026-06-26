import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import { summarizeClassification, correctClassification, chatWithDoc } from '@/lib/api';
import type { SupplierItem, DecisionUnit, ChatMessage, ConflictInfo } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priceRange(du: DecisionUnit): string {
  const prices = Object.values(du.priceMatrix);
  if (!prices.length) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

function isCorrection(text: string): boolean {
  const t = text.trim();
  // Must look like an imperative correction command to be routed to /api/correct
  // Everything else (questions, ambiguous, conversational) stays in chat
  if (/^(move|change|rename|set|remove|delete|add|update|merge|split|assign|reclassify|fix|make|put|group|treat|correct|convert|replace|transfer|keep|use|apply|switch)\b/i.test(t)) return true;
  if (/\bshould be\b|\bneeds? to be\b|\bchange.{1,30}to\b|\bmove.{1,30}to\b|\bassign.{1,30}to\b/i.test(t)) return true;
  if (/\bx is (wrong|incorrect|bad|missing)\b/i.test(t)) return true;
  return false;
}

function mergeItems(
  returned: unknown[],
  existing: SupplierItem[],
  doc: { id: string; supplierId: string; projectId: string },
): SupplierItem[] {
  return (returned as Array<Record<string, unknown>>).map(rf => {
    const ex = existing.find(fi => fi.rawName === rf.rawName);
    return {
      id: ex?.id ?? randomId(),
      supplierId: ex?.supplierId ?? doc.supplierId,
      projectId: ex?.projectId ?? doc.projectId,
      documentId: ex?.documentId ?? doc.id,
      rawName: (rf.rawName as string) ?? '',
      canonicalName: (rf.canonicalName as string) ?? '',
      variantNote: rf.variantNote as string | undefined,
      stages: (rf.stages as string[]) ?? [],
      unitCost: (rf.unitCost as number) ?? 0,
      currency: (rf.currency as string) ?? '',
      unit: (rf.unit as string) ?? 'unit',
      moq: (rf.moq as number | null) ?? null,
      leadTime: (rf.leadTime as string | null) ?? null,
      attributes: (rf.attributes as Record<string, string>) ?? {},
      confidence: (rf.confidence as number) ?? 0,
      stageConfidence: rf.stageConfidence as 'high' | 'medium' | 'low' | undefined,
      suggestedStage: rf.suggestedStage as string | undefined,
      classificationStatus: (rf.classificationStatus as SupplierItem['classificationStatus']) ?? 'pending',
    };
  });
}

function mergeDUs(
  returned: unknown[],
  existing: DecisionUnit[],
  doc: { id: string; supplierId: string; projectId: string },
): DecisionUnit[] {
  return (returned as Array<Record<string, unknown>>).map(rd => {
    const ex = existing.find(d => d.canonicalName === (rd.canonicalName as string));
    return {
      id: ex?.id ?? randomId(),
      supplierId: ex?.supplierId ?? (rd.supplierId as string) ?? doc.supplierId,
      projectId: doc.projectId,
      documentId: doc.id,
      canonicalName: (rd.canonicalName as string) ?? '',
      stages: (rd.stages as string[]) ?? [],
      invariants: (rd.invariants as string[]) ?? [],
      variantDimensions: (rd.variantDimensions as DecisionUnit['variantDimensions']) ?? [],
      priceMatrix: (rd.priceMatrix as Record<string, number>) ?? {},
      confidence: (rd.confidence as number) ?? 0,
      sourceItemIds: (rd.sourceItemIds as string[]) ?? [],
      reviewStatus: ex?.reviewStatus,
    };
  });
}

export default function DocReviewPage() {
  const navigate = useNavigate();
  const { projectId, supplierId, docId } = useParams<{ projectId: string; supplierId: string; docId: string }>();
  const {
    projects, documents, items, decisionUnits,
    updateDocument, updateItem, updateDecisionUnit, bulkAddItems, bulkAddDecisionUnits, clearItemsForDoc, updateProject,
  } = useStore();

  const doc = documents.find(d => d.id === docId);
  const project = projects.find(p => p.id === projectId);

  const docItems = items.filter(it => it.documentId === docId && it.classificationStatus !== 'superseded');
  const docDUs = decisionUnits.filter(du => du.documentId === docId);

  // AI chat — persisted in doc.chatHistory
  const [summary, setSummary] = useState<string | null>(doc?.aiSummary ?? null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(doc?.conflictInfo ?? null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>(
    () => (doc?.chatHistory ?? []).map(m => ({ role: m.role, content: m.content }))
  );
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    () => (doc?.chatHistory ?? []).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant' as const, content: m.content }))
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Per-item stage editing (local overrides before confirming)
  const [itemStage, setItemStage] = useState<Record<string, string>>({});
  const [newStageFor, setNewStageFor] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [duStage, setDuStage] = useState<Record<string, string>>({});
  const [newStageForDu, setNewStageForDu] = useState<string | null>(null);
  const [newStageNameDu, setNewStageNameDu] = useState('');

  const hasConflict = conflictInfo !== null && conflictInfo.chosen === undefined;

  const pendingCount = docItems.filter(it => it.classificationStatus === 'pending').length;
  const rejectedCount = docItems.filter(it => it.classificationStatus === 'rejected').length;
  const pendingDUsCount = docDUs.filter(du => du.reviewStatus !== 'confirmed').length;
  const needsAttention = pendingCount + rejectedCount + pendingDUsCount;

  function applyConflictResult(r: { summary: string; conflict: ConflictInfo | null }) {
    setSummary(r.summary);
    // Preserve existing chosen if the conflict is still there but already resolved
    const incoming = r.conflict;
    const merged = incoming
      ? { ...incoming, chosen: conflictInfo?.chosen }
      : null;
    setConflictInfo(merged);
    updateDocument(docId!, { aiSummary: r.summary, conflictInfo: merged });
  }

  // Generate (or regenerate) summary on first open.
  // Re-runs when conflictInfo is undefined — meaning the doc was analyzed before the
  // conflict-detection feature existed and has never received a structured analysis.
  useEffect(() => {
    const needsAnalysis = (!summary || doc?.conflictInfo === undefined) && doc && project && (docItems.length > 0 || docDUs.length > 0);
    if (needsAnalysis) {
      summarizeClassification({ decisionUnits: docDUs, flatItems: docItems, projectStages: project.stages, projectInstructions: project.instructions })
        .then(applyConflictResult)
        .catch(() => setSummary('Could not generate summary.'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!doc || !project) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', flexDirection: 'column', gap: 12 }}>
        <div>Document not found.</div>
        <button className="ql-btn ql-btn-ghost" onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  const hasRawText = !!doc.rawText;

  function saveHistory(newMessages: Array<{ role: 'user' | 'ai'; content: string }>) {
    const chatHistory: ChatMessage[] = newMessages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: new Date().toISOString(),
    }));
    updateDocument(docId!, { chatHistory });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !hasRawText) return;
    setInput('');
    setLoading(true);
    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);

    try {
      if (!isCorrection(text)) {
        const result = await chatWithDoc({
          message: text,
          rawText: doc.rawText,
          itemsSummary: summary ?? undefined,
          history: chatHistory,
          projectInstructions: project.instructions,
        });
        const reply = result.reply;
        const finalMessages = [...newMessages, { role: 'ai' as const, content: reply }];
        setMessages(finalMessages);
        saveHistory(finalMessages);
        setChatHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
      } else {
        const result = await correctClassification({
          correction: text,
          rawText: doc.rawText!,
          currentFlatItems: docItems,
          currentDUs: docDUs,
          projectStages: project.stages,
          projectInstructions: project.instructions,
        });
        const newFlatItems = mergeItems(result.flatItems, docItems, doc);
        const newDUs = mergeDUs(result.decisionUnits, docDUs, doc);
        clearItemsForDoc(doc.id);
        if (newFlatItems.length) bulkAddItems(newFlatItems);
        if (newDUs.length) bulkAddDecisionUnits(newDUs);
        const reply = result.reply ?? 'Done — classification updated.';
        const finalMessages = [...newMessages, { role: 'ai' as const, content: reply }];
        setMessages(finalMessages);
        saveHistory(finalMessages);
        setChatHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
        // Re-check for conflicts after a correction
        try {
          const s = await summarizeClassification({ decisionUnits: newDUs, flatItems: newFlatItems, projectStages: project.stages, projectInstructions: project.instructions });
          applyConflictResult(s);
        } catch { /* ignore summarize error, conflict state stays */ }
      }
    } catch (err) {
      const finalMessages = [...newMessages, { role: 'ai' as const, content: `Error: ${err instanceof Error ? err.message : String(err)}` }];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } finally {
      setLoading(false);
    }
  }

  function getItemStage(item: SupplierItem) {
    return itemStage[item.id] ?? item.stages[0] ?? project.stages[0] ?? '';
  }

  function itemStageChanged(item: SupplierItem) {
    return itemStage[item.id] !== undefined && itemStage[item.id] !== item.stages[0];
  }

  function confirmItem(item: SupplierItem) {
    const stage = getItemStage(item);
    if (!stage) return;
    updateItem(item.id, { stages: [stage], classificationStatus: 'accepted' });
    setItemStage(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  function commitNewStageForItem(itemId: string) {
    const s = newStageName.trim();
    if (!s) { setNewStageFor(null); return; }
    if (!project.stages.includes(s)) updateProject(project.id, { stages: [...project.stages, s] });
    setItemStage(prev => ({ ...prev, [itemId]: s }));
    setNewStageFor(null);
    setNewStageName('');
  }

  function getDuStage(du: DecisionUnit) {
    return duStage[du.id] ?? du.stages[0] ?? project.stages[0] ?? '';
  }

  function duStageChanged(du: DecisionUnit) {
    return duStage[du.id] !== undefined && duStage[du.id] !== du.stages[0];
  }

  function confirmDU(du: DecisionUnit) {
    const stage = getDuStage(du);
    if (!stage) return;
    updateDecisionUnit(du.id, { stages: [stage], reviewStatus: 'confirmed' });
    setDuStage(prev => { const n = { ...prev }; delete n[du.id]; return n; });
  }

  function chooseOption(chosen: 1 | 2) {
    if (!conflictInfo) return;
    const winnerNames = chosen === 1 ? conflictInfo.option1.canonicalNames : conflictInfo.option2.canonicalNames;
    const loserNames  = chosen === 1 ? conflictInfo.option2.canonicalNames : conflictInfo.option1.canonicalNames;
    docItems.forEach(item => {
      if (winnerNames.includes(item.canonicalName))      updateItem(item.id, { classificationStatus: 'accepted' });
      else if (loserNames.includes(item.canonicalName))  updateItem(item.id, { classificationStatus: 'rejected' });
    });
    docDUs.forEach(du => {
      if (winnerNames.includes(du.canonicalName))      updateDecisionUnit(du.id, { reviewStatus: 'confirmed' });
      else if (loserNames.includes(du.canonicalName))  updateDecisionUnit(du.id, { reviewStatus: undefined });
    });
    const updated: ConflictInfo = { ...conflictInfo, chosen };
    setConflictInfo(updated);
    updateDocument(docId!, { conflictInfo: updated });
  }

  function commitNewStageForDu(duId: string) {
    const s = newStageNameDu.trim();
    if (!s) { setNewStageForDu(null); return; }
    if (!project.stages.includes(s)) updateProject(project.id, { stages: [...project.stages, s] });
    setDuStage(prev => ({ ...prev, [duId]: s }));
    setNewStageForDu(null);
    setNewStageNameDu('');
  }

  const typeLabel = doc.type === 'pdf' ? 'PDF' : doc.type === 'excel' ? 'Excel' : 'Text';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button className="ql-btn ql-btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate(`/projects/${projectId}/suppliers/${supplierId}`)}>
          ← Back
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ql-badge ql-badge-muted" style={{ fontSize: 10 }}>{typeLabel}</span>
            <span>{fmt(doc.uploadedAt)}</span>
            <span>·</span>
            <span>{docItems.length + docDUs.length} item{docItems.length + docDUs.length !== 1 ? 's' : ''}</span>
            {needsAttention > 0 && (
              <span className="ql-badge ql-badge-amber" style={{ fontSize: 9 }}>{needsAttention} to review</span>
            )}
            {needsAttention === 0 && docItems.length + docDUs.length > 0 && (
              <span className="ql-badge ql-badge-mint" style={{ fontSize: 9 }}>All confirmed ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — AI assistant */}
        <div style={{ width: '38%', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="ql-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>AI SUMMARY</div>
              {summary === null && (docItems.length > 0 || docDUs.length > 0) ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-4)' }}>Generating…</div>
              ) : summary ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-3)' }}>{summary}</div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--text-4)', fontStyle: 'italic' }}>No items yet.</div>
              )}
            </div>

            {messages.length === 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-4)', lineHeight: 1.6, padding: '2px 4px' }}>
                Ask a question or describe a correction. Press Enter to send.
              </div>
            )}

            {messages.length > 0 && (
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)' }}>CONVERSATION</div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {msg.role === 'user' ? 'YOU' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '88%', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.6,
                  background: msg.role === 'user' ? 'var(--cobalt)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>AI</div>
                <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12.5, background: 'var(--surface)', color: 'var(--text-4)', border: '1px solid var(--border)' }}>
                  Thinking…
                </div>
              </div>
            )}

            <div ref={chatBottomRef}/>
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--surface)', alignItems: 'flex-end' }}>
            {!hasRawText ? (
              <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic', width: '100%', textAlign: 'center', padding: '6px 0' }}>
                Re-upload to enable AI corrections
              </div>
            ) : (
              <>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a question or describe a correction…"
                  disabled={loading}
                  rows={2}
                  style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.6, outline: 'none', color: 'var(--text)', resize: 'none', fontFamily: 'inherit' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className="ql-btn ql-btn-mint"
                  style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — all items, compact rows */}
        <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Conflict resolution — structured option picker */}
          {conflictInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasConflict
                  ? <><span style={{ fontSize: 14 }}>⚠️</span><span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Pricing conflict — choose one method to continue</span></>
                  : <><span style={{ fontSize: 14 }}>✓</span><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint, #2ecc71)' }}>Method chosen — you can switch at any time</span></>
                }
              </div>
              {hasConflict && (
                <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>{conflictInfo.description}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                {([1, 2] as const).map(n => {
                  const opt = n === 1 ? conflictInfo.option1 : conflictInfo.option2;
                  const isChosen = conflictInfo.chosen === n;
                  const isOther  = conflictInfo.chosen !== undefined && !isChosen;
                  return (
                    <div
                      key={n}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        border: isChosen
                          ? '2px solid var(--mint, #2ecc71)'
                          : isOther
                          ? '1.5px solid var(--border)'
                          : '1.5px solid #d97706',
                        background: isChosen
                          ? 'rgba(46,204,113,0.07)'
                          : isOther
                          ? 'var(--surface)'
                          : 'rgba(245,158,11,0.06)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        opacity: isOther ? 0.55 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', color: isChosen ? 'var(--mint, #2ecc71)' : 'var(--text-4)', fontWeight: 600 }}>
                          OPTION {n}{isChosen ? ' · ACTIVE' : ''}
                        </span>
                        {isChosen && <span style={{ fontSize: 11 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>{opt.description}</div>
                      {/* Real items/DUs belonging to this option */}
                      {opt.canonicalNames.length > 0 && (() => {
                        const optItems = docItems.filter(it => opt.canonicalNames.includes(it.canonicalName));
                        const optDUs   = docDUs.filter(du => opt.canonicalNames.includes(du.canonicalName));
                        if (optItems.length === 0 && optDUs.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 10px' }}>
                            {optDUs.map(du => (
                              <div key={du.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11.5, flex: 1, fontWeight: 500, color: 'var(--text)' }}>{du.canonicalName}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>variants</span>
                                <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--cobalt)' }}>{priceRange(du)}</span>
                              </div>
                            ))}
                            {optItems.map(it => (
                              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11.5, flex: 1, color: 'var(--text)' }}>{it.canonicalName}</span>
                                {it.variantNote && <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{it.variantNote}</span>}
                                <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--cobalt)' }}>${it.unitCost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <button
                        className="ql-btn"
                        style={{
                          marginTop: 4,
                          padding: '5px 0',
                          fontSize: 12,
                          width: '100%',
                          borderRadius: 6,
                          background: isChosen ? 'var(--mint, #2ecc71)' : isOther ? 'transparent' : 'rgba(245,158,11,0.15)',
                          border: isChosen ? 'none' : isOther ? '1px solid var(--border)' : '1px solid #d97706',
                          color: isChosen ? '#fff' : isOther ? 'var(--text-4)' : '#92400e',
                          cursor: isChosen ? 'default' : 'pointer',
                          fontWeight: isChosen ? 600 : 400,
                        }}
                        disabled={isChosen}
                        onClick={() => chooseOption(n)}
                      >
                        {isChosen ? 'Currently using this method' : isOther ? 'Switch to this method' : 'Choose this method'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flat items */}
          {docItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 8 }}>
                ITEMS ({docItems.length})
              </div>
              <div className="ql-card" style={{ padding: 0, overflow: 'hidden' }}>
                {docItems.map((item, idx) => {
                  const isPending = item.classificationStatus === 'pending';
                  const isRejected = item.classificationStatus === 'rejected';
                  const stageEdited = itemStageChanged(item);
                  const needsConfirm = isPending || isRejected || stageEdited;
                  const currentStage = getItemStage(item);
                  const isCreating = newStageFor === item.id;
                  const isLast = idx === docItems.length - 1;

                  const rowBg = isRejected ? 'rgba(224,62,62,0.04)' : isPending ? 'rgba(245,183,70,0.04)' : undefined;
                  const borderLeft = isRejected ? '2px solid var(--red, #e03e3e)' : isPending ? '2px solid var(--amber)' : '2px solid transparent';

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: '10px 14px',
                        borderBottom: isLast ? 'none' : '1px solid var(--border)',
                        background: rowBg,
                        borderLeft,
                      }}
                    >
                      {/* Row 1 — name always has full width */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.canonicalName}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
                          ${item.unitCost.toFixed(2)}
                        </div>
                        {isRejected && <span className="ql-badge" style={{ fontSize: 9, background: 'rgba(224,62,62,0.12)', color: 'var(--red, #e03e3e)', flexShrink: 0 }}>Removed</span>}
                      </div>

                      {/* Row 2 — variantNote + stage + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.variantNote && (
                          <div style={{ fontSize: 11, color: 'var(--text-4)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.variantNote}</div>
                        )}
                        {!item.variantNote && <div style={{ flex: 1 }}/>}

                        {/* Stage */}
                        {isCreating ? (
                          <input
                            autoFocus
                            value={newStageName}
                            onChange={e => setNewStageName(e.target.value)}
                            placeholder="Stage name…"
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitNewStageForItem(item.id);
                              if (e.key === 'Escape') { setNewStageFor(null); setNewStageName(''); }
                            }}
                            onBlur={() => commitNewStageForItem(item.id)}
                            style={{ fontSize: 11.5, padding: '2px 7px', border: '1px solid var(--cobalt)', borderRadius: 5, outline: 'none', background: 'var(--bg)', color: 'var(--text)', width: 120 }}
                          />
                        ) : (
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <select
                              value={currentStage}
                              onChange={e => {
                                if (e.target.value === '__create__') { setNewStageFor(item.id); setNewStageName(''); }
                                else setItemStage(prev => ({ ...prev, [item.id]: e.target.value }));
                              }}
                              style={{
                                appearance: 'none',
                                background: stageEdited ? 'var(--cobalt-soft-2)' : 'var(--bg)',
                                border: `1px solid ${stageEdited ? 'var(--cobalt)' : 'var(--border)'}`,
                                borderRadius: 5,
                                padding: '2px 20px 2px 7px',
                                fontSize: 11.5,
                                color: 'var(--text)',
                                outline: 'none',
                                cursor: 'pointer',
                                maxWidth: 160,
                              }}
                            >
                              {project.stages.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__create__">+ New stage…</option>
                            </select>
                            <div style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-4)' }}>
                              <Icon name="chevron-down" size={10}/>
                            </div>
                          </div>
                        )}

                        {needsConfirm && (
                          <button
                            className="ql-btn ql-btn-mint"
                            style={{ padding: '2px 10px', fontSize: 11.5, flexShrink: 0 }}
                            onClick={() => confirmItem(item)}
                            disabled={!currentStage || isCreating || hasConflict}
                            title={hasConflict ? 'Resolve the pricing conflict first' : undefined}
                          >
                            {isRejected ? 'Restore' : 'Confirm'}
                          </button>
                        )}

                        {!isRejected && (
                          <button
                            className="ql-btn ql-btn-ghost"
                            style={{ padding: '2px 6px', color: 'var(--text-4)', flexShrink: 0 }}
                            title="Remove item"
                            onClick={() => updateItem(item.id, { classificationStatus: 'rejected' })}
                          >
                            <Icon name="trash" size={11}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant groups */}
          {docDUs.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 8 }}>
                VARIANT GROUPS ({docDUs.length})
              </div>
              <div className="ql-card" style={{ padding: 0, overflow: 'hidden' }}>
                {docDUs.map((du, idx) => {
                  const isConfirmed = du.reviewStatus === 'confirmed';
                  const stageEdited = duStageChanged(du);
                  const needsConfirm = !isConfirmed || stageEdited;
                  const currentStage = getDuStage(du);
                  const isCreatingDu = newStageForDu === du.id;
                  const isLast = idx === docDUs.length - 1;

                  return (
                    <div
                      key={du.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: '10px 14px',
                        borderBottom: isLast ? 'none' : '1px solid var(--border)',
                        background: !isConfirmed ? 'rgba(245,183,70,0.04)' : undefined,
                        borderLeft: !isConfirmed ? '2px solid var(--amber)' : '2px solid transparent',
                      }}
                    >
                      {/* Row 1 — name + price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {du.canonicalName}
                          <span className="ql-badge ql-badge-muted" style={{ fontSize: 9, flexShrink: 0 }}>variants</span>
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
                          {priceRange(du)}
                        </div>
                      </div>

                      {/* Row 2 — dims + stage + confirm */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 0 }}>
                          {du.variantDimensions.map(dim => (
                            <span key={dim.name} style={{ fontSize: 11, color: 'var(--text-4)' }}>
                              <span style={{ color: 'var(--cobalt)' }}>{dim.name}</span>: {dim.options.join(' / ')}
                            </span>
                          ))}
                        </div>

                        {isCreatingDu ? (
                          <input
                            autoFocus
                            value={newStageNameDu}
                            onChange={e => setNewStageNameDu(e.target.value)}
                            placeholder="Stage name…"
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitNewStageForDu(du.id);
                              if (e.key === 'Escape') { setNewStageForDu(null); setNewStageNameDu(''); }
                            }}
                            onBlur={() => commitNewStageForDu(du.id)}
                            style={{ fontSize: 11.5, padding: '2px 7px', border: '1px solid var(--cobalt)', borderRadius: 5, outline: 'none', background: 'var(--bg)', color: 'var(--text)', width: 120 }}
                          />
                        ) : (
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <select
                              value={currentStage}
                              onChange={e => {
                                if (e.target.value === '__create__') { setNewStageForDu(du.id); setNewStageNameDu(''); }
                                else setDuStage(prev => ({ ...prev, [du.id]: e.target.value }));
                              }}
                              style={{
                                appearance: 'none',
                                background: stageEdited ? 'var(--cobalt-soft-2)' : 'var(--bg)',
                                border: `1px solid ${stageEdited ? 'var(--cobalt)' : 'var(--border)'}`,
                                borderRadius: 5,
                                padding: '2px 20px 2px 7px',
                                fontSize: 11.5,
                                color: 'var(--text)',
                                outline: 'none',
                                cursor: 'pointer',
                                maxWidth: 160,
                              }}
                            >
                              {project.stages.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__create__">+ New stage…</option>
                            </select>
                            <div style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-4)' }}>
                              <Icon name="chevron-down" size={10}/>
                            </div>
                          </div>
                        )}

                        {needsConfirm && (
                          <button
                            className="ql-btn ql-btn-mint"
                            style={{ padding: '2px 10px', fontSize: 11.5, flexShrink: 0 }}
                            onClick={() => confirmDU(du)}
                            disabled={!currentStage || isCreatingDu || hasConflict}
                            title={hasConflict ? 'Resolve the pricing conflict first' : undefined}
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {docItems.length === 0 && docDUs.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50%', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
              No items extracted from this document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
