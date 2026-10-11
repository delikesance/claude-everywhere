import { useEffect, useRef, useState } from "preact/hooks";
import { manualPage } from "../extraction/manual";
import { openLibrary } from "../library";
import { t } from "../shared/i18n";
import { sendRequest } from "../shared/messaging";
import type { CaptureMode } from "../shared/messages";
import type { ArtifactDraft } from "../shared/types";
import { Header, Home } from "./Home";
import { Failure, NoKey, Saved, Unreadable } from "./Notices";
import { Permission } from "./Permission";
import { Preview } from "./Preview";
import { Restricted } from "./Restricted";
import { type View, viewForError } from "./view";

type Task = () => Promise<View>;

const HOME: View = { name: "home" };
const PAGE_MODE: CaptureMode = "page";
const LIBRARY_PAGE = "library-ui.html";

const POPUP_STYLE = { width: "320px", padding: 0, gap: 0 };
const BODY_STYLE = { display: "grid", gap: "var(--s-12)", padding: "var(--s-12)" };

const capture = (handoff: boolean) => sendRequest("capture/run", { mode: PAGE_MODE, handoff });

async function openLibraryPage(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL(LIBRARY_PAGE) });
  window.close();
}

export function App() {
  const [view, setView] = useState<View>(HOME);
  const lastTask = useRef<Task>(async () => HOME);

  useEffect(() => {
    void sendRequest("overlay/config", {})
      .then((config) => config.hasKey || setView({ name: "nokey" }))
      .catch(() => undefined);
  }, []);

  const run = async (task: Task) => {
    lastTask.current = task;
    setView({ name: "working" });
    setView(await task().catch(viewForError));
  };

  const ask = () => {
    void browser.sidebarAction.open();
    void run(async () => {
      await capture(true);
      window.close();
      return HOME;
    });
  };
  const save = () => run(async () => ({ name: "preview", page: await capture(false) }));
  const paste = (text: string) => run(async () => ({ name: "preview", page: manualPage(text) }));
  const confirm = (draft: ArtifactDraft) =>
    run(async () => {
      await (await openLibrary()).saveArtifact(draft);
      return { name: "saved" };
    });
  const back = () => setView(HOME);

  return (
    <div class="popup" style={POPUP_STYLE}>
      <Header onOpenOptions={() => void browser.runtime.openOptionsPage()} />
      <div style={BODY_STYLE}>
        <ViewBody
          view={view}
          actions={{ ask, save, paste, confirm, back, retry: () => run(lastTask.current) }}
        />
      </div>
    </div>
  );
}

interface Actions {
  ask: () => void;
  save: () => void;
  paste: (text: string) => void;
  confirm: (draft: ArtifactDraft) => void;
  back: () => void;
  retry: () => void;
}

function ViewBody({ view, actions }: { view: View; actions: Actions }) {
  switch (view.name) {
    case "home":
      return <Home onAsk={actions.ask} onSave={actions.save} onOpenLibrary={() => void openLibraryPage()} />;
    case "working":
      return <p class="caption">{t("popup_working")}</p>;
    case "nokey":
      return <NoKey onAddKey={() => void browser.runtime.openOptionsPage()} />;
    case "restricted":
      return <Restricted onPaste={actions.paste} />;
    case "permission":
      return <Permission origin={view.origin} onGranted={actions.retry} />;
    case "unreadable":
      return <Unreadable onBack={actions.back} />;
    case "error":
      return <Failure onBack={actions.back} />;
    case "preview":
      return <Preview page={view.page} onConfirm={actions.confirm} onCancel={actions.back} />;
    case "saved":
      return <Saved onOpenLibrary={() => void openLibraryPage()} />;
  }
}
