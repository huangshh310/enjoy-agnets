/**
 * 非 git 工作区审查空态：与「仓库很干净」拆开，必要时列出本轮账本路径。
 * 禁止在 useChatStore selector 里调用 pathsFromLastTurn：每次新数组会让
 * useSyncExternalStore 认定快照变了，整页 Maximum update depth exceeded。
 * 也不要在这个空态上再挂 ReviewDiffPane 的自动选文件 effect。
 */
import { useMemo } from "react"
import { useT } from "@renderer/i18n"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useSourceFileReveal } from "../../../thread/sources/source-file-reveal"
import { pathsFromLastTurn } from "./last-turn-paths"

export function ReviewNotGitEmpty() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const ledger = useMemo(() => pathsFromLastTurn(messages), [messages])
  return (
    <div data-testid="review-not-git-empty" className="flex flex-col gap-2 p-5">
      <p className="text-body-medium font-medium text-text-secondary">{t("chat.reviewNotGit")}</p>
      <p className="text-caption-1-medium text-text-tertiary">{t("chat.reviewNotGitHint")}</p>
      {ledger.length > 0 ? (
        <ul className="flex flex-col gap-1 text-caption-1-medium text-text-secondary">
          {ledger.map((path) => (
            <li key={path}>
              <button
                type="button"
                data-testid="review-not-git-file"
                data-path={path}
                onClick={() => openLedgerPreview(path)}
                className="max-w-full truncate text-left text-text-primary underline-offset-2 hover:underline"
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function openLedgerPreview(path: string) {
  useSourceFileReveal.getState().setReveal({ path, line: 1, view: "preview" })
  void openChangedFile(path, { reveal: "files" })
}
