import { execFileSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Builder } from "selenium-webdriver";
import type { WebDriver } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { startMockApi } from "../mock-api/server";
import type { MockApi, RecordedRequest } from "../mock-api/server";

/** selenium-webdriver ships installAddon on its Firefox driver but not in the shared WebDriver type. */
type FirefoxDriver = WebDriver & { installAddon(path: string, temporary?: boolean): Promise<string> };

const ROOT = resolve(import.meta.dirname, "../..");
const ADDON_ID = "claude-everywhere@angelo.clauin";
const EXTENSION_UUID = "7c1d2f4e-5b6a-4c8d-9e0f-1a2b3c4d5e6f";
const MOCK_PORT = Number(process.env["MOCK_PORT"] ?? 8787);
const FIXTURES_DIR = join(ROOT, "tests/fixtures");
const CONTENT_TYPES: Record<string, string> = { html: "text/html; charset=utf-8", pdf: "application/pdf" };

export const API_KEY = "sk-ant-api03-e2e-secret-key-0042";

export interface Harness {
  driver: WebDriver;
  mock: MockApi;
  fixture: (name: string) => string;
  mockPdf: (name: string) => string;
  extension: (page: string) => string;
  downloadsDir: string;
  browserLog: () => string;
  resetMock: () => void;
  close: () => Promise<void>;
}

function buildXpi(): string {
  const outDir = mkdtempSync(join(tmpdir(), "ce-e2e-"));
  const webExt = join(ROOT, "node_modules/.bin/web-ext");
  execFileSync(webExt, ["build", "-s", join(ROOT, "dist-test"), "-a", outDir, "--overwrite-dest"], { stdio: "ignore" });
  const [zip] = readdirSync(outDir).filter((name) => name.endsWith(".zip"));
  return join(outDir, zip!);
}

function serveFixtures(): Promise<Server> {
  const server = createServer((req, res) => {
    const name = (req.url ?? "/").slice(1);
    try {
      const body = readFileSync(join(FIXTURES_DIR, name));
      res.writeHead(200, { "content-type": CONTENT_TYPES[name.split(".").at(-1) ?? ""] ?? "text/plain" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

function firefoxOptions(downloadsDir: string): firefox.Options {
  const options = new firefox.Options().addArguments("-headless");
  options.setPreference("extensions.webextensions.uuids", JSON.stringify({ [ADDON_ID]: EXTENSION_UUID }));
  options.setPreference("extensions.webextOptionalPermissionPrompts", false);
  options.setPreference("intl.accept_languages", "fr");
  options.setPreference("browser.download.folderList", 2);
  options.setPreference("browser.download.dir", downloadsDir);
  options.setPreference("browser.download.useDownloadDir", true);
  options.setPreference("browser.helperApps.neverAsk.saveToDisk", "text/markdown,application/json,text/plain");
  return options;
}

export async function startHarness(): Promise<Harness> {
  const mock = await startMockApi(MOCK_PORT);
  const fixtures = await serveFixtures();
  const workDir = mkdtempSync(join(tmpdir(), "ce-e2e-run-"));
  const downloadsDir = join(workDir, "downloads");
  const logPath = join(workDir, "browser.log");
  const logFd = openSync(logPath, "w");
  const service = new firefox.ServiceBuilder().addArguments("--allow-system-access").setStdio(["ignore", logFd, logFd]);
  const driver = await new Builder().forBrowser("firefox").setFirefoxOptions(firefoxOptions(downloadsDir)).setFirefoxService(service).build();
  await (driver as FirefoxDriver).installAddon(buildXpi(), true);
  const fixturePort = (fixtures.address() as AddressInfo).port;
  return {
    driver,
    mock,
    mockPdf: (name) => `${mock.url}/fixtures/${name}`,
    fixture: (name) => `http://127.0.0.1:${fixturePort}/${name}`,
    extension: (page) => `moz-extension://${EXTENSION_UUID}/${page}`,
    downloadsDir,
    browserLog: () => readFileSync(logPath, "utf8"),
    resetMock: () => void (mock.requests.length = 0),
    close: async () => {
      await driver.quit();
      closeSync(logFd);
      fixtures.close();
      await mock.close();
    },
  };
}

export type { RecordedRequest };
