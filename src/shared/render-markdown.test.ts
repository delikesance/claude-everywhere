import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "./render-markdown";

const FORBIDDEN_TAGS = "script, iframe, style, svg, img, object, embed, form, input, link, meta";

function render(markdown: string): HTMLElement {
  const host = document.createElement("div");
  host.append(renderSafeMarkdown(markdown));
  return host;
}

function expectInert(host: HTMLElement): void {
  expect(host.querySelectorAll(FORBIDDEN_TAGS)).toHaveLength(0);
  for (const element of host.querySelectorAll("*")) {
    const names = element.getAttributeNames();
    expect(names.filter((name) => name.startsWith("on"))).toEqual([]);
    const href = element.getAttribute("href");
    if (href !== null) expect(href).toMatch(/^(https?|mailto):/i);
  }
}

describe("renderSafeMarkdown", () => {
  it.each([
    ["script tag", "<script>alert(1)</script>"],
    ["onerror handler", '<img src=x onerror="alert(1)">'],
    ["javascript href", "[x](javascript:alert(1))"],
    ["javascript href html", '<a href="javascript:alert(1)">x</a>'],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["style", "<style>body{display:none}</style>"],
    ["svg", '<svg onload="alert(1)"><circle/></svg>'],
    ["data uri link", "[x](data:text/html;base64,PHNjcmlwdD4=)"],
    ["nested markdown in html", "<div>**<script>alert(1)</script>**</div>"],
    ["html in a list", "- <img src=x onerror=alert(1)>"],
  ])("neutralises %s", (_name, markdown) => {
    expectInert(render(markdown));
  });

  it("shows raw html as text instead of dropping it", () => {
    expect(render("<script>alert(1)</script>").textContent).toContain("<script>alert(1)</script>");
  });

  it("renders regular markdown", () => {
    const host = render("# Title\n\n**bold** and `code`\n\n- one\n- two");
    expect(host.querySelector("h1")?.textContent).toBe("Title");
    expect(host.querySelector("strong")?.textContent).toBe("bold");
    expect(host.querySelectorAll("li")).toHaveLength(2);
  });

  it("hardens external links", () => {
    const link = render("[site](https://example.com)").querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("turns images into links so nothing loads remotely", () => {
    const host = render("![alt](https://example.com/p.png)");
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("a")?.textContent).toBe("alt");
  });
});
