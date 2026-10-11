import { useEffect } from "preact/hooks";
import { Composer } from "./components/Composer";
import { ContextBar } from "./components/ContextBar";
import { ConversationView } from "./components/ConversationView";
import { Header } from "./components/Header";
import { HistoryList } from "./components/HistoryList";
import { MissingKey } from "./components/MissingKey";
import { SendSlip } from "./components/SendSlip";
import { view } from "./state/history";
import { hasKey } from "./state/session";
import { cancelTurn } from "./state/turn";

function cancelOnEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") cancelTurn();
}

export function App() {
  useEffect(() => {
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, []);

  return (
    <div class="sidebar">
      <Header />
      {view.value === "history" ? <HistoryList /> : <ConversationView />}
      {view.value === "chat" && (
        <div class="sb-foot">
          {!hasKey.value && <MissingKey />}
          <SendSlip />
          <ContextBar />
          <Composer />
        </div>
      )}
    </div>
  );
}
