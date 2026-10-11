import { useState } from "preact/hooks";
import { sendRequest } from "../../shared/messaging";
import { t } from "../../shared/i18n";
import { Button, Icon } from "../../shared/ui";

function artifactTitle(markdown: string): string {
  const firstLine = markdown.trim().split("\n")[0] ?? "";
  return firstLine.replace(/^#+\s*/, "").slice(0, 80) || t("sidebar_untitled");
}

export function AnswerActions({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  };
  const save = async () => {
    await sendRequest("artifact/save", {
      draft: { title: artifactTitle(markdown), url: null, sourceType: "note", tags: [], markdown },
    });
    setSaved(true);
  };

  return (
    <>
      <Button variant="quiet" compact onClick={() => void copy()}>
        <Icon name="copy" />
        {copied ? t("sidebar_copied") : t("sidebar_copy")}
      </Button>
      <Button variant="quiet" compact onClick={() => void save()}>
        <Icon name="bookmarkPlus" />
        {saved ? t("sidebar_saved") : t("sidebar_save")} <span class="badge badge--local">{t("sidebar_badgeLocal")}</span>
      </Button>
    </>
  );
}
