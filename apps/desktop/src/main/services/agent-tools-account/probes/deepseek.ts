/**
 * DeepSeek Harness (dsh)：
 * 探测 ~/.dsh/.credentials.yaml、DEEPSEEK_API_KEY 环境变量与 Enjoy 绑定凭据。
 * 映射官方生产模型 deepseek-chat 与 deepseek-reasoner。
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness/catalogs"

export function checkDeepSeekAuth(): {
  loggedIn: boolean
  authMethod?: string
  organization?: string
  accountName?: string
} {
  // 1. 检查环境变量 DEEPSEEK_API_KEY
  const envKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (envKey) {
    return {
      loggedIn: true,
      authMethod: "Environment (DEEPSEEK_API_KEY)",
      organization: "DeepSeek",
      accountName: "API Key (env)"
    }
  }

  // 2. 检查 ~/.dsh 凭据与配置文件
  const dshHome = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh")
  const credPath = join(dshHome, ".credentials.yaml")
  const settingsPath = join(dshHome, "settings.yaml")

  if (existsSync(credPath)) {
    try {
      const content = readFileSync(credPath, "utf8")
      // 检查 records: 节点下是否存在凭据记录
      if (/records:\s*\n\s+\S+/i.test(content) || /deepseek/i.test(content)) {
        return {
          loggedIn: true,
          authMethod: "dsh web / credentials",
          organization: "DeepSeek",
          accountName: "dsh credentials"
        }
      }
    } catch {
      // 容错兜底
    }
  }

  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, "utf8")
      if (/deepseek/i.test(content) || /apiKey/i.test(content) || /providers:/i.test(content)) {
        return {
          loggedIn: true,
          authMethod: "dsh settings.yaml",
          organization: "DeepSeek",
          accountName: "dsh config"
        }
      }
    } catch {
      // 容错兜底
    }
  }

  return {
    loggedIn: false,
    authMethod: "Run 'dsh web' or export DEEPSEEK_API_KEY",
    organization: "DeepSeek"
  }
}

export async function probeDeepseek(
  _command: string,
  _cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const authAccount = checkDeepSeekAuth()
  const catalogModels = catalogFor("deepseek")?.models

  const models =
    catalogModels && catalogModels.length > 0
      ? [...catalogModels]
      : [
          { id: "deepseek-chat", label: "DeepSeek-V3 (Chat)" },
          { id: "deepseek-reasoner", label: "DeepSeek-R1 (Reasoner)" }
        ]

  return {
    authAccount,
    quotaInfo: {
      hasQuota: false
    },
    models
  }
}
