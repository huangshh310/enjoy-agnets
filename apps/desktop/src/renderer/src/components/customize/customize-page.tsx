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
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { InstructionsSection } from "./views/instructions-section"
import { RulesSection } from "./views/rules-section"
import { SkillsSection } from "./views/skills-section"

const CUSTOMIZE_SECTIONS = ["instructions", "skills", "rules"] as const
export type CustomizeSectionId = (typeof CUSTOMIZE_SECTIONS)[number]

const CUSTOMIZE_NAV = [
  {
    id: "agent",
    label: "Agent Customization",
    items: [
      {
        id: "instructions",
        label: "Instructions",
        icon: RiFileTextLine,
        keywords: ["prompt", "system", "persona", "global"]
      },
      {
        id: "skills",
        label: "Skills Hub",
        icon: RiSparklingLine,
        keywords: ["skill", "agents", "markdown", "tools"]
      },
      {
        id: "rules",
        label: "Project Rules",
        icon: RiBookOpenLine,
        keywords: ["cursor", "project", "conventions", "agents.md"]
      }
    ]
  }
]

export function isCustomizeSectionId(value: string): value is CustomizeSectionId {
  return (CUSTOMIZE_SECTIONS as readonly string[]).includes(value)
}

export function CustomizePage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const section: CustomizeSectionId = isCustomizeSectionId(params.section ?? "")
    ? (params.section as CustomizeSectionId)
    : "instructions"

  return (
    <SecondaryPageShell
      searchPlaceholder="Search customization..."
      groups={CUSTOMIZE_NAV}
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
