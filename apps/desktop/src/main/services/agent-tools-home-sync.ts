/**
 * 家目录同步态：只看 *.enjoy.bak 是否还在。不读密钥、不把路径摊给 renderer。
 */
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** 可同步 CLI 的家目录配置路径；Cursor / Grok 等返回 null。 */
export function homeConfigPathFor(id: string): string | null {
  if (id === "claude") return join(homedir(), ".claude", "settings.json")
  if (id === "codex") return join(homedir(), ".codex", "config.toml")
  if (id === "opencode") return join(homedir(), ".config", "opencode", "opencode.json")
  if (id === "gemini") return join(homedir(), ".gemini", ".env")
  return null
}

/** 备份还在 = 同步过且未恢复。列表只信这个布尔，不读文件内容。 */
export function homeSyncedFor(id: string): boolean {
  const path = homeConfigPathFor(id)
  return path ? existsSync(`${path}.enjoy.bak`) : false
}
