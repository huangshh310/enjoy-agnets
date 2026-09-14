/**
 * 当前引擎消费宿主目录；各家家目录只作只读发现。
 */
import type { InstalledSkillItem, SkillTargetId } from "@enjoy-agents/ipc-contract"

const HOST_TARGET_IDS: SkillTargetId[] = ["enjoy-agents", "workspace-agents"]

/** 来源组是否已投影到 Enjoy 全局或工作区宿主目录。 */
export function hostCatalogEnabled(ids: readonly string[]): boolean {
  return ids.includes("enjoy-agents") || ids.includes("workspace-agents")
}

/** 卡片只画宿主目录徽标，丢掉残留的 Claude/Cursor 家目录勾选。 */
export function hostEnabledTargetIds(ids: readonly SkillTargetId[]): SkillTargetId[] {
  return ids.filter((id) => HOST_TARGET_IDS.includes(id))
}

/**
 * 整备舱 / 详情卡切换投影目标。
 * 宿主目标可真正卸下（允许空列表）；点到各家家目录时只导入 enjoy-agents。
 */
export function nextHostTargetIds(current: SkillTargetId[], targetId: SkillTargetId): SkillTargetId[] {
  if (HOST_TARGET_IDS.includes(targetId)) {
    return current.includes(targetId)
      ? current.filter((id) => id !== targetId)
      : [...current, targetId]
  }
  return hostCatalogEnabled(current) ? current : [...current, "enjoy-agents"]
}

export function skillVisibleForTarget(skill: InstalledSkillItem, targetId: string): boolean {
  const host = hostCatalogEnabled(skill.enabledTargetIds)
  if (targetId === "enjoy-agents") return host
  return host || skill.enabledTargetIds.includes(targetId as SkillTargetId)
}
