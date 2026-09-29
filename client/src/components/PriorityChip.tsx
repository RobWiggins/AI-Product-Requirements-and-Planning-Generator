import { PRIORITY_CHIP, type PriorityLevel } from "../lib/palette";

const ORDER: PriorityLevel[] = ["High", "Medium", "Low"];

interface Props {
  value: PriorityLevel;
  onChange?: (next: PriorityLevel) => void;
  /** Extra label after the level, e.g. "priority". */
  suffix?: string;
  className?: string;
}

/** Priority badge. With `onChange`, clicking cycles High → Medium → Low. */
export function PriorityChip({ value, onChange, suffix, className = "" }: Props) {
  const base = `font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ${PRIORITY_CHIP[value]} ${className}`;
  const label = suffix ? `${value} ${suffix}` : value;

  if (!onChange) return <span className={base}>{label}</span>;

  const next = ORDER[(ORDER.indexOf(value) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      title={`Priority: ${value}. Click to set ${next}.`}
      aria-label={`Priority ${value}, click to set ${next}`}
      className={`${base} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-paper transition-shadow`}
    >
      {label}
    </button>
  );
}

export default PriorityChip;
