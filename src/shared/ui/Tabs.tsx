export interface TabOption<V extends string> {
  value: V;
  label: string;
}

export interface TabsProps<V extends string> {
  label: string;
  value: V;
  tabs: readonly TabOption<V>[];
  onChange: (value: V) => void;
  /** When set, tabs get ids `${idPrefix}-${value}` and aria-controls `${idPrefix}-panel`. */
  idPrefix?: string;
}

function targetIndex(key: string, current: number, count: number): number | null {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export function Tabs<V extends string>({ label, value, tabs, onChange, idPrefix }: TabsProps<V>) {
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const next = targetIndex(event.key, index, tabs.length);
    const tab = next === null ? undefined : tabs[next];
    if (!tab) return;
    event.preventDefault();
    onChange(tab.value);
    const list = (event.currentTarget as HTMLElement).parentElement;
    list?.querySelectorAll<HTMLElement>('[role="tab"]')[next ?? 0]?.focus();
  };
  return (
    <div class="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={tab.value}
          id={idPrefix && `${idPrefix}-${tab.value}`}
          class="tab"
          role="tab"
          tabIndex={tab.value === value ? 0 : -1}
          aria-selected={tab.value === value}
          aria-controls={idPrefix && `${idPrefix}-panel`}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
