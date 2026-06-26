interface FlagProps {
  code: string;
  size?: number;
}

export default function Flag({ code, size = 14 }: FlagProps) {
  const w = size * 1.4, h = size;
  const stroke = 'rgba(0,0,0,0.12)';
  const wrap = (children: React.ReactNode) => (
    <svg width={w} height={h} viewBox="0 0 28 20" style={{ borderRadius: 3, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', boxShadow: `inset 0 0 0 1px ${stroke}` }}>
      {children}
    </svg>
  );

  switch (code) {
    case 'CN': return wrap(<><rect width="28" height="20" fill="#DE2910"/><polygon points="6,4 7,7 10,7 7.5,9 8.5,12 6,10 3.5,12 4.5,9 2,7 5,7" fill="#FFDE00"/></>);
    case 'IT': return wrap(<><rect width="9.33" height="20" fill="#009246"/><rect x="9.33" width="9.33" height="20" fill="#fff"/><rect x="18.66" width="9.34" height="20" fill="#CE2B37"/></>);
    case 'FR': return wrap(<><rect width="9.33" height="20" fill="#0055A4"/><rect x="9.33" width="9.33" height="20" fill="#fff"/><rect x="18.66" width="9.34" height="20" fill="#EF4135"/></>);
    case 'DE': return wrap(<><rect width="28" height="6.66" fill="#000"/><rect y="6.66" width="28" height="6.66" fill="#DD0000"/><rect y="13.32" width="28" height="6.66" fill="#FFCE00"/></>);
    case 'PT': return wrap(<><rect width="11" height="20" fill="#006600"/><rect x="11" width="17" height="20" fill="#FF0000"/><circle cx="11" cy="10" r="3.2" fill="#FFCC00" stroke="#fff" strokeWidth="0.5"/></>);
    case 'US': return wrap(<><rect width="28" height="20" fill="#fff"/>{[0,2,4,6,8,10,12].map(i => <rect key={i} y={i*1.54} width="28" height="1.54" fill="#B22234"/>)}<rect width="11" height="11" fill="#3C3B6E"/></>);
    case 'UK':
    case 'GB': return wrap(<><rect width="28" height="20" fill="#012169"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#fff" strokeWidth="3"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" strokeWidth="1.5"/><path d="M14,0 V20 M0,10 H28" stroke="#fff" strokeWidth="4"/><path d="M14,0 V20 M0,10 H28" stroke="#C8102E" strokeWidth="2"/></>);
    default: return wrap(<rect width="28" height="20" fill="#ccc"/>);
  }
}
