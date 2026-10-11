import { Icon } from "./Icon";

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <span class="switch">
      <button type="button" class="switch__track" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
        <span class="switch__thumb">
          <Icon name="check" />
        </span>
      </button>
    </span>
  );
}
