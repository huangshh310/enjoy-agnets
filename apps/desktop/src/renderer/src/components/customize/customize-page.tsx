/**
 * Agent 定制化聚合页面 (Instructions / Skills Hub / Project Rules)：
 * 采用专业桌面 IDE 风格，管理系统级指令、技能包与项目规则。
 */
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  RiBookOpenLine,
  RiFileTextLine,
  RiSparklingLine
} from "@remixicon/react"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useT, type TranslateFn } from "@renderer/i18n"
import { InstructionsSection } from "./views/instructions-section"
import { RulesSection } from "./views/rules-section"
import { SkillsSection } from "./views/skills-section"

const CUSTOMIZE_SECTIONS = ["instructions", "skills", "rules"] as const
export type CustomizeSectionId = (typeof CUSTOMIZE_SECTIONS)[number]

function getCustomizeNav(t: TranslateFn): SecondaryNavGroup[] {
  return [
    {
      id: "agent",
      label: t("studio.customize.group"),
      items: [
        {
          id: "instructions",
          label: t("studio.customize.instructions"),
          icon: RiFileTextLine,
          keywords: ["prompt", "system", "persona", "global"]
        },
        {
          id: "skills",
          label: t("studio.customize.skillsHub"),
          icon: RiSparklingLine,
          keywords: ["skill", "agents", "markdown", "tools"]
        },
        {
          id: "rules",
          label: t("studio.customize.projectRules"),
          icon: RiBookOpenLine,
          keywords: ["cursor", "project", "conventions", "agents.md"]
        }
      ]
    }
  ]
}

export function isCustomizeSectionId(value: string): value is CustomizeSectionId {
  return (CUSTOMIZE_SECTIONS as readonly string[]).includes(value)
}

export function CustomizePage() {
  const t = useT()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const section: CustomizeSectionId = isCustomizeSectionId(params.section ?? "")
    ? (params.section as CustomizeSectionId)
    : "instructions"

  return (
    <SecondaryPageShell
      searchPlaceholder={t("studio.customize.searchPlaceholder")}
      groups={getCustomizeNav(t)}
      selectedId={section}
      onSelect={(id) => void navigate({ to: "/customize/$section", params: { section: id } })}
      contentWidth="wide"
    >
      <div className="pb-8">
        {section === "instructions" ? <InstructionsSection /> : null}
        {section === "skills" ? <SkillsSection /> : null}
        {section === "rules" ? <RulesSection /> : null}
      </div>
    </SecondaryPageShell>
  )
}
