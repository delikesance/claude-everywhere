import { useState } from "preact/hooks";
import { sendRequest } from "../../shared/messaging";
import { t } from "../../shared/i18n";
import { Button, Icon } from "../../shared/ui";

function draftTitle(markdown: string): string {
  const firstLine = markdown.trim().split("\n")[0] ?? "";
  return firstLine.replace(/^#+\s*/, "").slice(0, 80) || t("sidebar_untitled");
}

export function CopyButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  };
  return (
    <Button variant="quiet" compact onClick={() => void copy()}>
      <Icon name="copy" />
      {copied ? t("sidebar_copied") : t("sidebar_copy")}
    </Button>
  );
}

export function KeepButton({ markdown }: { markdown: string }) {
  const [kept, setKept] = useState(false);
  const keep = async () => {
    await sendRequest("artifact/save", {
      draft: { title: draftTitle(markdown), url: null, sourceType: "note", tags: [], markdown },
    });
    setKept(true);
  };
  return (
    <Button variant="quiet" compact disabled={kept} onClick={() => void keep()}>
      {!kept && <Icon name="bookmarkPlus" />}
      {kept ? t("sidebar_kept") : t("sidebar_keep")}
    </Button>
  );
}
