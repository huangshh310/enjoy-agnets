/**
 * 已选技能 Chip：/summarize 这种，发送时变成 read_file 指令。
 */
import { RiCloseLine } from "@remixicon/react"
import { useSyncExternalStore } from "react"
import { useT } from "@renderer/i18n"
import {
  listComposerSkillChips,
  removeComposerSkillChip,
  subscribeComposerSkillChips
} from "./composer-skill-chips.ts"

export function ComposerSkillChipBar() {
  const t = useT()
  const skills = useSyncExternalStore(
    subscribeComposerSkillChips,
    listComposerSkillChips,
    listComposerSkillChips
  )
  if (skills.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      {skills.map((skill) => {
        const label = skill.slash ? `/${skill.slash}` : skill.name
        return (
          <span
            key={skill.id}
            data-testid="composer-skill-chip"
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-600"
          >
            <span className="truncate">{label}</span>
            <button
              type="button"
              aria-label={t("chat.removeSkill", { name: label })}
              onClick={() => removeComposerSkillChip(skill.id)}
              className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full hover:bg-accent-500/15 hover:text-text-primary"
            >
              <RiCloseLine className="size-3" aria-hidden />
            </button>
          </span>
        )
      })}
    </div>
  )
}
