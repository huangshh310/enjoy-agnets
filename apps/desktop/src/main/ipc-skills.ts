/**
 * Agent 技能包 (Skills) IPC 频道注册。
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

export const SKILLS_CHANNELS = [
  "skills.list",
  "skills.read",
  "skills.create",
  "skills.delete",
  "skills.reveal"
] as const

export function registerSkillsIpc() {
  ipcMain.handle("skills.list", (_event, raw) => {
    const parsed = SkillListInput.parse(raw ?? {})
    return listInstalledSkills(parsed)
  })

  ipcMain.handle("skills.read", (_event, raw) => {
    const parsed = SkillReadInput.parse(raw)
    return readSkillContent(parsed.skillFilePath)
  })

  ipcMain.handle("skills.create", (_event, raw) => {
    const parsed = SkillCreateInput.parse(raw)
    return createSkillPackage(parsed)
  })

  ipcMain.handle("skills.delete", (_event, raw) => {
    const parsed = SkillDeleteInput.parse(raw)
    return deleteSkillPackage(parsed.directoryPath)
  })

  ipcMain.handle("skills.reveal", (_event, raw) => {
    const parsed = SkillRevealInput.parse(raw)
    revealSkillFolder(parsed.directoryPath)
    return { ok: true }
  })
}
