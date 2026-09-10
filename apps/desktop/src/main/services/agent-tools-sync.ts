/**
 * 用户主动把供应商端点写入本机 CLI 配置。
 * 写前备份 *.enjoy.bak；Key 尽量走 env / env_key，不写 auth.json。
 */
import { existsSync } from "node:fs"
import { chmod, copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { AgentToolId, SyncCliConfigResult } from "@enjoy-agents/ipc-contract"
import { homeConfigPathFor } from "./agent-tools-home-sync"
import { readAgentToolOverrides } from "./agent-tools-vault"
import {
  backupPathFor,
  mergeCodexToml,
  mergeGeminiEnv,
  mergeOpenCodeJson
} from "./cli-config-format"
import { codexWireApiFor, openCodeNpmFor } from "./provider-bind-env"
import { readVault } from "./secrets-vault"

const FILE_MODE = 0o600

type SyncProfile = {
  name: string
  baseURL?: string
  apiKey: string
  kind?: string
  apiStyle?: string
  modelId?: string
}

export async function syncCliConfig(id: AgentToolId): Promise<SyncCliConfigResult> {
  const profile = await resolveSyncProfile(id)
  if (!profile) {
    return {
      id,
      ok: false,
      message: "No provider API key. Bind a profile in Providers first.",
      configPath: null
    }
  }
  try {
    if (id === "claude") return await syncClaudeSettings(id, profile)
    if (id === "codex") return await syncCodexTomlFile(id, profile)
    if (id === "opencode") return await syncOpenCodeJsonFile(id, profile)
    if (id === "gemini") return await syncGeminiEnvFile(id, profile)
    return {
      id,
      ok: false,
      message: `This agent (${id}) cannot sync home-dir config.`,
      configPath: null
    }
  } catch (err) {
    return {
      id,
      ok: false,
      message: `Write failed: ${err instanceof Error ? err.message : String(err)}`,
      configPath: null
    }
  }
}

export async function restoreCliConfig(id: AgentToolId): Promise<SyncCliConfigResult> {
  try {
    const configPath = homeConfigPathFor(id)
    if (!configPath) return { id, ok: false, message: "Nothing to restore.", configPath: null }
    return restoreFromBackup(id, configPath)
  } catch (err) {
    return {
      id,
      ok: false,
      message: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      configPath: null
    }
  }
}

/** 同步只写当前绑定档案，禁止回落到「任意有 Key 的 vault」。 */
async function resolveSyncProfile(id: AgentToolId): Promise<SyncProfile | null> {
  const override = readAgentToolOverrides()[id]
  if (!override?.useCustomProvider || !override.providerId) return null
  const vault = await readVault()
  const profile = vault.profiles.find((item) => item.id === override.providerId)
  if (!profile?.apiKey.trim()) return null
  return {
    name: profile.name,
    baseURL: profile.baseURL,
    apiKey: profile.apiKey,
    kind: profile.kind,
    apiStyle: profile.apiStyle,
    modelId: override.modelId || profile.modelId
  }
}

async function syncClaudeSettings(id: AgentToolId, profile: SyncProfile): Promise<SyncCliConfigResult> {
  const configPath = requireHomePath(id)
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = await readJsonObject(configPath)
  const existingEnv =
    existing.env && typeof existing.env === "object" ? (existing.env as Record<string, string>) : {}
  const env: Record<string, string> = {
    ...existingEnv,
    ANTHROPIC_BASE_URL: profile.baseURL || "https://api.anthropic.com",
    ANTHROPIC_API_KEY: profile.apiKey,
    ANTHROPIC_AUTH_TOKEN: profile.apiKey
  }
  if (profile.modelId?.trim()) env.ANTHROPIC_MODEL = profile.modelId.trim()
  existing.env = env
  await writePrivate(configPath, `${JSON.stringify(existing, null, 2)}\n`)
  return okResult(id, profile.name, "Claude settings", configPath)
}

async function syncCodexTomlFile(id: AgentToolId, profile: SyncProfile): Promise<SyncCliConfigResult> {
  const configPath = requireHomePath(id)
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = existsSync(configPath) ? await readFile(configPath, "utf-8") : ""
  const next = mergeCodexToml(existing, {
    baseUrl: profile.baseURL || "https://api.openai.com/v1",
    profileName: profile.name,
    model: profile.modelId,
    wireApi: codexWireApiFor(profile)
  })
  await writePrivate(configPath, next)
  return okResult(id, profile.name, "Codex config", configPath)
}

async function syncOpenCodeJsonFile(id: AgentToolId, profile: SyncProfile): Promise<SyncCliConfigResult> {
  const configPath = requireHomePath(id)
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = existsSync(configPath) ? await readFile(configPath, "utf-8") : ""
  const next = mergeOpenCodeJson(existing, {
    name: profile.name,
    baseUrl: profile.baseURL || "https://api.openai.com/v1",
    model: profile.modelId,
    npm: openCodeNpmFor(profile)
  })
  await writePrivate(configPath, next)
  return okResult(id, profile.name, "OpenCode config", configPath)
}

async function syncGeminiEnvFile(id: AgentToolId, profile: SyncProfile): Promise<SyncCliConfigResult> {
  const configPath = requireHomePath(id)
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = existsSync(configPath) ? await readFile(configPath, "utf-8") : ""
  const next = mergeGeminiEnv(existing, {
    apiKey: profile.apiKey,
    baseUrl: profile.baseURL,
    model: profile.modelId
  })
  await writePrivate(configPath, next)
  return okResult(id, profile.name, "Gemini env", configPath)
}

function requireHomePath(id: AgentToolId): string {
  const path = homeConfigPathFor(id)
  if (!path) throw new Error(`This agent (${id}) cannot sync home-dir config.`)
  return path
}

function okResult(
  id: AgentToolId,
  profileName: string,
  target: string,
  configPath: string
): SyncCliConfigResult {
  return {
    id,
    ok: true,
    message: `Synced ${profileName} to ${target}. Restore uses the .enjoy.bak backup.`,
    configPath
  }
}

async function restoreFromBackup(id: AgentToolId, configPath: string): Promise<SyncCliConfigResult> {
  const bak = backupPathFor(configPath)
  if (!existsSync(bak)) {
    return { id, ok: false, message: "No .enjoy.bak backup. Sync once before restore.", configPath }
  }
  const raw = await readFile(bak, "utf-8")
  if (!raw) {
    if (existsSync(configPath)) await unlink(configPath)
    await unlink(bak)
    return { id, ok: true, message: "Removed the file Enjoy created.", configPath }
  }
  await writePrivate(configPath, raw)
  await unlink(bak)
  return { id, ok: true, message: "Restored the pre-sync backup.", configPath }
}

async function ensureBackup(configPath: string): Promise<void> {
  const bak = backupPathFor(configPath)
  if (existsSync(bak)) return
  if (existsSync(configPath)) {
    await copyFile(configPath, bak)
    await chmod(bak, FILE_MODE)
    return
  }
  await writePrivate(bak, "")
}

async function writePrivate(path: string, content: string): Promise<void> {
  await writeFile(path, content, { encoding: "utf-8", mode: FILE_MODE })
  await chmod(path, FILE_MODE)
}

async function readJsonObject(path: string): Promise<Record<string, unknown>> {
  if (!existsSync(path)) return {}
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
