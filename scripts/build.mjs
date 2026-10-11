import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMergedLocales, toMessagesJson, writeMessageKeys } from "./i18n.mjs";
import { buildManifest } from "./manifest.mjs";
import {
  BACKGROUND_ENTRY,
  DESIGN_CSS,
  ICONS_DIR,
  PAGE_ENTRIES,
  PDF_WORKER,
  SCRIPT_ENTRIES,
} from "./targets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isTest = process.argv.includes("--test");
const mockPort = process.env.MOCK_PORT ?? "8787";
const testOrigin = isTest ? `http://127.0.0.1:${mockPort}` : undefined;
const outDir = join(root, isTest ? "dist-test" : "dist");

const src = (path) => join(root, "src", path);
const out = (path) => join(outDir, path);
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const commonOptions = {
  bundle: true,
  outdir: outDir,
  legalComments: "none",
  charset: "utf8",
  target: "firefox140",
  jsx: "automatic",
  jsxImportSource: "preact",
  minify: !isTest,
  sourcemap: isTest,
  define: {
    __API_BASE_URL__: JSON.stringify(testOrigin ?? "https://api.anthropic.com"),
    __TEST__: JSON.stringify(isTest),
  },
  logLevel: "warning",
};

async function bundleScripts() {
  await build({
    ...commonOptions,
    format: "esm",
    entryPoints: [BACKGROUND_ENTRY, ...PAGE_ENTRIES].map(({ in: input, out: name }) => ({ in: src(input), out: name })),
  });
  await build({
    ...commonOptions,
    format: "iife",
    entryPoints: SCRIPT_ENTRIES.map(({ in: input, out: name }) => ({ in: src(input), out: name })),
  });
}

function copyStatic() {
  for (const { html, out: name } of PAGE_ENTRIES) cpSync(src(html), out(`${name}.html`));
  for (const file of DESIGN_CSS) cpSync(join(root, "design", file), out(`css/${file}`));
  cpSync(join(root, ICONS_DIR), out("icons"), { recursive: true });
  cpSync(join(root, PDF_WORKER.from), out(PDF_WORKER.to));
}

function writeLocales() {
  const catalogs = loadMergedLocales(join(root, "src"));
  writeMessageKeys(catalogs.fr);
  for (const locale of Object.keys(catalogs)) {
    writeJson(out(`locales/${locale}.json`), catalogs[locale]);
    writeJson(out(`_locales/${locale}/messages.json`), toMessagesJson(catalogs[locale]));
  }
}

function writeManifest() {
  const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  writeJson(out("manifest.json"), buildManifest({ version, testOrigin }));
}

rmSync(outDir, { recursive: true, force: true });
writeLocales();
await bundleScripts();
copyStatic();
writeManifest();
