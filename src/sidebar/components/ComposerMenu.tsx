import type { ComponentChildren, RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { MODEL_META } from "../../api/budget";
import { MODEL_IDS } from "../../shared/constants";
import type { ModelId } from "../../shared/constants";
import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";
import { conversation, setModel } from "../state/conversation";
import { capture } from "../state/intake";
import { openOptions } from "./actions";

const FOCUS_STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
const ITEM_SELECTOR = '[role^="menuitem"]';

function MenuItem({ onSelect, children }: { onSelect: () => void; children: ComponentChildren }) {
  return (
    <button type="button" role="menuitem" class="menu__item" onClick={onSelect}>
      {children}
    </button>
  );
}

function moveFocus(menu: HTMLElement, step: number): void {
  const items = [...menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)];
  const current = items.indexOf(document.activeElement as HTMLElement);
  items[(current + step + items.length) % items.length]?.focus();
}

function useCloseOnOutsidePointer(root: RefObject<HTMLDivElement | null>, open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
}

export function ComposerMenu({ onPickLibrary }: { onPickLibrary: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const pick = (action: () => void) => () => {
    action();
    close();
  };
  useCloseOnOutsidePointer(root, open, close);
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open]);

  const onMenuKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.current?.focus();
    } else if (FOCUS_STEP[event.key] !== undefined && menu.current) {
      event.preventDefault();
      moveFocus(menu.current, FOCUS_STEP[event.key] as number);
    }
  };

  return (
    <div class="sb-plus" ref={root}>
      <button
        ref={trigger}
        type="button"
        class="icon-btn"
        aria-label={t("sidebar_addContext")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="plus" />
      </button>
      {open && (
        <div ref={menu} role="menu" class="menu sb-menu anim-pop" onKeyDown={onMenuKey}>
          <MenuItem onSelect={pick(() => void capture("page"))}>{t("sidebar_addPage")}</MenuItem>
          <MenuItem onSelect={pick(() => void capture("selection"))}>{t("sidebar_addSelection")}</MenuItem>
          <MenuItem onSelect={pick(onPickLibrary)}>{t("sidebar_addLibrary")}</MenuItem>
          <div role="group" aria-label={t("sidebar_modelLabel")}>
            <p class="overline" aria-hidden="true">
              {t("sidebar_modelLabel")}
            </p>
            {MODEL_IDS.map((model: ModelId) => (
              <button
                key={model}
                type="button"
                role="menuitemradio"
                aria-checked={model === conversation.value.model}
                class="menu__item"
                onClick={pick(() => setModel(model))}
              >
                {t(MODEL_META[model].labelKey)}
              </button>
            ))}
          </div>
          <MenuItem onSelect={pick(openOptions)}>{t("sidebar_settings")}</MenuItem>
        </div>
      )}
    </div>
  );
}
