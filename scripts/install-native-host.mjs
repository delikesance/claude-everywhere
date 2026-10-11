import { execFileSync } from "node:child_process";
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
  win32: {
    manifestDir: join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "claude-everywhere"),
    launcherDir: join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "claude-everywhere"),
  },
};
const isWindows = platform() === "win32";

const dirs = PATHS[platform()];
if (!dirs) throw new Error(`plateforme non prise en charge : ${platform()}`);

mkdirSync(dirs.launcherDir, { recursive: true });
mkdirSync(dirs.manifestDir, { recursive: true });

const launcher = join(dirs.launcherDir, isWindows ? `${NATIVE_HOST_NAME}.cmd` : NATIVE_HOST_NAME);
writeFileSync(
  launcher,
  isWindows
    ? `@echo off\r\n"${process.execPath}" "${hostScript}"\r\n`
    : `#!/bin/sh\nexec "${process.execPath}" "${hostScript}"\n`,
);
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

if (isWindows) {
  const registryKey = `HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
  execFileSync("reg", ["add", registryKey, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"]);
}

console.log(`Manifeste natif installé : ${manifestPath}`);
