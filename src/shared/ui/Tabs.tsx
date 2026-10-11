export interface TabOption<V extends string> {
  value: V;
  label: string;
}

export interface TabsProps<V extends string> {
  label: string;
  value: V;
  tabs: readonly TabOption<V>[];
  onChange: (value: V) => void;
}

export function Tabs<V extends string>({ label, value, tabs, onChange }: TabsProps<V>) {
  return (
    <div class="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.value}
          class="tab"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
