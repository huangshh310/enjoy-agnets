/**
 * Skills IPC。包目录必须是 skill root 的直接子目录；工作区路径必须已登记。
 */
import { ipcMain } from "electron"
import {
  SkillCreateInput,
  SkillDeleteInput,
  SkillListInput,
  SkillReadInput,
  SkillRevealInput
} from "@enjoy-agents/ipc-contract"
import {
  createSkillPackage,
  deleteSkillPackage,
  listInstalledSkills,
  readSkillContent,
  revealSkillFolder
} from "./services/skills-service"
import { registeredWorkspaceRoots, resolveCustomizeWorkspace } from "./services/customize-workspace"

export const SKILLS_CHANNELS = [
  "skills.list",
  "skills.read",
  "skills.create",
  "skills.delete",
  "skills.reveal"
] as const

export function registerSkillsIpc() {
  ipcMain.handle("skills.list", async (_event, raw) => {
    const parsed = SkillListInput.parse(raw ?? {})
    const roots = await registeredWorkspaceRoots()
    const workspacePath = parsed.workspacePath
      ? await resolveCustomizeWorkspace(parsed.workspacePath)
      : undefined
    if (workspacePath) return listInstalledSkills({ workspacePath })
    const merged = listInstalledSkills()
    const seen = new Set(merged.map((item) => item.directoryPath.toLowerCase()))
    for (const root of roots) {
      for (const item of listInstalledSkills({ workspacePath: root })) {
        const key = item.directoryPath.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(item)
      }
    }
    return merged
  })

  ipcMain.handle("skills.read", async (_event, raw) => {
    const parsed = SkillReadInput.parse(raw)
    return readSkillContent(parsed.skillFilePath, await registeredWorkspaceRoots())
  })

  ipcMain.handle("skills.create", async (_event, raw) => {
    const parsed = SkillCreateInput.parse(raw)
    const workspacePath =
      parsed.scope === "workspace" ? await resolveCustomizeWorkspace(parsed.workspacePath) : undefined
    if (parsed.scope === "workspace" && !workspacePath) {
      throw new Error("Open a workspace first.")
    }
    return createSkillPackage({ ...parsed, workspacePath })
  })

  ipcMain.handle("skills.delete", async (_event, raw) => {
    const parsed = SkillDeleteInput.parse(raw)
    return deleteSkillPackage(parsed.directoryPath, await registeredWorkspaceRoots())
  })

  ipcMain.handle("skills.reveal", async (_event, raw) => {
    const parsed = SkillRevealInput.parse(raw)
    revealSkillFolder(parsed.directoryPath, await registeredWorkspaceRoots())
    return { ok: true }
  })
}
