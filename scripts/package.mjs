import { copyFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, "artifacts");
const webExt = join(root, "node_modules", ".bin", process.platform === "win32" ? "web-ext.cmd" : "web-ext");

rmSync(artifacts, { recursive: true, force: true });
execFileSync(webExt, ["build", "-s", join(root, "dist"), "-a", artifacts], { stdio: "inherit", shell: process.platform === "win32" });

const [zip] = readdirSync(artifacts).filter((name) => name.endsWith(".zip"));
if (!zip) throw new Error("web-ext n'a produit aucune archive .zip");
copyFileSync(join(artifacts, zip), join(artifacts, zip.replace(/\.zip$/, ".xpi")));

for (const name of readdirSync(artifacts)) console.log(`${name}\t${statSync(join(artifacts, name)).size} octets`);
