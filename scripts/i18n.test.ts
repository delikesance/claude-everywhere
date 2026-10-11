import { describe, expect, it } from "vitest";
import { loadMergedLocales, mergeLocales as mergeUntyped, toMessagesJson } from "./i18n.mjs";

type Catalogs = Record<"fr" | "en", Record<string, string>>;
const mergeLocales = mergeUntyped as (modules: Record<string, Catalogs>) => Catalogs;

const pair = (fr: Record<string, string>, en: Record<string, string> = fr) => ({ fr, en });

describe("mergeLocales", () => {
  it("merges modules and sorts keys", () => {
    const merged = mergeLocales({ b: pair({ b_z: "z", b_a: "a" }), a: pair({ a_x: "x" }) });
    expect(Object.keys(merged.fr)).toEqual(["a_x", "b_a", "b_z"]);
  });

  it("fails when a key is missing in en", () => {
    expect(() => mergeLocales({ a: pair({ a_x: "x", a_y: "y" }, { a_x: "x" }) })).toThrow(/a_y.*missing in en/);
  });

  it("fails when a key is missing in fr", () => {
    expect(() => mergeLocales({ a: pair({ a_x: "x" }, { a_x: "x", a_y: "y" }) })).toThrow(/a_y.*missing in fr/);
  });

  it("fails on a key without the module prefix", () => {
    expect(() => mergeLocales({ a: pair({ other_x: "x" }) })).toThrow(/must start with "a_"/);
  });

  it("fails on a key outside the messages.json alphabet", () => {
    expect(() => mergeLocales({ a: pair({ "a_x.y": "x" }) })).toThrow(/invalid key/);
  });

  it("fails on a key claimed by two modules", () => {
    expect(() => mergeLocales({ a: pair({ a_b_x: "x" }), a_b: pair({ a_b_x: "x" }) })).toThrow(/duplicate key "a_b_x"/);
  });

  it("wraps messages for _locales", () => {
    expect(toMessagesJson({ a_x: "x" })).toEqual({ a_x: { message: "x" } });
  });
});

describe("module locales on disk", () => {
  it("merge without error and include the shared catalog", () => {
    const merged = loadMergedLocales() as Catalogs;
    expect(merged.fr["shared_extName"]).toBeTruthy();
    expect(Object.keys(merged.fr)).toEqual(Object.keys(merged.en));
  });
});
