import { createMenus } from "./menus";
import { syncOverlayRegistration } from "./overlay-inject";

export async function onInstalled(): Promise<void> {
  await createMenus();
  await syncOverlayRegistration();
}
