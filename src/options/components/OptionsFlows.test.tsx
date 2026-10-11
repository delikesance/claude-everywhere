import { beforeEach, expect, it, vi } from "vitest";
import { byText, click, initFrench, installBrowserStub, mount, settle, typeInto } from "../../library-ui/testing";
import { getSettings } from "../../shared/settings";
import { ApiKeyField } from "./ApiKeyField";
import { OnboardingFlow } from "./OnboardingFlow";
import { PermissionToggle } from "./PermissionToggle";

const KEY = "sk-ant-api03-secretvalue1234";

interface BrowserDouble {
  permissions: { contains: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn> };
  runtime: { sendMessage: ReturnType<typeof vi.fn> };
}

function stubBrowser(options: { granted?: boolean; response?: unknown } = {}): BrowserDouble {
  const permissions = { contains: vi.fn(async () => false), request: vi.fn(async () => options.granted ?? true) };
  const runtime = { sendMessage: vi.fn(async () => options.response ?? { ok: true, value: { valid: true } }) };
  installBrowserStub({ permissions, runtime });
  return { permissions, runtime };
}

async function submitKey(page: HTMLElement, key = KEY): Promise<void> {
  await typeInto(page.querySelector<HTMLInputElement>("input[type=password]")!, key);
  await click(page.querySelector("button[type=submit]"));
}

beforeEach(async () => {
  document.body.replaceChildren();
  await initFrench();
});

it("stores a valid key and only shows its mask", async () => {
  stubBrowser();
  const onOutcome = vi.fn();
  const page = await mount(<ApiKeyField storedKey={null} onOutcome={onOutcome} />);

  await submitKey(page);

  expect(onOutcome).toHaveBeenCalledWith("valid");
  expect((await getSettings()).apiKey).toBe(KEY);
  expect(page.querySelector<HTMLInputElement>("input")!.value).toBe("");
  expect(page.textContent).not.toContain(KEY);
});

it("stores the key with a warning when the API is rate limited", async () => {
  stubBrowser({ response: { ok: false, error: { kind: "rate_limit" } } });
  const page = await mount(<ApiKeyField storedKey={null} onOutcome={vi.fn()} />);

  await submitKey(page);

  expect((await getSettings()).apiKey).toBe(KEY);
  expect(page.textContent).toContain("momentanément limitée");
});

it.each([
  ["auth", "refusée"],
  ["network", "injoignable"],
])("does not store the key on a %s error", async (kind, message) => {
  stubBrowser({ response: { ok: false, error: { kind } } });
  const page = await mount(<ApiKeyField storedKey={null} onOutcome={vi.fn()} />);

  await submitKey(page);

  expect((await getSettings()).apiKey).toBeNull();
  expect(page.textContent).toContain(message);
});

it("does not validate the key when the host permission is refused", async () => {
  const { runtime } = stubBrowser({ granted: false });
  const page = await mount(<ApiKeyField storedKey={null} onOutcome={vi.fn()} />);

  await submitKey(page);

  expect(runtime.sendMessage).not.toHaveBeenCalled();
  expect((await getSettings()).apiKey).toBeNull();
  expect(page.textContent).toContain("autorisation");
});

it("asks for confirmation before clearing the key", async () => {
  stubBrowser();
  const onClear = vi.fn();
  const page = await mount(<ApiKeyField storedKey={KEY} onOutcome={vi.fn()} onClear={onClear} />);
  expect(page.textContent).toContain("sk-ant-…1234");

  await click(byText(page, "button", "Effacer"));
  expect(onClear).not.toHaveBeenCalled();
  await click(byText(page, "button", "Oui, effacer"));

  expect(onClear).toHaveBeenCalledTimes(1);
});

it("leaves the toggle off when the permission is refused", async () => {
  const { permissions } = stubBrowser({ granted: false });
  const onChange = vi.fn(async () => undefined);
  const page = await mount(<PermissionToggle label="Barre" checked={false} onChange={onChange} />);

  await click(page.querySelector("[role=switch]"));

  expect(permissions.request).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
  expect(onChange).not.toHaveBeenCalled();
  expect(page.textContent).toContain("refusée");
});

it("enables the toggle once the permission is granted and disables it without asking", async () => {
  const { permissions } = stubBrowser();
  const onChange = vi.fn(async () => undefined);
  const off = await mount(<PermissionToggle label="Barre" checked={false} onChange={onChange} />);
  await click(off.querySelector("[role=switch]"));
  expect(onChange).toHaveBeenLastCalledWith(true);

  permissions.request.mockClear();
  const on = await mount(<PermissionToggle label="Barre" checked onChange={onChange} />);
  await click(on.querySelector("[role=switch]"));
  expect(onChange).toHaveBeenLastCalledWith(false);
  expect(permissions.request).not.toHaveBeenCalled();
});

it("walks the onboarding in three steps and marks it done", async () => {
  stubBrowser();
  const page = await mount(<OnboardingFlow />);
  expect(page.textContent).toContain("Étape 1 sur 3");

  await click(byText(page, "button", "Continuer"));
  expect(page.textContent).toContain("Étape 2 sur 3");
  await submitKey(page);
  await settle(10);

  expect(page.textContent).toContain("Étape 3 sur 3");
  expect((await getSettings()).onboardingDone).toBe(true);

  await click(byText(page, "button", "Ouvrir le panneau"));
  const { sidebarAction } = (globalThis as unknown as { browser: typeof browser }).browser;
  expect(sidebarAction.open).toHaveBeenCalledTimes(1);
});
