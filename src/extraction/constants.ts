export const RESULT_SLOT = "__claudeEverywhereExtraction";
export const MIN_ARTICLE_CHARS = 140;

export const PDF_MAX_PAGES = 300;
export const PDF_MAX_BYTES = 30 * 1024 * 1024;
export const PDF_MAX_CHARS = 1_500_000;
export const PDF_WORKER_FILE = "pdf.worker.js";

export const INJECTABLE_PROTOCOLS = ["http:", "https:", "file:"];
export const RESTRICTED_HOSTS = new Set([
  "accounts-static.cdn.mozilla.net",
  "accounts.firefox.com",
  "addons.cdn.mozilla.net",
  "addons.mozilla.org",
  "api.accounts.firefox.com",
  "content.cdn.mozilla.net",
  "discovery.addons.mozilla.org",
  "install.mozilla.org",
  "oauth.accounts.firefox.com",
  "profile.accounts.firefox.com",
  "support.mozilla.org",
  "sync.services.mozilla.com",
  "services.addons.mozilla.org",
]);
