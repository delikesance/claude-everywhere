import { CHAT_PORT_NAME } from "../shared/constants";
import { handleChatPort } from "./chat-port";
import { onCommand } from "./commands";
import { onInstalled } from "./install";
import { onMenuClicked } from "./menus";
import { onStorageChanged, syncOverlayRegistration } from "./overlay-inject";
import { routeMessage } from "./router";
import { onToolbarClicked } from "./toolbar";

browser.runtime.onMessage.addListener((message, sender) => routeMessage(message, sender));
browser.runtime.onConnect.addListener((port) => {
  if (port.name === CHAT_PORT_NAME) handleChatPort(port);
});
browser.runtime.onInstalled.addListener(onInstalled);
browser.commands.onCommand.addListener(onCommand);
browser.contextMenus.onClicked.addListener(onMenuClicked);
browser.action.onClicked.addListener(onToolbarClicked);
browser.permissions.onAdded.addListener(syncOverlayRegistration);
browser.permissions.onRemoved.addListener(syncOverlayRegistration);
browser.storage.onChanged.addListener(onStorageChanged);
