/**
 * 子任务药丸里的名单。点行只展开思考树，不新开线程。
 */
import type { TranslateFn } from "@renderer/i18n"
import { personasForSubagents } from "../thinking/subagent-persona"
import { subagentPersonaLabel } from "../thinking/delegate-step"
import { focusDelegate } from "./delegate-focus"
import type { DelegatePillItem } from "./select-current-delegates"

export function SubagentPillList({
  items,
  t,
  onClose
}: {
  items: DelegatePillItem[]
  t: TranslateFn
  onClose: () => void
}) {
  const personas = personasForSubagents(items)
  return (
    <ul className="max-h-40 overflow-y-auto">
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-background-secondary-hover"
            onClick={() => openDelegate(item, onClose)}
          >
            <span className="shrink-0 text-caption-1-medium text-text-primary">{personas[index]?.seed}</span>
            <span className="shrink-0 text-caption-2-medium text-text-secondary">
              {subagentPersonaLabel(item.kind, t)}
            </span>
            <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-secondary">
              {item.title || t("chat.subagentLead")}
            </span>
            <span className="shrink-0 text-caption-2-medium text-text-tertiary">{statusLabel(item, t)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function openDelegate(item: DelegatePillItem, close: () => void): void {
  document.querySelector(`[data-thread-message="${item.messageId}"]`)?.scrollIntoView({ block: "center" })
  focusDelegate(item.id)
  close()
}

function statusLabel(item: DelegatePillItem, t: TranslateFn): string {
  if (item.status === "running") return t("chat.subagentPillRunning")
  if (item.status === "error") return t("chat.subagentFailed")
  if (item.status === "pending") return t("chat.subagentPillPending")
  if (item.status === "stopped") return t("chat.toolStopped")
  return t("chat.subagentPillDone")
}
