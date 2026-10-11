export interface SegOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SegProps<V extends string> {
  label: string;
  value: V;
  options: readonly SegOption<V>[];
  onChange: (value: V) => void;
}

export function Seg<V extends string>({ label, value, options, onChange }: SegProps<V>) {
  const move = (from: number, step: number) => {
    const next = options[(from + step + options.length) % options.length];
    if (next && !next.disabled) onChange(next.value);
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(index, 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(index, -1);
    else return;
    event.preventDefault();
  };
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          type="button"
          key={option.value}
          class="seg__cell"
          role="radio"
          aria-checked={option.value === value}
          aria-disabled={option.disabled ? "true" : undefined}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => !option.disabled && onChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
