/**
 * AGENTS.md 链：全局 → 工作区根 → cwd，每层只取一份。
 * 靠近 cwd 的文件排在后面以覆盖前面。合计默认 32KiB（Codex project_doc_max_bytes）。
 */
export const AGENTS_MD_CHAIN_BYTE_BUDGET = 32_768

export const AGENTS_MD_CANDIDATES = [
  "AGENTS.override.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md"
] as const

export const AGENTS_MD_CHAIN_HEADER = [
  "# Project instructions (AGENTS.md chain)",
  "Closer files override earlier ones. Nested files load when tools enter that directory."
].join("\n")

export const REHYDRATED_INSTRUCTIONS_NOTE =
  "Project instructions were re-read from disk after compaction. Prefer this copy over anything in the conversation summary."

export type AgentsMdLayer = {
  /** 工作区相对路径，或 `global:AGENTS.md`。 */
  relPath: string
  content: string
}

/** 每层只认一份：override > AGENTS.md > CLAUDE.md > GEMINI.md。 */
export function pickAgentsMdCandidate(fileNames: readonly string[]): string | undefined {
  const set = new Set(fileNames.map((name) => name.trim()))
  return AGENTS_MD_CANDIDATES.find((name) => set.has(name))
}

export function normalizeAgentsDirRel(dir: string): string {
  const norm = dir.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "")
  return !norm || norm === "." ? "." : norm
}

/** 被触达文件/目录对应的祖先目录（根在前）。kind 由 host 传入，避免把 `foo.bar` 目录当成文件。 */
export function instructionDirsForTouch(
  relativePath: string,
  kind?: "file" | "directory"
): string[] {
  const norm = normalizeAgentsDirRel(relativePath)
  if (norm === ".") return ["."]
  const parts = norm.split("/").filter((part) => part && part !== ".")
  const last = parts.at(-1) ?? ""
  const stripLast = kind === "directory" ? false : kind === "file" ? true : looksLikeFile(last)
  const dirParts = stripLast ? parts.slice(0, -1) : parts
  const dirs = ["."]
  let acc = ""
  for (const part of dirParts) {
    acc = acc ? `${acc}/${part}` : part
    dirs.push(acc)
  }
  return dirs
}

export function isAgentsChainFilePath(filePath: string): boolean {
  const base = filePath.replace(/\\/g, "/").split("/").at(-1) ?? ""
  return (AGENTS_MD_CANDIDATES as readonly string[]).includes(base)
}

/** 按层拼接；超预算丢掉远离 cwd 的层，优先保留后面（更近）的完整层。 */
export function formatAgentsMdChain(
  layers: readonly AgentsMdLayer[],
  budget = AGENTS_MD_CHAIN_BYTE_BUDGET
): string {
  const nonempty = layers.filter((layer) => layer.content.trim())
  if (nonempty.length === 0) return ""
  const header = AGENTS_MD_CHAIN_HEADER
  let remaining = Math.max(0, budget - utf8Bytes(header) - 2)
  const kept: string[] = []
  let omitted = 0
  for (let index = nonempty.length - 1; index >= 0; index -= 1) {
    const layer = nonempty[index]!
    const block = `## ${layer.relPath}\n${layer.content.trim()}`
    const size = utf8Bytes(block) + 2
    if (size <= remaining) {
      kept.unshift(block)
      remaining -= size
      continue
    }
    omitted = index + 1
    if (remaining > 200 && kept.length === 0) {
      kept.unshift(`${truncateUtf8(block, remaining - 1)}…`)
      remaining = 0
    }
    break
  }
  const parts = [header, ...kept]
  if (omitted > 0) {
    parts.push(`[truncated: ${omitted} AGENTS.md layer(s) exceeded ${budget} byte budget]`)
  }
  return parts.join("\n\n")
}

export function formatInstructionUpdate(layers: readonly AgentsMdLayer[]): string {
  const body = formatAgentsMdChain(layers)
  if (!body) return ""
  return `[PROJECT INSTRUCTIONS UPDATE]\n${body}`
}

function looksLikeFile(name: string): boolean {
  if ((AGENTS_MD_CANDIDATES as readonly string[]).includes(name)) return true
  const dot = name.lastIndexOf(".")
  if (dot <= 0) return false
  const ext = name.slice(dot + 1)
  return ext.length > 0 && ext.length <= 8 && !ext.includes(".")
}

/** ipc-contract 不引 DOM / Node types，按码点算 UTF-8 字节。 */
function utf8Bytes(text: string): number {
  let bytes = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code <= 0xffff) bytes += 3
    else bytes += 4
  }
  return bytes
}

function truncateUtf8(text: string, maxBytes: number): string {
  let bytes = 0
  let out = ""
  for (const char of text) {
    const size = utf8Bytes(char)
    if (bytes + size > maxBytes) break
    bytes += size
    out += char
  }
  return out
}
