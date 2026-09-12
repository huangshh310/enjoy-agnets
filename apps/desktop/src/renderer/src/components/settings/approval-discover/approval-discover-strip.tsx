/**
 * 智能体设置共享审批摘要条：一行梯度 + 跳已有权限卡。
 * 禁止在这里嵌 Allow/Deny 全表或按助手分行。
 */
import { useNavigate } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { flagsFromPrefs } from "@renderer/components/ai-chat/approval-policy"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import {
  type ApprovalDiscoverOrigin,
  approvalDiscoverSearch
} from "./approval-discover-nav"
import {
  approvalGradientLinkClass,
  approvalGradientStripClass,
  approvalGradientSummaryKey,
  approvalGradientTextClass,
  approvalGradientTone
} from "./approval-gradient"

export function ApprovalDiscoverStrip({ origin }: { origin: ApprovalDiscoverOrigin }) {
  const t = useT()
  const navigate = useNavigate()
  const flags = flagsFromPrefs(useSettingsSnapshot().data?.preferences)
  const tone = approvalGradientTone(flags)
  const titleClass = approvalGradientTextClass(tone)

  return (
    <div
      data-approval-discover="strip"
      className={cx(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
        approvalGradientStripClass(tone)
      )}
    >
      <div className="min-w-0">
        <p className={cx("text-caption-2-semibold", titleClass)}>{t("settings.approvalDiscover.title")}</p>
        <p className={cx("truncate text-caption-1-regular", titleClass)}>
          {t(approvalGradientSummaryKey(tone))}
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          void navigate({
            to: "/settings/$section",
            params: { section: "general" },
            search: approvalDiscoverSearch(origin)
          })
        }
        className={cx(
          "shrink-0 text-caption-2-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          approvalGradientLinkClass(tone)
        )}
      >
        {t("settings.approvalDiscover.manage")}
      </button>
    </div>
  )
}
