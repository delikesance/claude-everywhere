import { render } from "preact";
import { expect, it } from "vitest";
import { t } from "../../shared/i18n";
import { ToolTrace } from "./ToolTrace";

it("lists each tool call with its name and result size", () => {
  const root = document.createElement("div");
  render(<ToolTrace calls={[{ name: "page_read", inputSummary: "{}", resultChars: 42 }]} />, root);
  const items = root.querySelectorAll("li");
  expect(items).toHaveLength(1);
  expect(items[0]?.textContent).toContain("page_read");
  expect(items[0]?.textContent).toContain(t("sidebar_toolChars", { chars: 42 }));
});

it("renders one row per call in order", () => {
  const root = document.createElement("div");
  render(
    <ToolTrace
      calls={[
        { name: "page_read", inputSummary: "{}", resultChars: 10 },
        { name: "yt_transcript", inputSummary: "{}", resultChars: 20 },
      ]}
    />,
    root,
  );
  const names = [...root.querySelectorAll(".tool-trace__name")].map((el) => el.textContent);
  expect(names).toEqual(["page_read", "yt_transcript"]);
  expect(root.querySelectorAll("li")).toHaveLength(2);
});

it("renders nothing without tool calls", () => {
  const root = document.createElement("div");
  render(<ToolTrace calls={[]} />, root);
  expect(root.querySelector(".tool-trace")).toBeNull();
});
