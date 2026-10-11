import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = {
  permissions: ["activeTab", "contextMenus", "scripting", "storage"],
  host_permissions: ["https://api.anthropic.com/*"],
  optional_host_permissions: ["<all_urls>"],
  csp:
    "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; " +
    "connect-src https://api.anthropic.com; base-uri 'none'; form-action 'none'",
};
const FORBIDDEN_TOP_LEVEL = ["content_scripts"];
const LOCALHOST = /localhost|127\.0\.0\.1|\[::1\]/;

const sameSet = (actual, expected) =>
  Array.isArray(actual) && actual.length === expected.length && expected.every((item) => actual.includes(item));

/** Returns the list of violations; empty means the manifest matches the allowlist. */
export function auditManifest(manifest) {
  const problems = [];
  const csp = manifest.content_security_policy?.extension_pages;
  for (const field of ["permissions", "host_permissions", "optional_host_permissions"]) {
    if (!sameSet(manifest[field], EXPECTED[field])) {
      problems.push(`${field} must equal ${JSON.stringify(EXPECTED[field])}, got ${JSON.stringify(manifest[field])}`);
    }
  }
  if (csp !== EXPECTED.csp) problems.push(`CSP extension_pages must equal "${EXPECTED.csp}", got "${csp}"`);
  for (const field of FORBIDDEN_TOP_LEVEL) {
    if (field in manifest) problems.push(`${field} is forbidden`);
  }
  const grants = JSON.stringify([manifest.permissions, manifest.host_permissions, manifest.optional_host_permissions, csp]);
  if (LOCALHOST.test(grants)) problems.push("localhost must not appear in permissions or CSP");
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = process.argv[2] ?? "dist";
  const manifest = JSON.parse(readFileSync(join(distDir, "manifest.json"), "utf8"));
  const problems = auditManifest(manifest);
  if (problems.length > 0) {
    console.error(problems.map((problem) => `audit: ${problem}`).join("\n"));
    process.exit(1);
  }
  console.log(`audit: ${distDir}/manifest.json matches the permission allowlist`);
}
