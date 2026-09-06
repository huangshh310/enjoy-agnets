/**
 * 用户主动把供应商端点 / Key 写入本机 CLI 配置。
 * 写前备份 *.enjoy.bak；Codex 只改标记块；恢复只还原备份。
 */
import { existsSync } from "node:fs"
import { chmod, copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { AgentToolId, SyncCliConfigResult } from "@enjoy-agents/ipc-contract"
import { readAgentToolOverrides } from "./agent-tools-vault"
import { backupPathFor, mergeCodexToml } from "./cli-config-format"
import { readVault } from "./secrets-vault"

const FILE_MODE = 0o600

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
    if (id === "codex") return await syncCodexToml(id, profile)
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
    if (id === "claude") {
      return restoreFromBackup(id, join(homedir(), ".claude", "settings.json"))
    }
    if (id === "codex") {
      return restoreFromBackup(id, join(homedir(), ".codex", "config.toml"))
    }
    return { id, ok: false, message: "Nothing to restore.", configPath: null }
  } catch (err) {
    return {
      id,
      ok: false,
      message: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      configPath: null
    }
  }
}

async function resolveSyncProfile(id: AgentToolId) {
  const override = readAgentToolOverrides()[id]
  const vault = await readVault()
  const bound = override?.providerId
    ? vault.profiles.find((item) => item.id === override.providerId)
    : undefined
  if (bound?.apiKey.trim()) return bound
  return (
    vault.profiles.find((item) => item.id === vault.activeId && item.apiKey.trim()) ??
    vault.profiles.find((item) => item.apiKey.trim())
  )
}

async function syncClaudeSettings(
  id: AgentToolId,
  profile: { name: string; baseURL?: string; apiKey: string }
): Promise<SyncCliConfigResult> {
  const configPath = join(homedir(), ".claude", "settings.json")
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = await readJsonObject(configPath)
  const existingEnv =
    existing.env && typeof existing.env === "object" ? (existing.env as Record<string, string>) : {}
  existing.env = {
    ...existingEnv,
    ANTHROPIC_BASE_URL: profile.baseURL || "https://api.anthropic.com",
    ANTHROPIC_API_KEY: profile.apiKey,
    ANTHROPIC_AUTH_TOKEN: profile.apiKey
  }
  await writePrivate(configPath, `${JSON.stringify(existing, null, 2)}\n`)
  return {
    id,
    ok: true,
    message: `Synced ${profile.name} to Claude settings. Restore uses the .enjoy.bak backup.`,
    configPath
  }
}

async function syncCodexToml(
  id: AgentToolId,
  profile: { name: string; baseURL?: string; apiKey: string }
): Promise<SyncCliConfigResult> {
  const configPath = join(homedir(), ".codex", "config.toml")
  await mkdir(dirname(configPath), { recursive: true })
  await ensureBackup(configPath)
  const existing = existsSync(configPath) ? await readFile(configPath, "utf-8") : ""
  const next = mergeCodexToml(existing, {
    baseUrl: profile.baseURL || "https://api.openai.com/v1",
    apiKey: profile.apiKey,
    profileName: profile.name
  })
  await writePrivate(configPath, next)
  return {
    id,
    ok: true,
    message: `Synced ${profile.name} to Codex config. Restore uses the .enjoy.bak backup.`,
    configPath
  }
}

async function restoreFromBackup(id: AgentToolId, configPath: string): Promise<SyncCliConfigResult> {
  const bak = backupPathFor(configPath)
  if (!existsSync(bak)) {
    return {
      id,
      ok: false,
      message: "No .enjoy.bak backup. Sync once before restore.",
      configPath
    }
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

/** 只在第一次写入前备份；空备份表示原本没有这个文件。 */
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
    const parsed = JSON.parse(await readFile(path, "utf-8")) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
