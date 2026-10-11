#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { MessageReader, encodeMessage } from "./framing.mjs";
import { classifyFailure, mapStreamEvent, readJsonLines } from "./stream-events.mjs";

const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const running = new Map();

const send = (message) => process.stdout.write(encodeMessage(message));

const handlers = {
  start: (request) => start(request),
  cancel: ({ requestId }) => cancel(requestId),
  ping: () => send({ type: "pong", version: VERSION }),
};

const reader = new MessageReader((message) => handlers[message.type]?.(message));
process.stdin.on("data", (chunk) => reader.push(chunk));
process.stdin.on("end", () => [...running.keys()].forEach(cancel));

function start({ requestId, model, system, prompt }) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const child = spawn("claude", claudeArgs(model, system), { env, stdio: ["pipe", "pipe", "pipe"] });
  const run = { child, settled: false, stderr: "" };
  running.set(requestId, run);

  readJsonLines(child.stdout, (event) => {
    const message = mapStreamEvent(event, requestId);
    if (!message) return;
    run.settled ||= message.type !== "delta";
    send(message);
  });
  child.stderr.on("data", (chunk) => (run.stderr += chunk));
  child.on("error", (error) => settle(requestId, run, error.code === "ENOENT" ? "not_installed" : "failed", error.message));
  child.on("close", (code) => {
    if (code !== 0) settle(requestId, run, classifyFailure(run.stderr), run.stderr.trim() || `exit ${code}`);
    else settle(requestId, run);
  });
  child.stdin.end(prompt);
}

function settle(requestId, run, code, message) {
  running.delete(requestId);
  if (run.settled) return;
  run.settled = true;
  if (code) send({ type: "error", requestId, code, message });
  else send({ type: "done", requestId, stopReason: "other", inputTokens: 0, outputTokens: 0 });
}

function cancel(requestId) {
  const run = running.get(requestId);
  if (!run) return;
  run.settled = true;
  running.delete(requestId);
  run.child.kill();
}

function claudeArgs(model, system) {
  return [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model",
    model,
    "--system-prompt",
    system,
    "--tools",
    "",
    "--no-session-persistence",
  ];
}
