import { mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY_PATTERN = /^[A-Za-z0-9_]+$/;
const LOCALES = ["fr", "en"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const keyPrefix = (moduleName) => `${moduleName.replaceAll("-", "_")}_`;

const sortedEntries = (record) => Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

function validateModule(moduleName, catalogs) {
  const prefix = keyPrefix(moduleName);
  const [reference, other] = LOCALES.map((locale) => Object.keys(catalogs[locale]));
  for (const locale of LOCALES) {
    for (const key of Object.keys(catalogs[locale])) {
      if (!KEY_PATTERN.test(key)) throw new Error(`${moduleName}/${locale}: invalid key "${key}"`);
      if (!key.startsWith(prefix)) throw new Error(`${moduleName}/${locale}: key "${key}" must start with "${prefix}"`);
    }
  }
  for (const key of reference) {
    if (!other.includes(key)) throw new Error(`${moduleName}: key "${key}" missing in en`);
  }
  for (const key of other) {
    if (!reference.includes(key)) throw new Error(`${moduleName}: key "${key}" missing in fr`);
  }
}

/** modules: { [moduleName]: { fr: {key: text}, en: {key: text} } } -> { fr: {key: text}, en: {key: text} } */
export function mergeLocales(modules) {
  const merged = Object.fromEntries(LOCALES.map((locale) => [locale, {}]));
  const owners = new Map();
  for (const [moduleName, catalogs] of Object.entries(modules).sort(([a], [b]) => (a < b ? -1 : 1))) {
    validateModule(moduleName, catalogs);
    for (const key of Object.keys(catalogs.fr)) {
      if (owners.has(key)) throw new Error(`duplicate key "${key}" in ${owners.get(key)} and ${moduleName}`);
      owners.set(key, moduleName);
    }
    for (const locale of LOCALES) Object.assign(merged[locale], catalogs[locale]);
  }
  return Object.fromEntries(LOCALES.map((locale) => [locale, Object.fromEntries(sortedEntries(merged[locale]))]));
}

export function toMessagesJson(catalog) {
  return Object.fromEntries(sortedEntries(catalog).map(([key, message]) => [key, { message }]));
}

export function toMessageKeysSource(catalog) {
  const union = Object.keys(catalog).sort().map((key) => `  | "${key}"`).join("\n");
  return `export type MessageKey =\n${union};\n`;
}

export function readModuleLocales(srcDir) {
  const modules = {};
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const localesDir = join(srcDir, entry.name, "locales");
    if (!entry.isDirectory() || !existsSync(localesDir)) continue;
    modules[entry.name] = Object.fromEntries(
      LOCALES.map((locale) => [locale, JSON.parse(readFileSync(join(localesDir, `${locale}.json`), "utf8"))]),
    );
  }
  return modules;
}

export function loadMergedLocales(srcDir = join(root, "src")) {
  return mergeLocales(readModuleLocales(srcDir));
}

export function writeMessageKeys(catalog, outFile = join(root, "src/shared/generated/message-keys.ts")) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, toMessageKeysSource(catalog));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeMessageKeys(loadMergedLocales().fr);
}
