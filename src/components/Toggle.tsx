interface ToggleProps {
  on: boolean;
  onClick: () => void;
}

export default function Toggle({ on, onClick }: ToggleProps) {
  return (
    <div className={`ql-toggle ${on ? 'on' : ''}`} onClick={onClick} />
  );
}
