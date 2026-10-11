import { render } from "preact";
import { describe, expect, it, vi } from "vitest";
import { planContext } from "../../api/budget";
import type { ContextItem } from "../../shared/types";
import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import { SendSlip } from "./SendSlip";

const item: ContextItem = {
  id: "page-1",
  kind: "page",
  title: "Doc",
  url: null,
  text: "hello",
  included: true,
  status: "ready",
};

const { plan } = vi.hoisted(() => ({ plan: { value: null as unknown } }));

vi.mock("../state/plan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/plan")>()),
  currentPlan: plan,
}));

function renderWithToolChars(toolChars: number | undefined): HTMLElement {
  const base = planContext([item], "question", "claude-haiku-5-5");
  plan.value = { ...base, bordereau: { ...base.bordereau, toolChars } };
  const root = document.createElement("div");
  render(<SendSlip />, root);
  return root;
}

describe("SendSlip tool results line", () => {
  it("shows the tool result size when tools produced output", () => {
    const root = renderWithToolChars(42);
    expect(root.textContent).toContain(t("sidebar_slipTools", { chars: formatChars(42) }));
  });

  it("hides the tool result line without tool output", () => {
    const root = renderWithToolChars(0);
    expect(root.textContent).not.toContain(t("sidebar_slipTools", { chars: formatChars(0) }));
    expect(root.textContent).not.toContain(t("sidebar_slipTools", { chars: formatChars(42) }));
  });
});
