export { API_ORIGIN } from "./constants";

export function hasHostPermission(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [origin] });
}

/** Must request synchronously: awaiting anything first loses the user gesture and Firefox rejects the request. */
export function ensureHostPermission(origin: string): Promise<boolean> {
  return browser.permissions.request({ origins: [origin] });
}
