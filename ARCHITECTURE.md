# Architecture - Claude Everywhere (Firefox MV3)

Decisions: `DECISIONS.md` (D-002..D-016). Visual system: `design/DESIGN.md` (never edit `design/`). UI strings are French first, English second.
Rule: one implementer per directory; nobody edits a file outside its directory. Contract changes (`src/shared/`) go through the lead.

## 1. Directory tree and ownership

```
src/shared/       I1  CONTRACT. types.ts messages.ts constants.ts settings.ts permissions.ts messaging.ts i18n.ts errors.ts
                      ui/ (Preact primitives: Button, IconButton, Chip, Slip, Notice, Dialog, Tabs, Seg, Switch, Field, Markdown)
                      render-markdown.ts (renderSafeMarkdown) assets/fonts assets/icons ; css = build copy of design/*.css (generated)
src/api/          I2  index.ts (SDK, background only)  budget.ts (pure, bundle-safe)  prompt.ts  errors.ts(SDK error mapping)
src/extraction/   I3  index.ts (background side)  injected/page.ts  injected/selection.ts (IIFE entries)  pdf.ts  manual.ts
src/library/      I4  index.ts (public API)  db.ts  search.ts  export.ts  import.ts  slug.ts
src/background/   I5  main.ts  chat-port.ts  capture.ts  commands.ts  menus.ts  handoff.ts  overlay-inject.ts  install.ts
src/sidebar/      I6  index.html main.tsx App.tsx state/ (signals) components/ locales/
src/popup/        I7  index.html main.tsx locales/
src/overlay/      I7  main.ts (vanilla, closed shadow root) styles.ts locales/
src/library-ui/   I8  index.html main.tsx locales/
src/options/      I8  options.html onboarding.html main.tsx onboarding.tsx locales/
src/<module>/locales/{fr,en}.json   per-module strings, key prefix = module name (D-014)
src/<module>/*.test.ts              unit tests, owned by the module owner
tests/            I2 (mock-api/) + I8 (e2e/)   mock-api/server.ts  e2e/*.spec.ts  e2e/driver.ts  fixtures/*.html *.pdf  setup/ (vitest)
scripts/          I1  build.mjs manifest.mjs i18n.mjs overlay-css.mjs audit-permissions.mjs package.mjs
manifest.template.json  (I1)  package.json tsconfig.json eslint/vitest configs (I1)
```
Dependency rule: UI modules import only `shared`, `library` (extension pages only), `api/budget`. Only `background` imports `api/index`, `extraction/index`. `overlay` imports only `shared` (non-DOM-framework parts: types, constants, i18n, render-markdown) and `api/budget`; never Preact, never the SDK, never `library`.
Grouping for 8 parallel implementers: I1 shared+scripts, I2 api+mock-api, I3 extraction, I4 library, I5 background, I6 sidebar, I7 popup+overlay, I8 library-ui+options+e2e. I1 lands first (types + messaging stubs); others code against `shared` only.

Exports per module (consumers in brackets):
- shared: everything in section 2 plus `t()`, `initI18n()`, `getSettings()`, `patchSettings()`, `ensureHostPermission()`, `sendRequest()`, `connectChat()`, `renderSafeMarkdown()`, UI primitives [all].
- api: `streamChat`, `validateKey`, `planContext`, `renderPrompt`, `MODEL_META` [background; sidebar/overlay/popup use `planContext`, `renderPrompt` from `api/budget`].
- extraction: `extractTab`, `extractPdf`, `manualPage` [background; sidebar/popup use `manualPage` only via `extraction/manual`, pure].
- library: `Library` interface via `openLibrary()` [background, sidebar, popup, library-ui, options].
- background: no exports; consumes api, extraction, library, shared.

## 2. Shared contract (`src/shared`)

```ts
// constants.ts
export const MODEL_IDS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";
export const DEFAULT_MAX_TOKENS = 4096;
export const CHARS_PER_TOKEN = 4;
export const INPUT_BUDGET_CHARS: Record<ModelId, number> = { /* 600_000 each until verified against docs (comment the source) */ } as never;
export const CHAT_PORT_NAME = "chat";
export const STORAGE_KEYS = { settings: "settings", pendingCapture: "pendingCapture" } as const; // local / session
export const DB_NAME = "claude-everywhere"; export const DB_VERSION = 1;
export const LIBRARY_CHANNEL = "library-changed"; // BroadcastChannel
export const SCHEMA_VERSION = 1;

// types.ts
export type UiLocale = "fr" | "en";
export type Theme = "system" | "light" | "dark";
export interface Settings {
  schemaVersion: 1;
  apiKey: string | null;                 // storage.local only; never sent to content scripts
  defaultModel: ModelId;
  maxTokens: number;
  uiLocale: UiLocale | "auto";
  answerLanguage: "auto" | UiLocale;
  theme: Theme;
  overlayAllSites: boolean;              // needs optional <all_urls>
  sidebarReadsActiveTab: boolean;        // needs optional <all_urls>
  onboardingDone: boolean;
}
export type SourceType = "page" | "selection" | "pdf" | "note";
export interface Artifact {
  id: string; title: string; url: string | null; sourceType: SourceType; tags: string[];
  createdAt: number; updatedAt: number; currentVersionId: string; excerpt: string; charCount: number;
}
export interface ArtifactVersion { id: string; artifactId: string; createdAt: number; markdown: string; contentHash: string }
export interface ArtifactDraft { title: string; url: string | null; sourceType: SourceType; tags: string[]; markdown: string }
export type ArtifactWithContent = Artifact & { markdown: string };
export type ChatRole = "user" | "assistant";
export type StopReason = "end_turn" | "max_tokens" | "refusal" | "stop_sequence" | "other";
export interface ChatMessage {
  id: string; role: ChatRole; text: string; createdAt: number;
  model?: ModelId; stopReason?: StopReason | "interrupted"; bordereau?: Bordereau; // bordereau only on user turns
}
export interface Conversation {
  id: string; title: string; createdAt: number; updatedAt: number; model: ModelId;
  items: ContextItem[]; messages: ChatMessage[];
}
export type ContextKind = "page" | "selection" | "pdf" | "artifact" | "note";
export interface ContextItem {
  id: string; kind: ContextKind; title: string; url: string | null; text: string;
  included: boolean;                     // solid chip vs dashed chip
  status: "ready" | "loading" | "unreadable"; artifactId?: string;
}
export interface BordereauLine { itemId: string; title: string; sentChars: number; totalChars: number }
export interface Bordereau {             // "Ce qui part": N car. envoyes / M total
  lines: BordereauLine[]; sentChars: number; totalChars: number; budgetChars: number;
  truncated: boolean; estimatedTokens: number; model: ModelId;
}
export interface ExtractedPage {
  url: string; title: string; siteName: string | null; lang: string | null;
  sourceType: "page" | "selection" | "pdf" | "manual"; markdown: string; charCount: number;
  capturedAt: number; usedFallback: boolean;   // true = innerText instead of Readability
}
export type ExtractionErrorKind = "restricted" | "unreadable" | "empty" | "permission" | "pdf_failed";
export interface ExtractionErrorData { kind: ExtractionErrorKind; message: string; origin?: string } // origin set for "permission"
export type ApiError =
  | { kind: "no_key" } | { kind: "auth" }                       // 401/403
  | { kind: "rate_limit"; retryAfterSec: number | null }         // 429
  | { kind: "overloaded" }                                       // 529
  | { kind: "network" } | { kind: "aborted" }
  | { kind: "bad_request"; message: string }                     // 400/413/422, message scrubbed
  | { kind: "unknown"; status: number | null };
export type AppError = ApiError | ExtractionErrorData;
export class AppException extends Error { constructor(readonly error: AppError) { super(error.kind); } }

// settings.ts  (storage.local, shallow-merged with defaults, validated)
export function getSettings(): Promise<Settings>;
export function patchSettings(patch: Partial<Settings>): Promise<Settings>;
export function redactSettings(s: Settings): Omit<Settings, "apiKey"> & { apiKey: "***" | null }; // for any log/error
// permissions.ts - call ONLY from a click handler
export function hasHostPermission(origin: string): Promise<boolean>;            // permissions.contains
export function ensureHostPermission(origin: string): Promise<boolean>;         // contains, else permissions.request
export const API_ORIGIN = "https://api.anthropic.com/*";
// i18n.ts
export type MessageKey = string;  // narrowed to a generated union by scripts/i18n.mjs
export function initI18n(locale: UiLocale | "auto"): Promise<void>;
export function t(key: MessageKey, params?: Record<string, string | number>): string;
// render-markdown.ts
export function renderSafeMarkdown(markdown: string): DocumentFragment; // marked -> DOMPurify -> single sink (D-013)
```

### Messages (`messages.ts`, `messaging.ts`)

```ts
export type CaptureMode = "page" | "selection";
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export interface RequestMap {                                  // runtime.sendMessage, one-shot
  "key/validate":       { req: { apiKey: string };                         res: { valid: true } };       // invalid -> error auth
  "capture/run":        { req: { mode: CaptureMode; tabId?: number; handoff: boolean }; res: ExtractedPage }; // handoff: also store as pendingCapture
  "capture/takePending":{ req: Record<string, never>;                      res: ExtractedPage | null };  // reads + clears storage.session.pendingCapture
  "pdf/extract":        { req: { url: string };                            res: ExtractedPage };
  "artifact/save":      { req: { draft: ArtifactDraft };                   res: Artifact };              // from overlay (no IDB access there)
  "overlay/config":     { req: Record<string, never>; res: { defaultModel: ModelId; uiLocale: UiLocale | "auto"; answerLanguage: "auto" | UiLocale; hasKey: boolean } };
}
export type Request = { [K in keyof RequestMap]: { type: K } & RequestMap[K]["req"] }[keyof RequestMap];
export type ResponseOf<K extends keyof RequestMap> = Result<RequestMap[K]["res"]>;
export function sendRequest<K extends keyof RequestMap>(type: K, payload: RequestMap[K]["req"]): Promise<RequestMap[K]["res"]>; // throws AppException
export type TabMessage = { type: "overlay/show" };            // background -> injected overlay (tabs.sendMessage)

export interface ChatStart {
  type: "start"; requestId: string; model: ModelId; items: ContextItem[]; history: ChatMessage[];
  userText: string; answerLanguage: "auto" | UiLocale; maxTokens?: number;
}
export type ChatClientMsg = ChatStart | { type: "cancel"; requestId: string };
export type ChatServerMsg =
  | { type: "delta"; requestId: string; text: string }
  | { type: "done"; requestId: string; stopReason: StopReason; usage: { inputTokens: number; outputTokens: number }; bordereau: Bordereau }
  | { type: "error"; requestId: string; error: ApiError };
export interface ChatConnection {
  start(msg: Omit<ChatStart, "type">): void; cancel(requestId: string): void;
  onMessage(cb: (m: ChatServerMsg) => void): void; close(): void;
}
export function connectChat(): ChatConnection;                // runtime.connect({ name: CHAT_PORT_NAME })
```
Port rules: one Port per turn (open on send, close on `done`/`error`). Port disconnect = abort the stream. Background never persists conversations: the client persists (partial text marked `stopReason: "interrupted"` on disconnect/cancel). Exactly one terminal message (`done` or `error`) per `requestId`; `cancel` yields `error{aborted}`.

## 3. Public module APIs

```ts
// api/index.ts  (background only; baseURL = __API_BASE_URL__; dangerouslyAllowBrowser: true; no temperature/top_p/budget_tokens)
export function validateKey(apiKey: string): Promise<void>;                 // 1-token messages call (haiku); throws AppException(auth|network|...)
export function streamChat(req: ChatStart, signal: AbortSignal, on: (m: ChatServerMsg) => void): Promise<void>; // never throws; emits done/error
export function mapSdkError(e: unknown): ApiError;                          // 401/403 auth, 429 rate_limit(retry-after), 529 overloaded, 400-class bad_request, fetch failure network, AbortError aborted
// api/budget.ts (pure)
export interface ContextPlan { bordereau: Bordereau; blocks: { itemId: string; text: string }[] }
export function planContext(items: ContextItem[], question: string, model: ModelId): ContextPlan;
export function renderPrompt(plan: ContextPlan, userText: string, answerLanguage: string): { system: string; user: string }; // EXACT text sent; the preview shows this
export const MODEL_META: Record<ModelId, { labelKey: MessageKey; rank: 1 | 2 | 3 }>;
```
`planContext`: included items only, in order; total > budget => per item keep head + tail + paragraphs/sections sharing terms with `question` (accent-insensitive, stopwords ignored), joined by an explicit `[... N car. omis ...]` marker; `bordereau.truncated = true`. Budget = `INPUT_BUDGET_CHARS[model] - maxTokens*CHARS_PER_TOKEN - history chars - 2000`. `stop_reason: "refusal"` and `"max_tokens"` are returned in `done` (UI shows a notice), never thrown.

```ts
// extraction/index.ts  (background; uses scripting.executeScript, needs activeTab grant or host permission)
export class ExtractionError extends Error { constructor(readonly data: ExtractionErrorData) }
export function extractTab(tabId: number, mode: CaptureMode): Promise<ExtractedPage>;   // runs injected/page.js or injected/selection.js, re-reads URL+title on every call
export function extractPdf(url: string): Promise<ExtractedPage>;                        // fetch + bundled pdfjs-dist; "permission" error carries origin
// extraction/manual.ts (pure)
export function manualPage(text: string, title?: string): ExtractedPage;                // sourceType "manual"
// extraction/injected/*.ts: IIFE returning ExtractedPage | ExtractionErrorData as the executeScript result
```
```ts
// library/index.ts  (extension pages + background; IndexedDB via idb; stores artifacts, versions, conversations)
export interface ListQuery { tag?: string; sourceType?: SourceType; sort?: "updated" | "created" | "title" }
export interface SearchHit { artifact: Artifact; score: number; snippets: { field: "title" | "tag" | "text"; before: string; hit: string; after: string }[] }
export interface ExportFile { filename: string; mime: string; content: string }
export interface ImportReport { artifacts: number; versions: number; conversations: number; skipped: number }
export interface Library {
  saveArtifact(draft: ArtifactDraft): Promise<Artifact>;       // same url + same contentHash => returns existing; same url + new hash => addVersion
  getArtifact(id: string): Promise<ArtifactWithContent | null>;
  listArtifacts(q?: ListQuery): Promise<Artifact[]>;
  updateArtifact(id: string, patch: { title?: string; tags?: string[] }): Promise<Artifact>;
  addVersion(id: string, markdown: string): Promise<ArtifactVersion>;
  listVersions(id: string): Promise<ArtifactVersion[]>;
  restoreVersion(id: string, versionId: string): Promise<Artifact>; // creates a new version, never rewrites history
  deleteArtifact(id: string): Promise<void>;                   // also its versions
  search(query: string, limit?: number): Promise<SearchHit[]>; // in-memory token index (title/tags/markdown), NFD-folded, lowercase, prefix match
  saveConversation(c: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Omit<Conversation, "messages" | "items">[]>;
  deleteConversation(id: string): Promise<void>;
  exportMarkdown(ids: string[], bundle: boolean): Promise<ExportFile>; // YAML front matter (title,url,source,tags,created,updated) + body; bundle = one file, `---` separated
  exportJson(): Promise<ExportFile>;                           // { schemaVersion: 1, exportedAt, artifacts, versions, conversations } - never the settings or key
  importJson(text: string): Promise<ImportReport>;             // validates schemaVersion, merges by id, newer updatedAt wins
  clearAll(): Promise<void>;
  onChange(cb: () => void): () => void;                        // BroadcastChannel LIBRARY_CHANNEL; index rebuilds lazily
}
export function openLibrary(): Promise<Library>;               // idempotent per realm
export function artifactToContextItem(a: ArtifactWithContent): ContextItem; // kind "artifact", included true
```

## 4. Runtime topology

- Background (event page, module, non persistent): `runtime.onMessage` router for `RequestMap` (always answers `Result`), `runtime.onConnect` for `chat` Ports, `commands.onCommand`, `menus.onClicked`, `runtime.onInstalled` (menus creation, open onboarding on first install). All listeners registered synchronously at top level. Cross-wake state: `storage.session.pendingCapture`, `storage.local.settings`; nothing only in globals.
- `scripting.executeScript` is the only injection path. `overlayAllSites` on => `scripting.registerContentScripts` (persistent, `overlay.js`, `<all_urls>`, `runAt: document_idle`) after `permissions.request`; off => `unregisterContentScripts`. Overlay has a `window` guard against double mount; re-triggering sends `TabMessage overlay/show`.
- Content script never receives the key; it sends `ChatStart` over a Port and renders `delta`s.
- `sidebarAction.open()` is only called inside synchronous user-action handlers in background (`commands.onCommand`, `menus.onClicked`) or in the popup click handler. The overlay cannot open the sidebar: it shows the shortcut hint and the capture is already in `pendingCapture`.
- Sidebar reads the active tab id with `tabs.query` (no `tabs` permission needed for ids; URL comes from extraction, not from `tabs`). Without `<all_urls>` it cannot extract by itself: it shows the pending capture or the "capture via popup/shortcut" empty state ("La marge est vide.").

## 5. Acceptance journeys

**J1 Enter key (onboarding/options).** First install -> `onInstalled` opens `onboarding.html` (3 steps). Step 2: user pastes key, clicks "Valider" -> `ensureHostPermission(API_ORIGIN)` (click) -> `sendRequest("key/validate")` -> background `validateKey` (1-token call, haiku). `ok` => `patchSettings({apiKey, onboardingDone:true})`, step 3. `auth` => inline `aria-invalid` error, key not stored; `network` => retry notice; `rate_limit`/`overloaded` => key accepted with warning notice. Options "Clé API" section: same flow, "Effacer" = `inline-confirm` then `patchSettings({apiKey:null})`. Key field is `type=password`, never rendered back (shows `sk-ant-...XXXX` last 4 only).

**J2 Ask about the page (streaming).** User opens sidebar (Ctrl+Shift+Y) -> sidebar `capture/takePending`; if null and `sidebarReadsActiveTab` + permission => `capture/run{mode:"page",handoff:false}`; else empty state. Chip for the page appears (`loading` -> `ready`, solid, sweep). User types question; slip shows `planContext(...).bordereau` live (opening shows `renderPrompt` exact text). Send -> `connectChat().start(...)`; sidebar appends user message (with bordereau) and an empty assistant message with caret. Background: `streamChat` -> `client.messages.stream({model, max_tokens, system, messages})` -> each `text` event => `delta`; on final message `done{stopReason, usage, bordereau}`. Sidebar re-renders via `renderSafeMarkdown` throttled by rAF, then `saveConversation`. Stop button => `cancel` => `error{aborted}`: message kept, marked interrupted. `max_tokens` => notice "Reponse coupee" + "Continuer"; `refusal` => notice, no retry; errors map to `notice--error` with action (auth => open options; rate_limit => countdown from `retryAfterSec`; network/overloaded => "Reessayer").

**J3 Explain selection (overlay).** Path A (no extra permission): select text -> shortcut `explain-selection` or context menu "Expliquer la selection" (both grant activeTab) -> background `executeScript(overlay.js)` then `tabs.sendMessage(overlay/show)`. Path B (`overlayAllSites`): registered overlay shows its toolbar on `mouseup`/`keyup` selection (>= 3 chars, not in password/editable fields). Overlay reads `getSelection()` itself (selection text only; no page extraction), builds one `selection` ContextItem, shows card with the bordereau (`planContext` from `api/budget`), user clicks "Expliquer" (send icon) -> `connectChat().start` with default model, streams `delta` into the card (`renderSafeMarkdown`). Card actions: Copier, Enregistrer (`artifact/save`, "Enregistre dans la bibliotheque"), "Poursuivre dans le panneau" (sends `capture/run{mode:"selection",handoff:true}` (background re-extracts the selection and stores `pendingCapture`), then shows the hint "Ctrl+Shift+Y"). Esc / outside click closes; closing aborts the Port. No key (`overlay/config.hasKey` false) => the card shows a static notice "Ajoutez votre cle dans les reglages (icone de l'extension)"; no link to a `moz-extension` URL (unreachable from a page).

**J4 Save page as artifact.** Popup "Enregistrer cette page" (or command `save-page`, or menu entry): click => `sendRequest("capture/run",{mode:"page",handoff:false})` (activeTab granted by the click) -> `extractTab` runs `injected/page.js`: Readability on `document.cloneNode(true)`, turndown -> Markdown; fallback `body.innerText` (`usedFallback`). PDF tab (url `.pdf`) => `pdf/extract`. Popup shows preview (title, char count, excerpt, editable title and tags), Confirm => `library.saveArtifact(draft)` (command path: background saves directly, then notifies via popup-less status: badge text "OK" for 3 s via `action.setBadgeText`, no notification permission). "Local" mark: saving never calls the API. `ExtractionError restricted` => popup state "Cette page ne peut pas etre lue" + "Coller le texte" (textarea -> `manualPage`). `permission` (PDF origin) => button "Autoriser ce site" -> `ensureHostPermission(origin)` -> retry.

**J5 Find, attach, export.** Library page: `openLibrary()`, `listArtifacts()` ; typing in search (150 ms debounce) -> `search(q)` -> rows with `mark.hit` snippets; no hit => "Rien dans la marge pour ...". Detail: versions list, edit title/tags (`updateArtifact`), "Ajouter au contexte" => writes `storage.session.pendingAttach = artifactId` and opens/focuses sidebar via click handler `sidebarAction.open()`; sidebar on open (and `storage.onChanged`) loads `getArtifact` -> `artifactToContextItem` -> new conversation with that chip (solid) next to dashed unselected chips. Export: "Exporter .md" => `exportMarkdown([id], false)`; multi-select "Exporter le lot" => bundle; "Tout exporter (JSON)" => `exportJson()`; download by `URL.createObjectURL` + `<a download>` in the page (no `downloads` permission); "Copier" uses `navigator.clipboard.writeText` from the click. Import: file input -> `importJson` -> `ImportReport` notice. claude.ai integration = these files (D-009).

## 6. Build and reproducibility

Scripts (`package.json`): `build` = `node scripts/build.mjs` -> `dist/` (prod, `__API_BASE_URL__="https://api.anthropic.com"`, minified, no sourcemaps); `build:test` -> `dist-test/` (`MODE=test`, `__API_BASE_URL__="http://127.0.0.1:<MOCK_PORT>"` default 8787, extra host permission + CSP origin, sourcemaps); `typecheck` = `node scripts/i18n.mjs && tsc --noEmit`; `lint` = `web-ext lint -s dist --warnings-as-errors` + `eslint src scripts` + `node scripts/audit-permissions.mjs dist`; `test` = `vitest run`; `test:e2e` = `npm run build:test && vitest run --config vitest.e2e.config.ts`; `package` = `build` + `web-ext build -s dist -a artifacts --overwrite-dest` (xpi named `claude-everywhere-<version>.zip/.xpi`).
- `build.mjs` (esbuild API): ESM entries `background/main.ts` (target firefox140); per page `sidebar|popup|library-ui|options` -> `<name>.js` + html copied + `css/tokens.css`, `css/components.css`, `css/fonts.css`; IIFE entries `overlay/main.ts`, `extraction/injected/page.ts`, `extraction/injected/selection.ts`; worker `pdfjs-dist/build/pdf.worker.min.mjs` -> `pdf.worker.js`. JSX: `jsxImportSource: "preact"`. `define`: `__API_BASE_URL__`, `__TEST__`.
- `overlay-css.mjs`: reads tokens+components CSS, converts rem->px, exports a string consumed via esbuild `text` loader (no fonts).
- `manifest.mjs`: `manifest.template.json` + `package.json` version + variant => `dist/manifest.json` (manifest_version 3, `background.scripts:["background.js"]`, `type:"module"`, `action` popup, `sidebar_action`, `commands` with `suggested_key` (`_execute_sidebar_action` Ctrl+Shift+Y), `options_ui` open_in_tab, `default_locale: "fr"`, `icons`, gecko settings per D-006, CSP per D-007, `permissions`, `host_permissions`, `optional_host_permissions`). Test variant only appends the localhost origin.
- `i18n.mjs`: merges `src/*/locales/{fr,en}.json` into `dist/_locales/{fr,en}/messages.json` (flat keys, `{message}` form), `dist/locales/{fr,en}.json` (for `initI18n`), generates `src/shared/generated/message-keys.ts` (gitignored); fails on duplicate key, key missing in one locale, key not prefixed by its module name.
- Reproducibility: `package-lock.json` committed, `npm ci` only; exact versions (no `^`) for every dependency; `engines.node` pinned; esbuild `legalComments: "none"`, deterministic entry order, no timestamps, no absolute paths, no `Date.now()` in the build; `web-ext build` file order fixed (it zips sorted), so two builds of one commit give identical `dist/` (checked by hashing `dist/` twice in CI-style script `scripts/package.mjs --verify`).

## 7. Test plan

| Level | What | Where |
|---|---|---|
| Unit | `planContext` (budget, head+tail, term sections, accents, marker, bordereau counts), `renderPrompt` == preview text | `src/api/*.test.ts` |
| Unit | `mapSdkError` per status (401, 403, 429+retry-after, 529, 400, network, abort); key never in error objects | `src/api/errors.test.ts` |
| Unit | `streamChat` against mock server: deltas order, done usage, `refusal`, `max_tokens`, cancel mid-stream | `src/api/stream.test.ts` + `tests/mock-api` |
| Unit | extraction: Readability+turndown on fixtures, innerText fallback, restricted-page error, `manualPage`, PDF text extraction on fixture | `src/extraction/*.test.ts`, `tests/fixtures` |
| Unit | library: CRUD, versions dedupe by hash, restore, search accents/prefix/snippets, export md front matter, JSON round trip, import schema rejection (fake-indexeddb) | `src/library/*.test.ts` |
| Unit | `renderSafeMarkdown`: script/iframe/style/form removed, `javascript:` and `data:` hrefs dropped, links get rel/target, images become links | `src/shared/render-markdown.test.ts` |
| Unit | settings merge/redact, i18n `t` fallback fr, build `i18n.mjs` failure cases | `src/shared/*.test.ts`, `scripts/*.test.ts` |
| Integration | background router with `webextension` mock: `capture/run`, `chat` Port protocol (one terminal message, disconnect aborts), commands/menus open sidebar synchronously | `src/background/*.test.ts` |
| Integration | sidebar/popup/library-ui/options components (happy-dom): chip states, slip numbers, error notices, streaming render, a11y roles | `src/<ui>/*.test.tsx` |
| Integration | overlay in happy-dom: closed shadow root, `popover=manual`, no framework, mount guard, Esc closes | `src/overlay/*.test.ts` |
| Static | `web-ext lint` on `dist/`; `audit-permissions.mjs` (manifest permissions equal the D-006 allowlist, CSP equals D-007, no `<all_urls>` static, no `content_scripts`, `dist/overlay.js` contains no `x-api-key`/SDK marker, no remote URL other than API origin, no `eval`/`new Function`) | `scripts/` |
| E2E | selenium + geckodriver headless, `installAddon(dist-test xpi, true)`, uuid from `extensions.webextensions.uuids`; mock API on 127.0.0.1: J1 (valid/invalid key), J2 (stream, stop, 429 with retry-after), J3 (selection on fixture page, activeTab path), J4 (save fixture page, restricted `about:` state), J5 (search, attach, export download); `permissions.request` prompts are pre-granted via test build host permission | `tests/e2e/*.spec.ts` |

Mock API (`tests/mock-api/server.ts`): `POST /v1/messages` honouring `stream:true`, SSE events (`message_start`, `content_block_delta`, `message_delta` with `stop_reason`, `message_stop`), scenario selected by the user text prefix (`[scenario:rate_limit]`, `[scenario:refusal]`, `[scenario:slow]`), validates `x-api-key` and `anthropic-version` headers, records requests for assertions (`GET /__requests`).

## 8. Security checklist (reviewers)

1. Key only in `storage.local.settings.apiKey`; grep `apiKey|x-api-key` shows use only in `shared/settings`, `api/`, `background/`, options UI; never in `overlay`, `extraction/injected`, logs, error `message`, `redactSettings` used for diagnostics, export files.
2. SDK/`dangerouslyAllowBrowser` imported only from `api/index.ts`, bundled only into `background.js`; `baseURL` only from `__API_BASE_URL__`; prod `dist/` has no localhost.
3. Manifest equals D-006 exactly; no `content_scripts`, no `tabs`, `webRequest`, `unlimitedStorage`, `downloads`, `<all_urls>` only under `optional_host_permissions`; gecko id, `strict_min_version`, `data_collection_permissions` present.
4. CSP equals D-007; no inline script/handler/`style=` attribute in HTML; no `eval`/`new Function`/`innerHTML` outside `renderSafeMarkdown`; `grep -rn "innerHTML\|insertAdjacentHTML\|dangerouslySetInnerHTML" src` has no other hit.
5. Page-originated strings (title, URL, content) always rendered as text or through `renderSafeMarkdown`; extraction results validated (type/length) before use; `onMessage` handlers check `sender.id === runtime.id` and, for content-script messages, only accept `overlay/config`, `artifact/save`, `capture/run{mode:"selection"}`; Port `onConnect` checks `sender.id`.
6. Nothing leaves without an explicit action: no network call at load/on page visit; every send preceded by a bordereau from the same `planContext` result that is sent; truncation always reflected in `Bordereau.truncated`; no telemetry, no analytics, no remote fonts/CDN.
7. Permission requests only from click handlers; failures degrade to the capture-via-popup path with a clear state; revoked permissions re-checked with `permissions.contains` before use.
8. Overlay: closed shadow root, no framework, no host-page styles inherited (`all: initial`), no font loading, ignores editable/password fields, does not read page DOM beyond `getSelection()`, removable (Esc), no listeners left after close.
9. Dependencies: pinned, lockfile committed, `npm audit --omit=dev` clean of high/critical, no postinstall scripts relied upon; PDF parsing in the extension origin only; `wasm-unsafe-eval` absent unless the pdfjs E2E test fails without it (verify: run PDF fixture test against the CSP; add only on a CSP violation in the console and document in DECISIONS).
10. Import validation: JSON import rejects unknown `schemaVersion`, caps sizes, never executes or renders content unsanitised; export never contains settings/key.
11. Accessibility/design laws (D-001, `design/DESIGN.md` §1): `.sent` used only for outgoing text, no hard-coded colours (tokens), status = icon + text, focus ring, `prefers-reduced-motion` honoured.
