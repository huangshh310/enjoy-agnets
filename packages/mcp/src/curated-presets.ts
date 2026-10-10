/**
 * 精选 MCP 身份：只认安装源写下的 preset id + 官方 command/url 指纹。
 * 显示名 github / filesystem 不能冒充精选。
 */
import { CURATED_MCP_SERVER_IDS } from "./tools.ts"

export type CuratedMcpFingerprint = {
  id: (typeof CURATED_MCP_SERVER_IDS)[number]
  transport: "stdio" | "sse" | "http"
  command?: string
  url?: string
}

export const CURATED_MCP_FINGERPRINTS: readonly CuratedMcpFingerprint[] = [
  { id: "filesystem", transport: "stdio", command: "npx -y @modelcontextprotocol/server-filesystem ." },
  { id: "everything", transport: "stdio", command: "npx -y @modelcontextprotocol/server-everything" },
  { id: "github", transport: "stdio", command: "npx -y @modelcontextprotocol/server-github" },
  { id: "postgres", transport: "stdio", command: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb" },
  { id: "sqlite", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sqlite --file ./app.db" },
  { id: "puppeteer", transport: "stdio", command: "npx -y @modelcontextprotocol/server-puppeteer" },
  { id: "brave-search", transport: "stdio", command: "npx -y @modelcontextprotocol/server-brave-search" },
  { id: "memory", transport: "stdio", command: "npx -y @modelcontextprotocol/server-memory" },
  { id: "docker", transport: "stdio", command: "npx -y @modelcontextprotocol/server-docker" },
  { id: "redis", transport: "stdio", command: "npx -y @modelcontextprotocol/server-redis redis://localhost:6379" },
  { id: "gitlab", transport: "stdio", command: "npx -y @modelcontextprotocol/server-gitlab" },
  { id: "slack", transport: "stdio", command: "npx -y @modelcontextprotocol/server-slack" },
  { id: "notion", transport: "stdio", command: "npx -y @modelcontextprotocol/server-notion" },
  { id: "linear", transport: "stdio", command: "npx -y @modelcontextprotocol/server-linear" },
  { id: "sentry", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sentry" },
  { id: "fetch", transport: "stdio", command: "npx -y @modelcontextprotocol/server-fetch" },
  { id: "sequential-thinking", transport: "stdio", command: "npx -y @modelcontextprotocol/server-sequential-thinking" },
  { id: "git", transport: "stdio", command: "npx -y @modelcontextprotocol/server-git" },
  { id: "mysql", transport: "stdio", command: "npx -y @modelcontextprotocol/server-mysql mysql://root@localhost/db" },
  { id: "playwright", transport: "stdio", command: "npx -y @modelcontextprotocol/server-playwright" }
]

const FINGERPRINT_BY_ID = new Map<string, CuratedMcpFingerprint>(
  CURATED_MCP_FINGERPRINTS.map((item) => [item.id, item])
)

export type CuratedMcpRow = {
  curatedPresetId?: string | null
  name?: string | null
  transport?: string | null
  command?: string | null
  url?: string | null
}

export function isKnownCuratedPresetId(id: string | undefined | null): boolean {
  return Boolean(id && FINGERPRINT_BY_ID.has(id))
}

export function matchesCuratedFingerprint(presetId: string, input: CuratedMcpRow): boolean {
  const preset = FINGERPRINT_BY_ID.get(presetId)
  if (!preset) return false
  if ((input.transport ?? "stdio") !== preset.transport) return false
  if (preset.command && normalizeText(input.command) !== normalizeText(preset.command)) return false
  if (preset.url && normalizeText(input.url) !== normalizeText(preset.url)) return false
  if (!preset.url && normalizeText(input.url)) return false
  return true
}

/** 库行是否仍是精选：必须有 marker，且 command/url 还对得上指纹。 */
export function isCuratedMcpIdentity(row: CuratedMcpRow): boolean {
  const id = row.curatedPresetId?.trim()
  if (!id) return false
  return matchesCuratedFingerprint(id, row)
}

/**
 * 只有精选安装可写下 marker。改名 / 改 command/url / 导入都不保留。
 */
export function resolveCuratedPresetId(input: CuratedMcpRow & { existingPresetId?: string | null }): string | null {
  const requested = input.curatedPresetId?.trim()
  if (requested && isKnownCuratedPresetId(requested) && matchesCuratedFingerprint(requested, input)) {
    return requested
  }
  const existing = input.existingPresetId?.trim()
  if (
    existing &&
    matchesCuratedFingerprint(existing, input) &&
    normalizeText(input.name) === normalizeText(existing)
  ) {
    return existing
  }
  return null
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}
