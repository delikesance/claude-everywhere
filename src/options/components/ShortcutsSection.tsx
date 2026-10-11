import { useEffect, useState } from "preact/hooks";
import { t } from "../../shared/i18n";

type Command = browser.commands.Command;

export function ShortcutsSection() {
  const [commands, setCommands] = useState<Command[]>([]);
  useEffect(() => {
    void browser.commands.getAll().then((all) => setCommands(all.filter((command) => command.shortcut)));
  }, []);

  return (
    <div class="stack">
      {commands.length === 0 ? (
        <p class="caption">{t("options_shortcutsNone")}</p>
      ) : (
        <dl class="stack">
          {commands.map((command) => (
            <div class="row" key={command.name}>
              <dt class="grow">{command.description || command.name}</dt>
              <dd>
                <kbd>{command.shortcut}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p class="caption">{t("options_shortcutsChange")}</p>
    </div>
  );
}
