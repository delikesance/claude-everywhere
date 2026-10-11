import { computed, signal } from "@preact/signals";
import { STORAGE_KEYS } from "../../shared/constants";
import { DEFAULT_SETTINGS, getSettings } from "../../shared/settings";
import { applyTheme } from "../../shared/theme";
import type { Settings } from "../../shared/types";

export const settings = signal<Settings>(DEFAULT_SETTINGS);
export const hasKey = computed(() => settings.value.apiKey !== null);

export async function loadSettings(): Promise<void> {
  settings.value = await getSettings();
  applyTheme(settings.value.theme);
}

export function watchSettings(): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && STORAGE_KEYS.settings in changes) void loadSettings();
  });
}
