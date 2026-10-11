/** Source paths are relative to src/; outputs are relative to the dist root. */

export const BACKGROUND_ENTRY = { in: "background/main.ts", out: "background" };

export const PAGE_ENTRIES = [
  { in: "sidebar/main.tsx", out: "sidebar", html: "sidebar/index.html" },
  { in: "library-ui/main.tsx", out: "library-ui", html: "library-ui/index.html" },
  { in: "options/main.tsx", out: "options", html: "options/options.html" },
];

export const SCRIPT_ENTRIES = [
  { in: "overlay/main.ts", out: "overlay" },
  { in: "extraction/injected/page.ts", out: "injected/page" },
  { in: "extraction/injected/selection.ts", out: "injected/selection" },
];

export const PDF_WORKER = { from: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs", to: "pdf.worker.js" };
export const DESIGN_CSS = ["tokens.css", "components.css"];
export const ICONS_DIR = "src/shared/icons";
