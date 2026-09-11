/**
 * Codex：账号来自 login status / doctor / 公开 config.toml，不读 auth.json。
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { parseCodexDoctor, parseCodexLogin } from "../parse"
import { runSafeCli } from "../run-cli"
import { readCodexOfficialQuota } from "../session-usage"
import { officialOrEmpty } from "./shared"

export async function probeCodex(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [loginRaw, doctorRaw, officialQuota] = await Promise.all([
    runSafeCli("codex", command, ["login", "status"], { cwd }),
    runSafeCli("codex", command, ["doctor", "--json"], { cwd }),
    readCodexOfficialQuota()
  ])
  const login = loginRaw
    ? parseCodexLogin(loginRaw)
    : { loggedIn: Boolean(officialQuota?.hasQuota), authMethod: "codex login", organization: "OpenAI" }
  const doctor = doctorRaw ? parseCodexDoctor(doctorRaw) : { customProvider: false }
  const publicConfig = readCodexPublicConfig()
  const authAccount = buildCodexAccount(login, doctor, publicConfig)
  return {
    authAccount,
    quotaInfo: officialOrEmpty(
      authAccount.loggedIn,
      officialQuota,
      authAccount.tier ?? "Codex",
      publicConfig.host || publicConfig.model
    ),
    models: mergeCodexModels(publicConfig.model)
  }
}

function buildCodexAccount(
  login: ReturnType<typeof parseCodexLogin> | { loggedIn: false; authMethod: string; organization: string },
  doctor: ReturnType<typeof parseCodexDoctor> | { customProvider: boolean; cliVersion?: string },
  publicConfig: ReturnType<typeof readCodexPublicConfig>
) {
  const custom = doctor.customProvider || publicConfig.custom
  if (login.loggedIn) {
    return { ...login, cliVersion: doctor.cliVersion, currentModel: publicConfig.model }
  }
  if (custom) {
    return {
      loggedIn: true,
      email: publicConfig.host || undefined,
      accountName: publicConfig.model || "Codex CLI",
      tier: "CUSTOM",
      authMethod: "custom endpoint",
      organization: publicConfig.host || "OpenAI compatible",
      cliVersion: doctor.cliVersion,
      currentModel: publicConfig.model
    }
  }
  return { ...login, cliVersion: doctor.cliVersion, currentModel: publicConfig.model }
}

function readCodexPublicConfig(): { custom: boolean; model?: string; host?: string } {
  const configPath = join(homedir(), ".codex", "config.toml")
  if (!existsSync(configPath)) return { custom: false }
  try {
    const content = readFileSync(configPath, "utf-8")
    const custom =
      content.includes('model_provider = "custom"') || content.includes("[model_providers.custom]")
    const model = content.match(/model\s*=\s*"([^"]+)"/)?.[1]?.trim()
    const host = content
      .match(/base_url\s*=\s*"([^"]+)"/)?.[1]
      ?.replace(/^https?:\/\//, "")
      .split("/")[0]
    return { custom, model, host }
  } catch {
    return { custom: false }
  }
}

function mergeCodexModels(configured?: string) {
  const models = [...(catalogFor("codex")?.models ?? [])]
  if (configured && !models.some((item) => item.id === configured)) {
    models.unshift({ id: configured, label: configured })
  }
  return models
}
