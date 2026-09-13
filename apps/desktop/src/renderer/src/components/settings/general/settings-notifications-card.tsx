/**
 * 通用设置 → 通知与声音反馈卡片：
 * 管理桌面通知、审批等待弹窗提醒与 Agent 任务完成提示音。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { SettingsCard, SettingsRow } from "../settings-row"

interface SettingsNotificationsCardProps {
  desktopPush: boolean
  approvalRequiredAlert: boolean
  agentCompleteSound: boolean
  onChange: (patch: {
    desktopPush?: boolean
    approvalRequiredAlert?: boolean
    agentCompleteSound?: boolean
  }) => void
}

export function SettingsNotificationsCard({
  desktopPush,
  approvalRequiredAlert,
  agentCompleteSound,
  onChange
}: SettingsNotificationsCardProps) {
  const t = useT()

  return (
    <SettingsCard title={t("pages.account.notifications.title") || "通知与声音反馈"}>
      <SettingsRow
        title={t("pages.account.notifications.desktopTitle")}
        description={t("pages.account.notifications.desktopDesc")}
      >
        <button
          type="button"
          onClick={() => onChange({ desktopPush: !desktopPush })}
          className={cx(
            "cursor-pointer rounded-lg border px-3 py-1 text-caption-1-medium font-medium transition-colors",
            desktopPush
              ? "border-state-success-text/30 bg-state-success-text/10 text-state-success-text"
              : "border-separator-border bg-background-secondary-default text-text-secondary"
          )}
        >
          {desktopPush ? t("pages.account.notifications.on") : t("pages.account.notifications.off")}
        </button>
      </SettingsRow>

      <SettingsRow
        title={t("pages.account.notifications.approvalTitle")}
        description={t("pages.account.notifications.approvalDesc")}
      >
        <button
          type="button"
          onClick={() => onChange({ approvalRequiredAlert: !approvalRequiredAlert })}
          className={cx(
            "cursor-pointer rounded-lg border px-3 py-1 text-caption-1-medium font-medium transition-colors",
            approvalRequiredAlert
              ? "border-state-success-text/30 bg-state-success-text/10 text-state-success-text"
              : "border-separator-border bg-background-secondary-default text-text-secondary"
          )}
        >
          {approvalRequiredAlert ? t("pages.account.notifications.on") : t("pages.account.notifications.off")}
        </button>
      </SettingsRow>

      <SettingsRow
        title={t("pages.account.notifications.soundTitle")}
        description={t("pages.account.notifications.soundDesc")}
      >
        <button
          type="button"
          onClick={() => onChange({ agentCompleteSound: !agentCompleteSound })}
          className={cx(
            "cursor-pointer rounded-lg border px-3 py-1 text-caption-1-medium font-medium transition-colors",
            agentCompleteSound
              ? "border-state-success-text/30 bg-state-success-text/10 text-state-success-text"
              : "border-separator-border bg-background-secondary-default text-text-secondary"
          )}
        >
          {agentCompleteSound ? t("pages.account.notifications.on") : t("pages.account.notifications.off")}
        </button>
      </SettingsRow>
    </SettingsCard>
  )
}
