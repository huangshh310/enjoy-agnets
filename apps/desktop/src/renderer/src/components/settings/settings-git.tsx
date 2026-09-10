/**
 * Settings → Git：版本控制与提交偏好设置。
 * 支持 Git 提交人工确认开关、代码 Diff 预览偏好与 Conventional Commit 智能提交规范。
 */
import { RiGitBranchLine } from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { useQuery } from "@tanstack/react-query"
import type { ChangedFile } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"
import { useT } from "@renderer/i18n"

export function GitSettings() {
  const t = useT()
  const { preferences, update } = usePrefUpdate()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const changesQuery = useQuery({
    queryKey: ["changes", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().workspace.changes({ workspaceId }) as Promise<ChangedFile[]>
  })
  const changes = changesQuery.data ?? []
  const additions = changes.reduce((sum, file) => sum + (file.additions ?? 0), 0)
  const deletions = changes.reduce((sum, file) => sum + (file.deletions ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 当前 Git 状态概览看板 ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <RiGitBranchLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  {t("settings.git.hubTitle")}
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  {t("settings.git.hubBadge")}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                {t("settings.git.hubDesc")}
              </span>
            </div>
          </div>
        </div>

        {/* 变更汇总统计 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-separator-border">
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.git.modified")}</span>
            <span className="text-title-3-semibold text-text-primary mt-0.5">{changes.length}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.git.additions")}</span>
            <span className="text-title-3-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              +{additions}
            </span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.git.deletions")}</span>
            <span className="text-title-3-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              -{deletions}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 提交与安全审批偏好 ───────────────────────────── */}
      <SettingsCard title={t("settings.git.prefs")}>
        <SettingsRow
          title={t("settings.git.requireApproval")}
          description={t("settings.git.requireApprovalDesc")}
        >
          <Switch
            checked={preferences?.requireCommitApproval ?? true}
            onCheckedChange={(value) => void update({ requireCommitApproval: value })}
          />
        </SettingsRow>

        <SettingsRow
          title={t("settings.git.conventional")}
          description={t("settings.git.conventionalDesc")}
        >
          <span className="text-caption-2-medium text-text-tertiary">{t("settings.git.conventionalHint")}</span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
