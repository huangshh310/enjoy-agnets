/**
 * 设置 → 技能：正文内嵌技能页，侧栏不换轨。要独立中心再点「打开技能中心」。
 */
import { useNavigate } from "@tanstack/react-router"
import { SkillsPage } from "@renderer/components/skills/skills-page"
import { useT } from "@renderer/i18n"
import { SettingsHubEmbed } from "./settings-hub-embed"

export function SkillsSettings() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <SettingsHubEmbed
      openLabel={t("settings.skills.openHub")}
      onOpenHub={() =>
        void navigate({ to: "/skills", search: { from: "settings", section: "skills" } })
      }
    >
      <SkillsPage embedded />
    </SettingsHubEmbed>
  )
}
