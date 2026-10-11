import { explainSelection } from "./overlay-inject";
import { savePage } from "./save-page";

const COMMAND_EXPLAIN_SELECTION = "explain-selection";
const COMMAND_SAVE_PAGE = "save-page";

export function onCommand(command: string, tab: browser.tabs.Tab | undefined): void {
  if (command === COMMAND_EXPLAIN_SELECTION) void explainSelection(tab);
  else if (command === COMMAND_SAVE_PAGE) void savePage(tab);
}
