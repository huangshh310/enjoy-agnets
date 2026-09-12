/**
 * 探索：写工具灰显 + 脚注。执行：可写芯片，审批策略仍生效。
 */
import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { surfaceForMode } from "../composer-mode"

export function ExploreCapabilityRail() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const runtimeId = useChatStore((state) => state.runtimeId)
  if (!composerChromeFor(runtimeId).executionModes) return null
  const explore = surfaceForMode(mode) === "explore"

  return (
    <div className="flex flex-col gap-1.5 px-3.5 pb-1">
      <div className="flex flex-wrap gap-1.5">
        {explore ? (
          <>
            <CapChip label={t("chat.surfaceCapSearch")} />
            <CapChip label={t("chat.surfaceCapOpen")} />
            <CapChip label={t("chat.surfaceCapWrite")} muted />
            <CapChip label={t("chat.surfaceCapTerminal")} muted />
          </>
        ) : (
          <>
            <CapChip label={t("chat.surfaceCapWriteOn")} accent />
            <CapChip label={t("chat.surfaceCapTerminalOn")} accent />
            <CapChip label={t("chat.surfaceCapApproval")} />
          </>
        )}
      </div>
      {explore ? (
        <p className="rounded-lg bg-background-tertiary-default px-2.5 py-1.5 text-caption-2-medium text-text-secondary">
          {t("chat.surfaceExploreFootnote")}
        </p>
      ) : null}
    </div>
  )
}

function CapChip({
  label,
  muted,
  accent
}: {
  label: string
  muted?: boolean
  accent?: boolean
}) {
  return (
    <span
      className={cx(
        "rounded-md px-2 py-0.5 text-caption-2-medium ring-1",
        muted &&
          "bg-background-tertiary-default/80 text-text-tertiary/50 ring-border-button-default line-through",
        accent && "bg-accent-500/10 text-accent-600 ring-accent-500/20",
        !muted && !accent && "bg-background-tertiary-default text-text-secondary ring-border-button-default"
      )}
    >
      {label}
    </span>
  )
}
