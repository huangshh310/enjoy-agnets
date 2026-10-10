/**
 * 非 git 工作区审查空态：与「仓库很干净」拆开，必要时列出本轮账本路径。
 */
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { pathsFromLastTurn } from "./last-turn-paths"

export function ReviewNotGitEmpty() {
  const t = useT()
  const ledger = useChatStore((state) => pathsFromLastTurn(state.messages))
  return (
    <div className="flex flex-col gap-2 p-5">
      <p className="text-caption-1-medium text-text-tertiary">{t("chat.reviewNotGit")}</p>
      {ledger.length > 0 ? (
        <ul className="flex flex-col gap-1 text-caption-1-medium text-text-secondary">
          {ledger.map((path) => (
            <li key={path} className="truncate">
              {path}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
