/**
 * 可移植插件导入：只收 Agent Plugins / Claude 的 skills + mcp 子集。
 * Cordis / hooks / OpenCode TS 拒绝执行，也不假装已导入。
 */
import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, join, resolve } from "node:path"

export type ImportedMcpServer = {
  name: string
  transport: "stdio" | "http" | "sse"
  command?: string
  url?: string
}

export type PluginImportInspect = {
  kind: "portable" | "skills-dir" | "rejected"
  skillsRoot: string
  mcpServers: ImportedMcpServer[]
  reason?: string
}

export function inspectPluginImportRoot(dir: string): PluginImportInspect {
  const root = resolve(dir)
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return { kind: "rejected", skillsRoot: root, mcpServers: [], reason: "PLUGIN_NOT_FOUND" }
  }
  if (isNativeOnlyRuntime(root) && !hasPortableManifest(root)) {
    return { kind: "rejected", skillsRoot: root, mcpServers: [], reason: "PLUGIN_NOT_PORTABLE" }
  }
  const manifest = readPortableManifest(root)
  if (!manifest) {
    return { kind: "skills-dir", skillsRoot: root, mcpServers: readMcpFiles(root) }
  }
  const skillsRoot = resolveSkillsRoot(root, manifest)
  const mcpServers = [...readMcpFromManifest(manifest), ...readMcpFiles(root)]
  if (!hasSkillPackages(skillsRoot) && mcpServers.length === 0) {
    return { kind: "rejected", skillsRoot, mcpServers: [], reason: "PLUGIN_NOT_PORTABLE" }
  }
  return { kind: "portable", skillsRoot, mcpServers }
}

function hasPortableManifest(root: string): boolean {
  return existsSync(join(root, "plugin.json")) || existsSync(join(root, ".claude-plugin", "plugin.json"))
}

function isNativeOnlyRuntime(root: string): boolean {
  if (existsSync(join(root, "cordis.patch.yml"))) return true
  if (existsSync(join(root, "hooks", "hooks.json"))) return true
  const pkg = readJson(join(root, "package.json"))
  if (pkg && typeof pkg === "object" && pkg !== null && "dsh" in pkg) return true
  return existsSync(join(root, "index.ts")) && existsSync(join(root, "plugin.ts"))
}

function readPortableManifest(root: string): Record<string, unknown> | null {
  const paths = [join(root, "plugin.json"), join(root, ".claude-plugin", "plugin.json")]
  for (const file of paths) {
    const json = readJson(file)
    if (json && typeof json === "object" && !Array.isArray(json)) return json as Record<string, unknown>
  }
  return null
}

function resolveSkillsRoot(root: string, manifest: Record<string, unknown>): string {
  const raw = manifest.skills
  if (typeof raw === "string" && raw.trim()) return resolve(root, raw)
  if (Array.isArray(raw) && typeof raw[0] === "string") return resolve(root, raw[0])
  const nested = join(root, "skills")
  return existsSync(nested) ? nested : root
}

function hasSkillPackages(skillsRoot: string): boolean {
  if (!existsSync(skillsRoot)) return false
  if (existsSync(join(skillsRoot, "SKILL.md")) || existsSync(join(skillsRoot, "skill.md"))) return true
  try {
    return statSync(skillsRoot).isDirectory()
  } catch {
    return false
  }
}

function readMcpFromManifest(manifest: Record<string, unknown>): ImportedMcpServer[] {
  return parseMcpMap(manifest.mcpServers)
}

function readMcpFiles(root: string): ImportedMcpServer[] {
  const files = [join(root, "mcp.json"), join(root, ".mcp.json")]
  const out: ImportedMcpServer[] = []
  for (const file of files) {
    const json = readJson(file)
    if (!json || typeof json !== "object" || Array.isArray(json)) continue
    const rec = json as Record<string, unknown>
    out.push(...parseMcpMap(rec.mcpServers ?? rec))
  }
  return uniqueMcp(out)
}

function parseMcpMap(value: unknown): ImportedMcpServer[] {
  if (!value || typeof value !== "object") return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => rowFromUnknown(item)).filter((row): row is ImportedMcpServer => Boolean(row))
  }
  const out: ImportedMcpServer[] = []
  for (const [name, spec] of Object.entries(value as Record<string, unknown>)) {
    const row = rowFromUnknown(spec, name)
    if (row) out.push(row)
  }
  return out
}

function rowFromUnknown(value: unknown, fallbackName?: string): ImportedMcpServer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const rec = value as Record<string, unknown>
  const name = String(rec.name ?? fallbackName ?? "").trim() || basename(String(rec.command ?? "mcp"))
  const url = typeof rec.url === "string" ? rec.url : undefined
  const command = typeof rec.command === "string" ? rec.command : undefined
  if (url) {
    const transport = rec.transport === "sse" ? "sse" : "http"
    return { name, transport, url }
  }
  if (command) {
    const args = Array.isArray(rec.args) ? rec.args.filter((item) => typeof item === "string") : []
    const line = [command, ...args].join(" ")
    return { name, transport: "stdio", command: line }
  }
  return undefined
}

function uniqueMcp(rows: ImportedMcpServer[]): ImportedMcpServer[] {
  const seen = new Set<string>()
  const out: ImportedMcpServer[] = []
  for (const row of rows) {
    const key = `${row.name}:${row.transport}:${row.command ?? row.url ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function readJson(file: string): unknown {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown
  } catch {
    return null
  }
}
