import { render } from "preact";
import { expect, it } from "vitest";
import { Markdown } from "./Markdown";

it("renders sanitized markdown into the host element", () => {
  const root = document.createElement("div");
  render(<Markdown source="**x** <script>1</script>" />, root);
  expect(root.querySelector("strong")?.textContent).toBe("x");
  expect(root.querySelector("script")).toBeNull();
});
