import Icon from './Icon';

interface StatusBadgeProps {
  status: 'parsed' | 'processing' | 'review';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'parsed') {
    return (
      <span className="ql-badge ql-badge-mint">
        <Icon name="check" size={9} strokeWidth={3}/>Parsed
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="ql-badge ql-badge-amber">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }}/>
        Processing…
      </span>
    );
  }
  return <span className="ql-badge ql-badge-red">Needs review</span>;
}
