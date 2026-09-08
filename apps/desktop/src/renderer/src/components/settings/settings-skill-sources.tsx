/**
 * Settings → Agent 默认项：可选更新已配置的 Git 技能源。
 * 无 Git 源时不渲染更新按钮（禁止灰按钮），只留去 Skills 的入口。
 */
import { RiRefreshLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSkillSourcePull } from "@renderer/components/skills/hooks/use-skill-source-pull"
import { SettingsCard, SettingsRow } from "./settings-row"

export function SettingsSkillSources() {
  const t = useT()
  const navigate = useNavigate()
  const pullState = useSkillSourcePull()

  return (
    <SettingsCard title={t("settings.skillSources.title")}>
      <SettingsRow
        title={t("settings.skillSources.pull")}
        description={
          pullState.canPull
            ? t("settings.skillSources.desc", { count: pullState.gitCount })
            : t("settings.skillSources.gated")
        }
        align="start"
      >
        <div className="flex items-center gap-2">
          {pullState.canPull ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={pullState.busy}
              onClick={() => void pullState.pull()}
            >
              <RiRefreshLine className={pullState.busy ? "size-3.5 animate-spin" : "size-3.5"} />
              {pullState.busy ? t("settings.skillSources.updating") : t("settings.skillSources.update")}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => void navigate({ to: "/skills" })}>
            {t("settings.skillSources.openSkills")}
          </Button>
        </div>
      </SettingsRow>
    </SettingsCard>
  )
}
