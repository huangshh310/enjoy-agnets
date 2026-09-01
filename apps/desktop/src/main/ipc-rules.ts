/**
 * 多 Agent 规则 (Rules) IPC 频道注册。
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

export const RULES_CHANNELS = [
  "rules.list",
  "rules.read",
  "rules.create",
  "rules.delete",
  "rules.reveal"
] as const

export function registerRulesIpc() {
  ipcMain.handle("rules.list", (_event, raw) => {
    const parsed = RuleListInput.parse(raw ?? {})
    return listDiscoveredRules(parsed)
  })

  ipcMain.handle("rules.read", (_event, raw) => {
    const parsed = RuleReadInput.parse(raw)
    return readRuleContent(parsed.filePath)
  })

  ipcMain.handle("rules.create", (_event, raw) => {
    const parsed = RuleCreateInput.parse(raw)
    return createRuleFile(parsed)
  })

  ipcMain.handle("rules.delete", (_event, raw) => {
    const parsed = RuleDeleteInput.parse(raw)
    return deleteRuleFile(parsed.filePath)
  })

  ipcMain.handle("rules.reveal", (_event, raw) => {
    const parsed = RuleRevealInput.parse(raw)
    revealRuleFile(parsed.filePath)
    return { ok: true }
  })
}
