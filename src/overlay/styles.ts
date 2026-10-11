import { DARK_PALETTE, LIGHT_PALETTE, declarations } from "./palette";

const HOST_RULES = `
:host {
  all: initial !important;
  position: fixed !important;
  inset: 0 auto auto 0 !important;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: visible !important;
  background: none !important;
  color-scheme: light dark;
  ${declarations(LIGHT_PALETTE)}
  --font-serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
:host(:not(:popover-open)) { display: none !important; }
@media (prefers-color-scheme: dark) { :host { ${declarations(DARK_PALETTE)} } }
`;

const BASE_RULES = `
*, *::before, *::after { box-sizing: border-box; }
p, ul, ol, blockquote { margin: 0; }
[hidden] { display: none !important; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
a { color: var(--text); text-decoration: underline; text-decoration-color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { color: var(--accent-hover); }
.grow { flex: 1; min-width: 0; }
.caption { font: 400 12px/16px var(--font-sans); color: var(--muted); }
.reading { font: 400 15px/23px var(--font-serif); overflow-wrap: anywhere; }
.icon { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; }
.sent { background-color: transparent; background-image: linear-gradient(var(--sent-bg), var(--sent-bg)); background-repeat: no-repeat; background-size: 100% 100%; border: 1px solid var(--sent-edge); color: var(--text); }
`;

const BUTTON_RULES = `
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 2px; border: 1px solid transparent; font: 500 13px/18px var(--font-sans); color: var(--text); background: transparent; cursor: pointer; white-space: nowrap; min-width: 0; }
.btn--compact { height: 32px; }
.btn--quiet:hover { text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 3px; }
.btn:disabled { background: var(--disabled-bg); color: var(--muted); border-color: var(--disabled-bg); cursor: not-allowed; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; border-radius: 2px; background: transparent; color: var(--muted); cursor: pointer; }
.icon-btn:hover { background: var(--surface); color: var(--text); }
.icon-btn--sm { width: 24px; height: 24px; }
.btn--primary { background: var(--primary); color: var(--on-primary); border-color: var(--primary); }
.btn--primary:hover { background: var(--primary-hover); }
.btn--secondary { border-color: var(--border-strong); }
.btn--secondary:hover { background: var(--raised); border-color: var(--text); }
`;

const CARD_RULES = `
.toolbar { position: fixed; display: inline-flex; gap: 2px; height: 32px; align-items: center; background: var(--raised); border-radius: 2px; box-shadow: var(--shadow-2); padding: 0 4px; }
.toolbar .btn { height: 28px; padding: 0 8px; }
.overlay-card { position: fixed; width: 340px; max-width: 90vw; max-height: 50vh; display: flex; flex-direction: column; background: var(--raised); color: var(--text); font: 400 14px/20px var(--font-sans); border-radius: 4px; box-shadow: var(--shadow-2); }
.anim-pop { animation: pop 180ms cubic-bezier(0.2, 0, 0, 1); }
.overlay-card__quote { margin: 16px 16px 0; padding: 4px 8px; border-radius: 2px; font: 400 12.5px/18px var(--font-mono); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.overlay-card__head { display: flex; align-items: center; gap: 8px; padding: 8px 12px 0 16px; }
.overlay-card__head .grow { font: 600 12px/16px var(--font-sans); }
.overlay-card__sent { padding: 0 16px; font: 400 12.5px/18px var(--font-mono); color: var(--muted); }
.overlay-card__body { padding: 12px 16px; overflow: auto; display: grid; gap: 8px; }
.overlay-card__foot { padding: 8px 12px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.anim-dots { display: inline-flex; align-items: center; gap: 2px; }
.anim-dots > span { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: anim-dot 1200ms ease-in-out infinite; }
.anim-dots > span:nth-child(2) { animation-delay: 160ms; }
.anim-dots > span:nth-child(3) { animation-delay: 320ms; }
.caret { display: inline-block; width: 2px; height: 18px; margin-left: 1px; vertical-align: text-bottom; background: var(--accent); animation: blink 1060ms steps(1) infinite; }
.md ul, .md ol { padding-left: 1.2em; }
.md blockquote { border-left: 2px solid var(--border); padding-left: 12px; font-style: italic; }
.md code { font: 400 12.5px/18px var(--font-mono); background: var(--sunken); padding: 0 4px; border-radius: 2px; }
.md pre { overflow: auto; }
.notice { display: grid; grid-template-columns: 28px minmax(0, 1fr); background: var(--surface); border-left: 2px solid var(--border-strong); border-radius: 2px; padding: 12px 12px 12px 8px; }
.notice__icon { padding-top: 2px; display: flex; justify-content: center; align-items: flex-start; }
.notice__title { font: 600 14px/20px var(--font-sans); }
.notice__body { font: 400 14px/20px var(--font-sans); }
.notice__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.notice--warning { border-left-color: var(--warning); }
.notice--warning .notice__icon { color: var(--warning); }
.notice--error { border-left-color: var(--danger); background: var(--danger-tint); }
.notice--error .notice__icon { color: var(--danger); }
@keyframes pop { from { opacity: 0; transform: translateY(4px) scale(0.97); } }
@keyframes anim-dot { 0%, 60%, 100% { opacity: 0.35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
@keyframes blink { 50% { opacity: 0; } }
`;

const ACCESSIBILITY_RULES = `
@media (forced-colors: active) {
  * { box-shadow: none !important; }
  .sent { background: Canvas; border: 2px solid Highlight; }
  .btn { border-color: CanvasText; }
  :focus-visible { outline-color: Highlight; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 80ms !important; }
  .anim-pop { animation-name: fade-in; }
  @keyframes fade-in { from { opacity: 0; } }
  .caret { animation: none; opacity: 1; }
  .anim-dots > span { animation: none; opacity: 1; transform: none; }
}
`;

export const OVERLAY_CSS = [HOST_RULES, BASE_RULES, BUTTON_RULES, CARD_RULES, ACCESSIBILITY_RULES].join("");
