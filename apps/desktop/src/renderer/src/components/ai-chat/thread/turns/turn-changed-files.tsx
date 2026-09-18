/**
 * 助手轮气泡下的本轮写盘树。点开右栏审查。
 */
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { groupChangedPaths, pathsFromTools } from "../../right-pane/views/review/last-turn-paths"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function TurnChangedFiles({ message }: { message: ThreadMessage }) {
  const t = useT()
  const groups = groupChangedPaths(pathsFromTools(message.tools ?? []))
  if (groups.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-col gap-1" data-testid="turn-changed-files">
      <span className="text-caption-2-medium text-text-tertiary">{t("chat.turnChangedFiles")}</span>
      {groups.map((group) => (
        <div key={group.dir} className="flex flex-col gap-0.5">
          <p className="truncate font-mono text-caption-2-regular text-text-tertiary">{group.dir}</p>
          <div className="flex flex-wrap gap-1 pl-2">
            {group.files.map((file) => {
              const path = group.dir === "." ? file : `${group.dir}/${file}`
              return (
                <button
                  key={path}
                  type="button"
                  title={path}
                  onClick={() => void openChangedFile(path)}
                  className="max-w-[12rem] truncate rounded-md border border-border-button-default/70 bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary hover:border-accent-500/50 hover:text-text-primary"
                >
                  {file}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
