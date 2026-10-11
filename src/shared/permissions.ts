export { API_ORIGIN } from "./constants";

export function hasHostPermission(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [origin] });
}

export async function ensureHostPermission(origin: string): Promise<boolean> {
  if (await hasHostPermission(origin)) return true;
  return browser.permissions.request({ origins: [origin] });
}
