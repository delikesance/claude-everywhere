import { beforeEach, describe, expect, it } from "vitest";
import { readSelection } from "./injected/read-selection";

function selectNodeText(doc: Document, node: Node): void {
  const range = doc.createRange();
  range.selectNodeContents(node);
  doc.getSelection()?.removeAllRanges();
  doc.getSelection()?.addRange(range);
}

describe("readSelection", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head><title>Sel</title></head><body><p id='p'>Chosen words</p></body>";
    document.getSelection()?.removeAllRanges();
  });

  it("returns the selected page text", () => {
    selectNodeText(document, document.getElementById("p")!);
    expect(readSelection(document)).toMatchObject({ sourceType: "selection", markdown: "Chosen words", title: "Sel" });
  });

  it("reads the selection inside a textarea", () => {
    const area = document.createElement("textarea");
    area.value = "alpha beta gamma";
    document.body.append(area);
    area.focus();
    area.setSelectionRange(6, 10);
    expect(readSelection(document)).toMatchObject({ markdown: "beta" });
  });

  it("ignores password fields", () => {
    const input = document.createElement("input");
    input.type = "password";
    input.value = "hunter2";
    document.body.append(input);
    input.focus();
    input.select();
    expect(readSelection(document)).toMatchObject({ kind: "empty" });
  });

  it("reads the selection inside a same-origin iframe", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const inner = frame.contentDocument!;
    inner.body.innerHTML = "<p>Framed text</p>";
    selectNodeText(inner, inner.body.firstChild!);
    expect(readSelection(document)).toMatchObject({ markdown: "Framed text" });
  });

  it("reports an empty selection", () => {
    expect(readSelection(document)).toMatchObject({ kind: "empty" });
  });
});
