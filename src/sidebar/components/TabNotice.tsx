import { capture } from "../state/intake";
import { changedTab } from "../state/tabWatch";
import { TabChangeNotice } from "./TabChangeNotice";

export function TabNotice() {
  const tab = changedTab.value;
  if (!tab) return null;
  const read = () => {
    changedTab.value = null;
    void capture("page");
  };
  const keep = () => {
    changedTab.value = null;
  };
  return <TabChangeNotice title={tab.title} onRead={read} onKeep={keep} />;
}
