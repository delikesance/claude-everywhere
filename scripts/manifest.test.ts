import { describe, expect, it } from "vitest";
import { auditManifest } from "./audit-permissions.mjs";
import { buildManifest } from "./manifest.mjs";

const connectSrc = (manifest: { content_security_policy: { extension_pages: string } }) =>
  manifest.content_security_policy.extension_pages.split("; ").find((directive) => directive.startsWith("connect-src"));

describe("extension CSP", () => {
  it("lets the background download https PDFs and nothing wider (D-017)", () => {
    const manifest = buildManifest({ version: "1.0.0", testOrigin: undefined });
    expect(connectSrc(manifest)).toBe("connect-src https://api.anthropic.com https:");
    expect(connectSrc(manifest)).not.toMatch(/\*|http:|file:/);
  });

  it("passes the permission audit in production and keeps the test origin out of it", () => {
    expect(auditManifest(buildManifest({ version: "1.0.0", testOrigin: undefined }))).toEqual([]);
    expect(auditManifest(buildManifest({ version: "1.0.0", testOrigin: "http://127.0.0.1:8787" }))).not.toEqual([]);
  });
});
