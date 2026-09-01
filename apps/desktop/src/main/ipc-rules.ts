/**
 * 多 Agent 规则 IPC。读删定位必须落在允许根；工作区路径必须已登记。
 */
import { ipcMain } from "electron"
import {
  RuleCreateInput,
  RuleDeleteInput,
  RuleListInput,
  RuleReadInput,
  RuleRevealInput
} from "@enjoy-agents/ipc-contract"
import {
  createRuleFile,
  deleteRuleFile,
  listDiscoveredRules,
  readRuleContent,
  revealRuleFile
} from "./services/rules-service"
import { registeredWorkspaceRoots, resolveCustomizeWorkspace } from "./services/customize-workspace"

export const RULES_CHANNELS = [
  "rules.list",
  "rules.read",
  "rules.create",
  "rules.delete",
  "rules.reveal"
] as const

export function registerRulesIpc() {
  ipcMain.handle("rules.list", async (_event, raw) => {
    const parsed = RuleListInput.parse(raw ?? {})
    const roots = await registeredWorkspaceRoots()
    const workspacePath = parsed.workspacePath
      ? await resolveCustomizeWorkspace(parsed.workspacePath)
      : undefined
    if (workspacePath) return listDiscoveredRules({ workspacePath })
    const merged = listDiscoveredRules()
    const seen = new Set(merged.map((item) => item.filePath.toLowerCase()))
    for (const root of roots) {
      for (const item of listDiscoveredRules({ workspacePath: root })) {
        const key = item.filePath.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(item)
      }
    }
    return merged
  })

  ipcMain.handle("rules.read", async (_event, raw) => {
    const parsed = RuleReadInput.parse(raw)
    return readRuleContent(parsed.filePath, await registeredWorkspaceRoots())
  })

  ipcMain.handle("rules.create", async (_event, raw) => {
    const parsed = RuleCreateInput.parse(raw)
    const workspacePath =
      parsed.targetKind === "global" ? undefined : await resolveCustomizeWorkspace(parsed.workspacePath)
    if (parsed.targetKind !== "global" && !workspacePath) {
      throw new Error("Open a workspace first.")
    }
    return createRuleFile({ ...parsed, workspacePath })
  })

  ipcMain.handle("rules.delete", async (_event, raw) => {
    const parsed = RuleDeleteInput.parse(raw)
    return deleteRuleFile(parsed.filePath, await registeredWorkspaceRoots())
  })

  ipcMain.handle("rules.reveal", async (_event, raw) => {
    const parsed = RuleRevealInput.parse(raw)
    revealRuleFile(parsed.filePath, await registeredWorkspaceRoots())
    return { ok: true }
  })
}
