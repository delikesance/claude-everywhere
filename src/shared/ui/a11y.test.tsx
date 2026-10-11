import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";
import { Tabs } from "./Tabs";

const host = document.createElement("div");
document.body.append(host);

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  });

afterEach(() => {
  act(() => render(null, host));
  host.replaceChildren();
});

describe("Dialog", () => {
  function open(onClose = vi.fn()) {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    act(() => render(<div><p id="app">app</p><Dialog titleId="t" title="T" onClose={onClose}><button id="a">a</button><button id="b">b</button></Dialog></div>, host));
    return { opener, onClose };
  }

  it("moves focus in, traps Tab, inerts the background and restores focus", () => {
    const { opener } = open();
    const [a, b] = ["a", "b"].map((id) => host.querySelector<HTMLElement>(`#${id}`)!);
    expect(document.activeElement).toBe(a);
    expect(host.querySelector("#app")?.hasAttribute("inert")).toBe(true);
    b!.focus();
    press(b!, "Tab");
    expect(document.activeElement).toBe(a);
    press(a!, "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(b);
    act(() => render(null, host));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("closes on Escape without letting the event reach other listeners", () => {
    const { opener, onClose } = open();
    const outer = vi.fn();
    window.addEventListener("keydown", outer);
    press(document.activeElement!, "Escape");
    window.removeEventListener("keydown", outer);
    expect(onClose).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
    opener.remove();
  });
});

describe("Tabs", () => {
  const tabs = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ] as const;

  function mount(onChange = vi.fn()) {
    act(() => render(<Tabs label="x" value="b" tabs={tabs} onChange={onChange} idPrefix="v" />, host));
    return { onChange, buttons: [...host.querySelectorAll<HTMLElement>('[role="tab"]')] };
  }

  it("uses a roving tabindex and wires aria-controls", () => {
    const { buttons } = mount();
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    expect(buttons[0]?.id).toBe("v-a");
    expect(buttons[0]?.getAttribute("aria-controls")).toBe("v-panel");
  });

  it.each([
    ["ArrowRight", "c"],
    ["ArrowLeft", "a"],
    ["Home", "a"],
    ["End", "c"],
  ])("%s selects and focuses %s", (key, expected) => {
    const { buttons, onChange } = mount();
    press(buttons[1]!, key);
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(document.activeElement).toBe(buttons[expected.charCodeAt(0) - 97]);
  });
});
