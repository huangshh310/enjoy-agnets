/**
 * 技能来源增删改：宿主目录装备 / 导入，不勾 13 家家目录。
 */
import type { CuratedSkillSource, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ipcErrorMessage } from "../lib/ipc-error-message"
import { nextHostTargetIds } from "../lib/skill-visible-for-target"

export function createSkillsPageActions(input: {
  selectedNavId: string
  activeSkillId: string | null
  setSelectedNavId: (id: string) => void
  setActiveSkillId: (id: string | null) => void
  setBusyMessage: (value: string | null) => void
  setActionError: (value: string | null) => void
  refreshAll: () => Promise<void>
}) {
  async function runAction(name: string, fn: () => Promise<void>) {
    if (!hasIde()) {
      input.setActionError("Enjoy Agents IPC 不可用，请完全重启应用后再试")
      return
    }
    input.setBusyMessage(name)
    input.setActionError(null)
    try {
      await fn()
      await input.refreshAll()
    } catch (err) {
      input.setActionError(ipcErrorMessage(err))
    } finally {
      input.setBusyMessage(null)
    }
  }

  return {
    addGitSource: (origin: string, name?: string) =>
      runAction("添加技能组", async () => {
        await getIde().skills.sources.add({ kind: "git", origin: origin.trim(), name: name?.trim() })
      }),
    addLocalSource: () =>
      runAction("添加本地技能", async () => {
        const picked = await getIde().workspace.pickFolder()
        if (picked && typeof picked === "object" && "path" in picked && typeof picked.path === "string") {
          await getIde().skills.sources.add({
            kind: "local",
            origin: picked.path,
            name: "name" in picked && typeof picked.name === "string" ? picked.name : undefined
          })
        }
      }),
    installCurated: (curatedSource: CuratedSkillSource) =>
      runAction(`导入 ${curatedSource.name}`, async () => {
        const added = (await getIde().skills.sources.add({
          kind: "git",
          origin: curatedSource.locator,
          name: curatedSource.name
        })) as { id?: string }
        if (typeof added?.id !== "string" || !added.id) throw new Error("SOURCE_NOT_FOUND")
        input.setSelectedNavId(added.id)
        await getIde().skills.sources.deploy({ sourceId: added.id })
      }),
    updateSource: (sourceId: string) =>
      runAction("拉取更新", async () => {
        await getIde().skills.sources.update({ sourceId })
      }),
    deploySource: (sourceId: string) =>
      runAction("重新部署", async () => {
        await getIde().skills.sources.deploy({ sourceId })
      }),
    repairTargets: (sourceId?: string) =>
      runAction("修复目标投影", async () => {
        await getIde().skills.sources.repair({ sourceId })
      }),
    removeSource: (sourceId: string) =>
      runAction("移除技能组", async () => {
        await getIde().skills.sources.remove({ sourceId })
        if (input.selectedNavId === sourceId) input.setSelectedNavId("all")
      }),
    deleteSkill: (sourceId: string, skillId: string) =>
      runAction("删除技能", async () => {
        await getIde().skills.sources.deleteSkill({ sourceId, skillId })
        if (input.activeSkillId === skillId) input.setActiveSkillId(null)
      }),
    toggleTarget: (source: SkillSource, targetId: SkillTargetId) => {
      const nextTargets = nextHostTargetIds(source.enabledTargetIds, targetId)
      const isHost = targetId === "enjoy-agents" || targetId === "workspace-agents"
      return runAction(isHost ? "切换宿主目录" : "导入到宿主目录", async () => {
        await getIde().skills.sources.configure({
          sourceId: source.id,
          selectedSkillIds: source.selectedSkillIds,
          enabledTargetIds: nextTargets
        })
        await getIde().skills.sources.deploy({ sourceId: source.id })
      })
    },
    toggleSkill: (source: SkillSource, skillId: string) => {
      const nextSkills = source.selectedSkillIds.includes(skillId)
        ? source.selectedSkillIds.filter((id) => id !== skillId)
        : [...source.selectedSkillIds, skillId]
      return runAction("切换技能", async () => {
        await getIde().skills.sources.configure({
          sourceId: source.id,
          selectedSkillIds: nextSkills,
          enabledTargetIds: source.enabledTargetIds
        })
      })
    }
  }
}
