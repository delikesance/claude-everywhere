import { openCard } from "./card";
import type { OpenCard, OverlayConfig } from "./card";
import { placeNear } from "./position";
import { readSelection } from "./selection";
import type { Surface } from "./surface";
import { buildToolbar } from "./toolbar";

const TOOLBAR_WIDTH_PX = 120;

export interface Overlay {
  isCardOpen(): boolean;
  refreshToolbar(): void;
  openFromSelection(): Promise<void>;
  dismiss(): void;
}

export function createOverlay(surface: Surface, loadConfig: () => Promise<OverlayConfig>): Overlay {
  let card: OpenCard | null = null;

  const openFromSelection = async () => {
    const selection = readSelection();
    if (!selection) return;
    const config = await loadConfig();
    card?.close();
    card = openCard(surface, selection, config, () => (card = null));
  };

  return {
    isCardOpen: () => card !== null,
    openFromSelection,
    refreshToolbar() {
      if (card) return;
      const selection = readSelection();
      if (!selection) return surface.clear();
      const toolbar = buildToolbar(() => void openFromSelection());
      placeNear(toolbar, selection.rect, TOOLBAR_WIDTH_PX);
      surface.show(toolbar);
    },
    dismiss() {
      if (card) card.close();
      else surface.clear();
    },
  };
}
