/* global React */
const { Fragment } = React;

// Minimal stroke-icon set
const Icon = ({ name, size = 16, className = '', strokeWidth = 1.6 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };
  switch (name) {
    case 'dashboard':
      return <svg {...props}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case 'suppliers':
      return <svg {...props}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>;
    case 'builder':
      return <svg {...props}><path d="M4 19V5"/><path d="M4 9h6"/><path d="M4 14h10"/><path d="M4 19h16"/></svg>;
    case 'scenarios':
      return <svg {...props}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'arrow-right':
      return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'check':
      return <svg {...props}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'edit':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
    case 'close':
      return <svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'trash':
      return <svg {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case 'drag':
      return <svg {...props}><circle cx="9" cy="6" r="0.8" fill="currentColor"/><circle cx="9" cy="12" r="0.8" fill="currentColor"/><circle cx="9" cy="18" r="0.8" fill="currentColor"/><circle cx="15" cy="6" r="0.8" fill="currentColor"/><circle cx="15" cy="12" r="0.8" fill="currentColor"/><circle cx="15" cy="18" r="0.8" fill="currentColor"/></svg>;
    case 'upload':
      return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>;
    case 'file':
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>;
    case 'mail':
      return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case 'doc':
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>;
    case 'eye':
      return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off':
      return <svg {...props}><path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>;
    case 'chevron-down':
      return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case 'plane':
      return <svg {...props}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>;
    case 'ship':
      return <svg {...props}><path d="M3 18l2-7 7-3 7 3 2 7"/><path d="M12 3v5"/><path d="M3 18s2 2 5 2 4-2 8-2 5 2 5 2"/></svg>;
    case 'warn':
      return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case 'bolt':
      return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none"/></svg>;
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>;
    case 'sparkle':
      return <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
    case 'download':
      return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>;
    case 'pencil':
      return <svg {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    case 'link':
      return <svg {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>;
    case 'filter':
      return <svg {...props}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>;
    case 'star':
      return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

// Tiny rectangular country flag (SVG, no emoji) so it renders consistently on dark
const Flag = ({ code, size = 14 }) => {
  const w = size * 1.4, h = size;
  const stroke = 'rgba(255,255,255,0.15)';
  const wrap = (children) => (
    <svg width={w} height={h} viewBox={`0 0 28 20`} style={{borderRadius: 3, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', boxShadow: `inset 0 0 0 1px ${stroke}`}}>
      {children}
    </svg>
  );
  switch (code) {
    case 'CN':
      return wrap(<><rect width="28" height="20" fill="#DE2910"/><polygon points="6,4 7,7 10,7 7.5,9 8.5,12 6,10 3.5,12 4.5,9 2,7 5,7" fill="#FFDE00"/></>);
    case 'IT':
      return wrap(<><rect width="9.33" height="20" fill="#009246"/><rect x="9.33" width="9.33" height="20" fill="#fff"/><rect x="18.66" width="9.34" height="20" fill="#CE2B37"/></>);
    case 'FR':
      return wrap(<><rect width="9.33" height="20" fill="#0055A4"/><rect x="9.33" width="9.33" height="20" fill="#fff"/><rect x="18.66" width="9.34" height="20" fill="#EF4135"/></>);
    case 'DE':
      return wrap(<><rect width="28" height="6.66" fill="#000"/><rect y="6.66" width="28" height="6.66" fill="#DD0000"/><rect y="13.32" width="28" height="6.66" fill="#FFCE00"/></>);
    case 'PT':
      return wrap(<><rect width="11" height="20" fill="#006600"/><rect x="11" width="17" height="20" fill="#FF0000"/><circle cx="11" cy="10" r="3.2" fill="#FFCC00" stroke="#fff" strokeWidth="0.5"/></>);
    case 'US':
      return wrap(<><rect width="28" height="20" fill="#fff"/>{[0,2,4,6,8,10,12].map(i => <rect key={i} y={i*1.54} width="28" height="1.54" fill="#B22234"/>)}<rect width="11" height="11" fill="#3C3B6E"/></>);
    case 'UK':
    case 'GB':
      return wrap(<><rect width="28" height="20" fill="#012169"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#fff" strokeWidth="3"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" strokeWidth="1.5"/><path d="M14,0 V20 M0,10 H28" stroke="#fff" strokeWidth="4"/><path d="M14,0 V20 M0,10 H28" stroke="#C8102E" strokeWidth="2"/></>);
    case 'IN':
      return wrap(<><rect width="28" height="6.66" fill="#FF9933"/><rect y="6.66" width="28" height="6.66" fill="#fff"/><rect y="13.32" width="28" height="6.66" fill="#138808"/><circle cx="14" cy="10" r="2" fill="none" stroke="#000080" strokeWidth="0.4"/></>);
    case 'TR':
      return wrap(<><rect width="28" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="4" fill="#fff"/><circle cx="12" cy="10" r="3.2" fill="#E30A17"/></>);
    default:
      return wrap(<rect width="28" height="20" fill="#333"/>);
  }
};

// Editorial lynx mark — bold geometric silhouette in cobalt ink
const Lynx = ({ size = 24, color = '#2541E8', accent = '#131623' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Sharp ear tufts up top */}
    <path d="M5 12 L3 3 L9 9 L11 7 L13 9 Z" fill={color}/>
    <path d="M27 12 L29 3 L23 9 L21 7 L19 9 Z" fill={color}/>
    {/* Diamond head silhouette */}
    <path d="M16 6 L26 12 L24 22 Q20 28 16 28 Q12 28 8 22 L6 12 Z" fill={color}/>
    {/* Cheek ruff — angular notches */}
    <path d="M6 19 L2 21 L5 22 L3 25 L7 24 Z" fill={color}/>
    <path d="M26 19 L30 21 L27 22 L29 25 L25 24 Z" fill={color}/>
    {/* Eyes — sharp slits, the watchful lynx gaze */}
    <path d="M11 15 Q12.5 13.5 14 15 Q12.5 16.5 11 15 Z" fill={accent}/>
    <path d="M18 15 Q19.5 13.5 21 15 Q19.5 16.5 18 15 Z" fill={accent}/>
    {/* Nose triangle */}
    <path d="M14.5 20 L17.5 20 L16 22.5 Z" fill={accent}/>
  </svg>
);

// Big editorial lynx eye — cobalt halftone dots, almond shape
const LynxEye = ({ size = 80 }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 100 70" fill="none">
    <defs>
      <pattern id="halftone" patternUnits="userSpaceOnUse" width="3" height="3">
        <circle cx="1.5" cy="1.5" r="0.9" fill="#2541E8"/>
      </pattern>
      <radialGradient id="lynxiris" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#2541E8"/>
        <stop offset="100%" stopColor="#1A2FB8"/>
      </radialGradient>
      <mask id="eyemask"><path d="M5 35 Q25 8 50 8 Q75 8 95 35 Q75 62 50 62 Q25 62 5 35 Z" fill="#fff"/></mask>
    </defs>
    <path d="M5 35 Q25 8 50 8 Q75 8 95 35 Q75 62 50 62 Q25 62 5 35 Z" fill="#FBF9F4" stroke="#131623" strokeWidth="1.5"/>
    <g mask="url(#eyemask)">
      <rect width="100" height="70" fill="url(#halftone)" opacity="0.18"/>
    </g>
    <ellipse cx="50" cy="35" rx="22" ry="22" fill="url(#lynxiris)"/>
    <ellipse cx="50" cy="35" rx="3" ry="20" fill="#131623"/>
    <ellipse cx="44" cy="26" rx="3" ry="2" fill="#fff" opacity="0.85"/>
  </svg>
);

window.Icon = Icon;
window.Flag = Flag;
window.Lynx = Lynx;
window.LynxEye = LynxEye;
