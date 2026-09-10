/**
 * 应用偏好：工具审批开关、语言、默认模式。主进程读写，渲染进程经 IPC 改。
 */
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"

export type AppPreferences = SettingsSnapshot["preferences"]

function e2eLanguage(): "zh" | "en" {
  if (process.env.ENJOY_E2E_LANG === "en") return "en"
  if (process.env.ENJOY_E2E_STUB === "1") return "en"
  return "zh"
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true,
  permissionMode: "allow-reads",
  codingRuntime: "local",
  runtimeId: "enjoy-local",
  language: "zh",
  defaultMode: "agent",
  customInstructions: "",
  telemetryPolicy: "local",
  knowledgeAutoIndex: false,
  workflowAutoResume: true,
  sandboxNetwork: false,
  experimentalMedia: false,
  maxAgentSteps: 20,
  agentTimeoutMs: 0,
  toolTimeoutMs: 30_000,
  stepTimeoutMs: 0,
  desktopPush: true,
  agentCompleteSound: true,
  approvalRequiredAlert: true
}

/** 读取持久化偏好；损坏或缺失时回落到安全默认（写盘/命令都要确认）。 */
export function readPreferences(): AppPreferences {
  const raw = getSetting("preferences")
  const defaults = { ...DEFAULT_PREFERENCES, language: e2eLanguage() }
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

/** 合并补丁后写回。 */
export function writePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = { ...readPreferences(), ...patch }
  setSetting("preferences", JSON.stringify(next))
  return next
}
