/**
 * 技能来源 IPC。权威状态只在 main；入参 Zod.parse。
 */
import { homedir } from "node:os"
import { ipcMain } from "electron"
import {
  SkillSourceAddInput,
  SkillSourceConfigureInput,
  SkillSourceDeleteSkillInput,
  SkillSourceDeployInput,
  SkillSourceRepairInput,
  SkillSourceIdInput
} from "@enjoy-agents/ipc-contract"
import { registeredWorkspaceRoots, resolveCustomizeWorkspace } from "./services/customize-workspace"
import { skillSourceStateRoot } from "./services/skill-sources/constants.ts"
import {
  addSkillSource,
  configureSkillSource,
  deleteSourceSkill,
  deploySkillSource,
  detailSkillSource,
  getCuratedSkillSources,
  listSkillSourceWarnings,
  overviewSkillSources,
  removeSkillSource,
  repairSkillTargets,
  updateAllSkillSources,
  updateSkillSource,
  type SkillSourceContext
} from "./services/skill-sources/source-service.ts"

export const SKILL_SOURCE_CHANNELS = [
  "skills.sources.overview",
  "skills.sources.detail",
  "skills.sources.add",
  "skills.sources.update",
  "skills.sources.remove",
  "skills.sources.deleteSkill",
  "skills.sources.configure",
  "skills.sources.deploy",
  "skills.sources.doctor",
  "skills.sources.curated",
  "skills.sources.updateAll",
  "skills.sources.repair"
] as const

export function registerSkillSourceIpc() {
  ipcMain.handle("skills.sources.overview", async () => overviewSkillSources(await skillSourceContext()))

  ipcMain.handle("skills.sources.detail", async (_event, raw) => {
    const parsed = SkillSourceIdInput.parse(raw)
    return detailSkillSource(await skillSourceContext(), parsed.sourceId)
  })

  ipcMain.handle("skills.sources.add", async (_event, raw) => {
    const parsed = SkillSourceAddInput.parse(raw)
    return addSkillSource(await skillSourceContext(), parsed)
  })

  ipcMain.handle("skills.sources.update", async (_event, raw) => {
    const parsed = SkillSourceIdInput.parse(raw)
    await updateSkillSource(await skillSourceContext(), parsed.sourceId)
    return { ok: true }
  })

  ipcMain.handle("skills.sources.remove", async (_event, raw) => {
    const parsed = SkillSourceIdInput.parse(raw)
    removeSkillSource(await skillSourceContext(), parsed.sourceId)
    return { ok: true }
  })

  ipcMain.handle("skills.sources.deleteSkill", async (_event, raw) => {
    const parsed = SkillSourceDeleteSkillInput.parse(raw)
    deleteSourceSkill(await skillSourceContext(), parsed.sourceId, parsed.skillId)
    return { ok: true }
  })

  ipcMain.handle("skills.sources.configure", async (_event, raw) => {
    const parsed = SkillSourceConfigureInput.parse(raw)
    configureSkillSource(await skillSourceContext(), parsed)
    return { ok: true }
  })

  ipcMain.handle("skills.sources.deploy", async (_event, raw) => {
    const parsed = SkillSourceDeployInput.parse(raw)
    deploySkillSource(await skillSourceContext(), parsed.sourceId)
    return { ok: true }
  })

  ipcMain.handle("skills.sources.doctor", async () => listSkillSourceWarnings(await skillSourceContext()))

  ipcMain.handle("skills.sources.curated", async () => getCuratedSkillSources())

  ipcMain.handle("skills.sources.updateAll", async () => updateAllSkillSources(await skillSourceContext()))

  ipcMain.handle("skills.sources.repair", async (_event, raw) => {
    const parsed = SkillSourceRepairInput.parse(raw ?? {})
    return repairSkillTargets(await skillSourceContext(), parsed.sourceId)
  })
}

async function skillSourceContext(): Promise<SkillSourceContext> {
  const home = homedir()
  const workspaceRoots = await registeredWorkspaceRoots()
  return {
    home,
    stateRoot: skillSourceStateRoot(home),
    workspaceRoots,
    workspacePath: await resolveCustomizeWorkspace()
  }
}
