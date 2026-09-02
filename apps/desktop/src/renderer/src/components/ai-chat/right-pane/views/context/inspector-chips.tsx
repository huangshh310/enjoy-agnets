/**
 * 检查器芯片：只画已钉入的知识上下文，空则空态。
 */
import { RiBookOpenLine, RiCloseLine } from "@remixicon/react"
import { useSyncExternalStore } from "react"
import {
  listSessionContextChips,
  removeSessionContextChip,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { useT } from "@renderer/i18n"

export function InspectorChips({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-caption-2-medium font-semibold text-text-tertiary">
          {t("chat.inspectorChips")}
        </span>
        <span className="text-caption-2-regular text-text-tertiary">
          {workspaceId ? t("chat.inspectorWorkspaceOn") : t("chat.inspectorWorkspaceOff")}
        </span>
      </div>
      {chips.length === 0 ? (
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.inspectorEmptyChips")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-separator-border/80 bg-background-secondary-default/70 px-2 py-1 text-caption-2-medium text-text-secondary"
            >
              <RiBookOpenLine className="size-3 shrink-0 text-accent-500" />
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                className="shrink-0 text-text-tertiary hover:text-text-primary"
                aria-label={t("common.close")}
                onClick={() => removeSessionContextChip(chip.id)}
              >
                <RiCloseLine className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
