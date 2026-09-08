/**
 * Composer 上沿策略一瞥。常驻可见，不是第二套 Allow/Deny。
 */
import { composerChromeFor } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { classifyApprovalPolicy, flagsFromPrefs } from "../approval-policy"
import { approvalGlanceLabel } from "../approval-policy-glance"

export function AutoApproveBar() {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const flags = flagsFromPrefs(useSettingsSnapshot().data?.preferences)
  if (!composerChromeFor(runtimeId).permission) return null

  const yolo = classifyApprovalPolicy(flags) === "allow-all"
  return (
    <div
      role="status"
      className={cx(
        "flex shrink-0 items-center px-8 py-1.5 text-caption-2-medium",
        yolo
          ? "bg-background-tertiary-error text-text-error-primary"
          : "bg-background-secondary-default/80 text-text-secondary"
      )}
    >
      <span className="truncate">{approvalGlanceLabel(flags, t)}</span>
    </div>
  )
}
