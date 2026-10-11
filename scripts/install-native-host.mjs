import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GECKO_ID } from "./manifest.mjs";

const NATIVE_HOST_NAME = "claude_everywhere";
const root = resolve(fileURLToPath(import.meta.url), "..", "..");
const hostScript = join(root, "native-host", "claude-host.mjs");

const PATHS = {
  darwin: {
    manifestDir: join(homedir(), "Library", "Application Support", "Mozilla", "NativeMessagingHosts"),
    launcherDir: join(homedir(), "Library", "Application Support", "claude-everywhere"),
  },
  linux: {
    manifestDir: join(homedir(), ".mozilla", "native-messaging-hosts"),
    launcherDir: join(homedir(), ".local", "share", "claude-everywhere"),
  },
};

const dirs = PATHS[platform()];
if (!dirs) throw new Error(`plateforme non prise en charge : ${platform()}`);

mkdirSync(dirs.launcherDir, { recursive: true });
mkdirSync(dirs.manifestDir, { recursive: true });

const launcher = join(dirs.launcherDir, NATIVE_HOST_NAME);
writeFileSync(launcher, `#!/bin/sh\nexec "${process.execPath}" "${hostScript}"\n`);
chmodSync(launcher, 0o755);

const manifest = {
  name: NATIVE_HOST_NAME,
  description: "Claude Everywhere: relaie les réponses via le compte Claude Code local",
  path: launcher,
  type: "stdio",
  allowed_extensions: [GECKO_ID],
};
const manifestPath = join(dirs.manifestDir, `${NATIVE_HOST_NAME}.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Manifeste natif installé : ${manifestPath}`);
