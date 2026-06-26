import { useState } from 'react';
import Icon from './Icon';
import { useStore } from '@/lib/store';
import type { SupplierItem } from '@/lib/types';
import { STAGE_COLORS } from '@/lib/data';

interface Props {
  items: SupplierItem[];
  projectStages: string[];
}

export default function ReviewClassification({ items, projectStages }: Props) {
  const { updateItem } = useStore();
  const [editing, setEditing] = useState<string | null>(null);

  const pending = items.filter(it => it.classificationStatus === 'pending');

  function accept(id: string) {
    updateItem(id, { classificationStatus: 'accepted' });
  }

  function reject(id: string) {
    updateItem(id, { classificationStatus: 'rejected' });
  }

  function acceptAll() {
    pending.forEach(it => updateItem(it.id, { classificationStatus: 'accepted' }));
  }

  if (pending.length === 0) return null;

  return (
    <div className="ql-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>Review classifications</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>
            {pending.length} item{pending.length !== 1 ? 's' : ''} need review
          </div>
        </div>
        <button className="ql-btn ql-btn-mint" onClick={acceptAll}>
          <Icon name="check" size={12}/> Accept all
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['RAW LINE ITEM', 'CANONICAL NAME', 'STAGE', 'CONFIDENCE', ''].map(h => (
              <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pending.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 20px', color: 'var(--text-3)', fontStyle: 'italic' }}>{item.rawName}</td>
              <td style={{ padding: '12px 20px' }}>
                {editing === item.id ? (
                  <input
                    autoFocus
                    defaultValue={item.canonicalName}
                    style={{ background: 'var(--cobalt-soft-2)', border: '1px solid var(--cobalt)', borderRadius: 4, padding: '3px 8px', fontSize: 12.5, outline: 'none', width: '100%' }}
                    onBlur={e => {
                      updateItem(item.id, { canonicalName: e.target.value, classificationStatus: 'edited' });
                      setEditing(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <span
                    style={{ fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setEditing(item.id)}
                  >
                    {item.canonicalName}
                    <span style={{ color: 'var(--text-4)', opacity: 0 }} className="hover-reveal"><Icon name="pencil" size={11}/></span>
                  </span>
                )}
              </td>
              <td style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <select
                    value={item.stages[0] ?? ''}
                    onChange={e => updateItem(item.id, { stages: [e.target.value], stageConfidence: 'high' })}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', fontSize: 12, color: 'var(--text)' }}
                  >
                    {projectStages.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {item.stageConfidence === 'low' && (
                    <div style={{ fontSize: 10.5, color: 'var(--amber)', lineHeight: 1.4 }}>
                      ⚠ poor fit{item.suggestedStage ? ` — suggest "${item.suggestedStage}"` : ''}
                    </div>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: 4, width: 60, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.confidence * 100}%`, background: item.confidence > 0.8 ? 'var(--cobalt)' : item.confidence > 0.5 ? 'var(--amber)' : 'var(--red)' }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(item.confidence * 100)}%</span>
                </div>
              </td>
              <td style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ql-btn ql-btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => accept(item.id)}>
                    <Icon name="check" size={11}/> Accept
                  </button>
                  <button className="ql-btn ql-btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5, color: 'var(--red)' }} onClick={() => reject(item.id)}>
                    <Icon name="close" size={11}/>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
