/**
 * Settings → Agent 默认项：可选拉取已配置的 Git 技能源。
 * 无 Git 源时按钮禁用，引导去 #/skills 导入。
 */
import { RiRefreshLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSkillSourcePull } from "@renderer/components/skills/hooks/use-skill-source-pull"
import { summarizePullResult } from "@renderer/components/skills/lib/git-skill-sources"
import { SettingsCard, SettingsRow } from "./settings-row"

export function SettingsSkillSources() {
  const t = useT()
  const navigate = useNavigate()
  const pullState = useSkillSourcePull()
  const status = pullState.lastResult ? summarizePullResult(pullState.lastResult) : null

  return (
    <SettingsCard title={t("settings.skillSources.title")}>
      <SettingsRow
        title={t("settings.skillSources.pull")}
        description={rowDescription(t, pullState, status)}
        align="start"
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!pullState.canPull || pullState.busy}
            onClick={() => void pullState.pull()}
          >
            <RiRefreshLine className={pullState.busy ? "size-3.5 animate-spin" : "size-3.5"} />
            {pullState.busy ? t("settings.skillSources.pulling") : t("settings.skillSources.pullNow")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void navigate({ to: "/skills" })}
          >
            {t("settings.skillSources.openSkills")}
          </Button>
        </div>
      </SettingsRow>
    </SettingsCard>
  )
}

function rowDescription(
  t: ReturnType<typeof useT>,
  pullState: ReturnType<typeof useSkillSourcePull>,
  status: ReturnType<typeof summarizePullResult> | null
): string {
  if (pullState.error) return pullState.error
  if (status === "ok") {
    return t("settings.skillSources.done", { count: pullState.lastResult!.updatedCount })
  }
  if (status === "partial") return t("settings.skillSources.partial")
  if (status === "empty") return t("settings.skillSources.empty")
  if (!pullState.canPull) return t("settings.skillSources.gated")
  return t("settings.skillSources.desc", { count: pullState.gitCount })
}
