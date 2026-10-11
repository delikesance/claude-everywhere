const msg = (key) => `__MSG_${key}__`;

const API_HOST = "https://api.anthropic.com";
const ICONS = { 48: "icons/icon-48.svg", 96: "icons/icon-96.svg" };
const SIDEBAR_ICON = "icons/sidebar.svg";

// https: lets the background download an https PDF the user explicitly asks to read (D-017).
const PDF_CONNECT_SCHEME = "https:";

const csp = (connectOrigins) =>
  [
    "script-src 'self'",
    "object-src 'none'",
    "style-src 'self'",
    "img-src 'self' data:",
    `connect-src ${connectOrigins.join(" ")}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

const sortDeep = (value) => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, inner]) => [key, sortDeep(inner)]),
  );
};

/** testOrigin: e.g. "http://127.0.0.1:8787" for the test build, undefined for production. */
export function buildManifest({ version, testOrigin }) {
  const connectOrigins = testOrigin ? [API_HOST, PDF_CONNECT_SCHEME, testOrigin] : [API_HOST, PDF_CONNECT_SCHEME];
  const hostPermissions = testOrigin ? [`${API_HOST}/*`, `${testOrigin}/*`] : [`${API_HOST}/*`];
  return sortDeep({
    manifest_version: 3,
    name: msg("shared_extName"),
    description: msg("shared_extDescription"),
    version,
    default_locale: "fr",
    icons: ICONS,
    browser_specific_settings: {
      gecko: {
        id: "claude-everywhere@angelo.clauin",
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["websiteContent"] },
      },
      gecko_android: { strict_min_version: "142.0" },
    },
    background: { scripts: ["background.js"], type: "module" },
    action: { default_title: msg("shared_actionTitle"), default_popup: "popup.html", default_icon: ICONS },
    sidebar_action: {
      default_title: msg("shared_sidebarTitle"),
      default_panel: "sidebar.html",
      default_icon: SIDEBAR_ICON,
      open_at_install: false,
    },
    options_ui: { page: "options.html", open_in_tab: true },
    commands: {
      _execute_sidebar_action: {
        suggested_key: { default: "Ctrl+Shift+Y" },
        description: msg("shared_cmdSidebar"),
      },
      _execute_action: { suggested_key: { default: "Alt+Shift+C" }, description: msg("shared_cmdPopup") },
      "explain-selection": { suggested_key: { default: "Alt+Shift+E" }, description: msg("shared_cmdExplain") },
      "save-page": { suggested_key: { default: "Alt+Shift+S" }, description: msg("shared_cmdSave") },
    },
    permissions: ["activeTab", "contextMenus", "scripting", "storage"],
    host_permissions: hostPermissions,
    optional_host_permissions: ["<all_urls>"],
    content_security_policy: { extension_pages: csp(connectOrigins) },
  });
}
