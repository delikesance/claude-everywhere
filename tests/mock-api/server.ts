import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface MockApi {
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

type Scenario = "normal" | "slow" | "rate_limit" | "overloaded" | "refusal" | "max_tokens" | "drop" | "unsafe_markdown";

const DEFAULT_PORT = 8787;
const INVALID_KEY = "sk-ant-invalid";
const SCENARIO_MARKER = /\[scenario:(\w+)\]/;
const NORMAL_DELAY_MS = 15;
const SLOW_DELAY_MS = 250;
const RETRY_AFTER_SEC = 7;
const DROP_AFTER_DELTAS = 1;
const DELTAS = ["Bonjour", " depuis", " le", " serveur", " factice."];
const UNSAFE_DELTAS = [
  "Titre sûr <script>window.pwned = 1</script>\n\n",
  "<img src=x onerror=\"window.pwned = 2\"> ",
  "[lien](javascript:window.pwned=3) et [sain](https://example.org/ok)",
];
const USAGE = { input_tokens: 12, output_tokens: 5 };
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "retry-after, request-id",
};
const ERROR_BODIES: Record<string, { status: number; type: string; headers?: Record<string, string> }> = {
  invalid_key: { status: 401, type: "authentication_error" },
  rate_limit: { status: 429, type: "rate_limit_error", headers: { "retry-after": String(RETRY_AFTER_SEC) } },
  overloaded: { status: 529, type: "overloaded_error" },
};
const STOP_REASONS: Partial<Record<Scenario, string>> = { refusal: "refusal", max_tokens: "max_tokens" };

const deltasFor = (scenario: Scenario) => (scenario === "unsafe_markdown" ? UNSAFE_DELTAS : DELTAS);

const sleep =(ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function lastUserText(body: unknown): string {
  const messages = (body as { messages?: { role: string; content: unknown }[] } | null)?.messages ?? [];
  const content = messages.filter((m) => m.role === "user").at(-1)?.content;
  return typeof content === "string" ? content : JSON.stringify(content ?? "");
}

function pickScenario(apiKey: string | undefined, body: unknown): Scenario | "invalid_key" {
  if (apiKey === INVALID_KEY) return "invalid_key";
  const name = SCENARIO_MARKER.exec(lastUserText(body))?.[1];
  return (name ?? "normal") as Scenario;
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { ...CORS_HEADERS, "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, scenario: string): void {
  const { status, type, headers } = ERROR_BODIES[scenario] as (typeof ERROR_BODIES)[string];
  sendJson(res, status, { type: "error", error: { type, message: `mock ${scenario}` } }, headers);
}

const messageShell = (model: string, stopReason: string | null, usage: object) => ({
  id: "msg_mock",
  type: "message",
  role: "assistant",
  model,
  content: [],
  stop_reason: stopReason,
  stop_sequence: null,
  usage,
});

function sendEvent(res: ServerResponse, type: string, data: object): void {
  res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
}

async function streamMessage(res: ServerResponse, model: string, scenario: Scenario): Promise<void> {
  res.writeHead(200, { ...CORS_HEADERS, "content-type": "text/event-stream", "cache-control": "no-cache" });
  sendEvent(res, "message_start", { message: messageShell(model, null, { input_tokens: USAGE.input_tokens, output_tokens: 0 }) });
  sendEvent(res, "content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  const delay = scenario === "slow" ? SLOW_DELAY_MS : NORMAL_DELAY_MS;
  for (const [position, text] of deltasFor(scenario).entries()) {
    await sleep(delay);
    if (scenario === "drop" && position === DROP_AFTER_DELTAS) return void res.socket?.destroy();
    sendEvent(res, "content_block_delta", { index: 0, delta: { type: "text_delta", text } });
  }
  sendEvent(res, "content_block_stop", { index: 0 });
  sendEvent(res, "message_delta", {
    delta: { stop_reason: STOP_REASONS[scenario] ?? "end_turn", stop_sequence: null },
    usage: { output_tokens: USAGE.output_tokens },
  });
  sendEvent(res, "message_stop", {});
  res.end();
}

function sendWholeMessage(res: ServerResponse, model: string, scenario: Scenario): void {
  const message = messageShell(model, STOP_REASONS[scenario] ?? "end_turn", USAGE);
  sendJson(res, 200, { ...message, content: [{ type: "text", text: deltasFor(scenario).join("") }] });
}

async function handleMessages(res: ServerResponse, record: RecordedRequest): Promise<void> {
  const body = record.body as { stream?: boolean; model?: string } | null;
  const scenario = pickScenario(record.headers["x-api-key"] as string | undefined, body);
  if (!record.headers["anthropic-version"]) return sendJson(res, 400, { type: "error", error: { type: "invalid_request_error", message: "missing anthropic-version" } });
  if (scenario in ERROR_BODIES) return sendError(res, scenario);
  const model = body?.model ?? "mock";
  if (body?.stream) return streamMessage(res, model, scenario as Scenario);
  sendWholeMessage(res, model, scenario as Scenario);
}

export function startMockApi(port = 0): Promise<MockApi> {
  const requests: RecordedRequest[] = [];
  const server: Server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (req.method === "OPTIONS") return void res.writeHead(204, CORS_HEADERS).end();
    if (req.method === "GET" && url === "/__requests") return sendJson(res, 200, requests);
    if (req.method === "POST" && url === "/__reset") {
      requests.length = 0;
      return sendJson(res, 200, {});
    }
    const record: RecordedRequest = { method: req.method ?? "", url, headers: req.headers, body: parseJson(await readBody(req)) };
    requests.push(record);
    if (req.method === "POST" && url.startsWith("/v1/messages")) return handleMessages(res, record);
    sendJson(res, 404, { type: "error", error: { type: "not_found_error", message: "not found" } });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const { port: boundPort } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${boundPort}`,
        requests,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await startMockApi(Number(process.env["MOCK_PORT"] ?? DEFAULT_PORT));
  console.log(`mock Messages API listening on ${url}`);
}
