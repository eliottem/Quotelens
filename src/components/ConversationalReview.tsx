import { useState, useEffect, useRef } from 'react';
import { summarizeClassification, correctClassification, chatWithDoc } from '@/lib/api';
import type { Document, SupplierItem, DecisionUnit } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function isQuestion(text: string): boolean {
  const t = text.trim();
  if (t.endsWith('?')) return true;
  const lower = t.toLowerCase();
  return /^(what|how|why|when|where|who|can|does|do|is|are|which|could|would|explain|tell me|qu'est|c'est quoi|ça veut dire|que veut|comment|pourquoi|cest quoi|what is|what does|what are)/i.test(lower);
}

interface ConversationalReviewProps {
  doc: Document;
  rawText: string;
  flatItems: SupplierItem[];
  dus: DecisionUnit[];
  projectStages: string[];
  onConfirm: () => void;
  onApplyCorrection: (newFlatItems: SupplierItem[], newDUs: DecisionUnit[]) => void;
  onCancel: () => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function ConversationalReview({
  doc,
  rawText,
  flatItems,
  dus,
  projectStages,
  onConfirm,
  onApplyCorrection,
  onCancel,
}: ConversationalReviewProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    summarizeClassification({ decisionUnits: dus, flatItems, projectStages })
      .then(r => setSummary(r.summary))
      .catch(err => setSummary(`Could not generate summary: ${err instanceof Error ? err.message : String(err)}`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      if (isQuestion(text)) {
        // General question — just answer without modifying items
        const result = await chatWithDoc({
          message: text,
          rawText,
          itemsSummary: summary ?? undefined,
          history: chatHistory,
        });
        const reply = result.reply;
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
        setChatHistory(prev => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: reply },
        ]);
      } else {
        // Correction — modify the classification
        const result = await correctClassification({
          correction: text,
          rawText,
          currentFlatItems: flatItems,
          currentDUs: dus,
          projectStages,
        });

        const returnedFlat = result.flatItems as Array<Record<string, unknown>>;
        const newFlatItems: SupplierItem[] = returnedFlat.map(rf => {
          const existing = flatItems.find(fi => fi.rawName === rf.rawName);
          return {
            id: existing?.id ?? randomId(),
            supplierId: existing?.supplierId ?? doc.supplierId,
            projectId: existing?.projectId ?? doc.projectId,
            documentId: existing?.documentId ?? doc.id,
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

        const returnedDUs = result.decisionUnits as Array<Record<string, unknown>>;
        const newDUs: DecisionUnit[] = returnedDUs.map(rd => {
          const existing = dus.find(d => d.canonicalName === (rd.canonicalName as string));
          return {
            id: existing?.id ?? randomId(),
            supplierId: existing?.supplierId ?? (rd.supplierId as string) ?? doc.supplierId,
            projectId: existing?.projectId ?? doc.projectId,
            documentId: existing?.documentId ?? doc.id,
            canonicalName: (rd.canonicalName as string) ?? '',
            stages: (rd.stages as string[]) ?? [],
            invariants: (rd.invariants as string[]) ?? [],
            variantDimensions: (rd.variantDimensions as DecisionUnit['variantDimensions']) ?? [],
            priceMatrix: (rd.priceMatrix as Record<string, number>) ?? {},
            confidence: (rd.confidence as number) ?? 0,
            sourceItemIds: (rd.sourceItemIds as string[]) ?? [],
            reviewStatus: existing?.reviewStatus,
          };
        });

        onApplyCorrection(newFlatItems, newDUs);

        const reply = result.reply ?? 'Done — classification updated.';
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
        setChatHistory(prev => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: reply },
        ]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      borderTop: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            AI Review — {doc.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>
            Ask questions or describe corrections — then confirm to save
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ql-btn ql-btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="ql-btn ql-btn-mint" onClick={onConfirm} disabled={loading}>Confirm</button>
        </div>
      </div>

      {/* Body — two panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — summary + chat */}
        <div style={{
          width: '42%',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* AI summary — generated once at the start */}
            <div className="ql-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>AI SUMMARY</div>
              {summary === null ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-4)' }}>Generating summary…</div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-3)' }}>{summary}</div>
              )}
            </div>

            {/* Hint */}
            {messages.length === 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-4)', lineHeight: 1.6, padding: '4px 2px' }}>
                Ask a question ("what is a variant group?") or describe a correction ("move Kraft Box to Secondary Packaging").
              </div>
            )}

            {/* Thread label */}
            {messages.length > 0 && (
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginTop: 4 }}>
                CONVERSATION
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {msg.role === 'user' ? 'YOU' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '88%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  lineHeight: 1.6,
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

          {/* Chat input */}
          <div style={{ borderTop: '1px solid var(--border)', padding: 14, display: 'flex', gap: 8, flexShrink: 0, background: 'var(--surface)' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question or describe a correction…"
              disabled={loading}
              rows={2}
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.6, outline: 'none', color: 'var(--text)', resize: 'none', fontFamily: 'inherit' }}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(); }}
            />
            <button
              className="ql-btn ql-btn-mint"
              style={{ padding: '8px 14px', fontSize: 12, alignSelf: 'flex-end' }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>

        {/* RIGHT — items overview */}
        <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {flatItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>
                ITEMS ({flatItems.length})
              </div>
              <div className="ql-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['NAME', 'STAGE', 'COST'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flatItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 14px', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.canonicalName}
                          {item.variantNote && <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6, fontWeight: 400 }}>{item.variantNote}</span>}
                        </td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-3)' }}>{item.stages[0] ?? <span style={{ color: 'var(--red)', fontSize: 11 }}>unassigned</span>}</td>
                        <td style={{ padding: '9px 14px', fontFamily: 'JetBrains Mono, monospace' }}>${item.unitCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dus.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 10 }}>
                VARIANT GROUPS ({dus.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dus.map(du => (
                  <div key={du.id} className="ql-card" style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{du.canonicalName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-4)', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <span>Stage: <span style={{ color: 'var(--cobalt)' }}>{du.stages.join(', ') || '—'}</span></span>
                      <span>·</span>
                      <span>{Object.keys(du.priceMatrix).length} price{Object.keys(du.priceMatrix).length !== 1 ? 's' : ''}</span>
                    </div>
                    {du.variantDimensions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {du.variantDimensions.map(dim => (
                          <span key={dim.name} className="ql-badge ql-badge-muted" style={{ fontSize: 11 }}>
                            <span style={{ color: 'var(--cobalt)' }}>{dim.name}</span>: {dim.options.join(' / ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {flatItems.length === 0 && dus.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50%', color: 'var(--text-4)', fontSize: 13 }}>
              No items found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
