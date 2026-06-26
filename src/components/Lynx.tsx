interface LynxProps {
  size?: number;
  color?: string;
  accent?: string;
}

export function Lynx({ size = 24, color = '#2541E8', accent = '#131623' }: LynxProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M5 12 L3 3 L9 9 L11 7 L13 9 Z" fill={color}/>
      <path d="M27 12 L29 3 L23 9 L21 7 L19 9 Z" fill={color}/>
      <path d="M16 6 L26 12 L24 22 Q20 28 16 28 Q12 28 8 22 L6 12 Z" fill={color}/>
      <path d="M6 19 L2 21 L5 22 L3 25 L7 24 Z" fill={color}/>
      <path d="M26 19 L30 21 L27 22 L29 25 L25 24 Z" fill={color}/>
      <path d="M11 15 Q12.5 13.5 14 15 Q12.5 16.5 11 15 Z" fill={accent}/>
      <path d="M18 15 Q19.5 13.5 21 15 Q19.5 16.5 18 15 Z" fill={accent}/>
      <path d="M14.5 20 L17.5 20 L16 22.5 Z" fill={accent}/>
    </svg>
  );
}

interface LynxEyeProps {
  size?: number;
}

export function LynxEye({ size = 80 }: LynxEyeProps) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 100 70" fill="none">
      <defs>
        <pattern id="halftone" patternUnits="userSpaceOnUse" width="3" height="3">
          <circle cx="1.5" cy="1.5" r="0.9" fill="#2541E8"/>
        </pattern>
        <radialGradient id="lynxiris" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#2541E8"/>
          <stop offset="100%" stopColor="#1A2FB8"/>
        </radialGradient>
        <mask id="eyemask">
          <path d="M5 35 Q25 8 50 8 Q75 8 95 35 Q75 62 50 62 Q25 62 5 35 Z" fill="#fff"/>
        </mask>
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
}
