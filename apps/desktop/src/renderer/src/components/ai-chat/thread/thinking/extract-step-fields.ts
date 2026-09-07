/**
 * 步骤树字段：命令串、工具路径、浏览子页。
 * 对标 monocode extractToolPreview & inputRecords 算法，彻底解决嵌套 args 提取不到真实路径的问题。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { SubPageItem } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import { looksLikeToolPath, normalizeToolPath } from "./looks-like-tool-path.ts"

const COMMAND_KEYS = ["command", "cmd", "script", "code", "input"] as const

const PATH_KEYS = [
  "path",
  "file",
  "file_path",
  "filePath",
  "target_file",
  "targetFile",
  "filename",
  "relative_workspace_path",
  "uri",
  "absolutePath"
] as const

/** 扁平化展开所有嵌套的参数袋（对标 monocode inputRecords） */
export function inputRecords(...values: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const seen = new Set<object>()
  const add = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) {
      for (const item of value) add(item)
      return
    }
    const rec = parseRecord(value)
    if (!rec || Object.keys(rec).length === 0 || seen.has(rec)) return
    seen.add(rec)
    out.push(rec)
    add(rec.arguments)
    add(rec.args)
    add(rec.params)
    add(rec.input)
    add(rec.rawInput)
    add(rec.raw_input)
    add(rec.content)
    add(rec.locations)
    add(rec.location)
  }
  for (const value of values) add(value)
  return out
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(value.trim())
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {}
  }
  return null
}

export function extractCommandString(tool: ThreadToolCall): string | undefined {
  const records = inputRecords(tool.args, tool.argsText, tool.result)
  for (const rec of records) {
    for (const key of COMMAND_KEYS) {
      const val = rec[key]
      if (typeof val === "string" && val.trim()) return val.trim()
    }
    if (Array.isArray(rec.argv) && rec.argv.length > 0 && rec.argv.every((x) => typeof x === "string")) {
      return rec.argv.join(" ")
    }
    if (Array.isArray(rec.args) && rec.args.length > 0 && rec.args.every((x) => typeof x === "string")) {
      return rec.args.join(" ")
    }
  }

  // 纯文本命令降级
  if (typeof tool.args === "string" && tool.args.trim() && !tool.args.trim().startsWith("{")) {
    return tool.args.trim()
  }
  return undefined
}

export function extractToolPath(args: Record<string, unknown>, toolName?: string, result?: Record<string, unknown>): string {
  const records = inputRecords(args)
  for (const rec of records) {
    for (const key of PATH_KEYS) {
      const taken = takePath(rec[key])
      if (taken) return taken
    }
  }
  const fromTitle = pathFromTitle(toolName)
  if (fromTitle) return fromTitle
  if (result) {
    const fromResultContent = inferPathFromContent(result.content)
    if (fromResultContent) return fromResultContent
  }
  return ""
}

export function inferPathFromContent(content: unknown): string | undefined {
  if (typeof content !== "string" || !content.trim()) return undefined
  const text = content.trim()

  // 1. JSON 格式优先
  if (text.startsWith("{")) {
    if (text.includes('"scripts"') || text.includes('"dependencies"') || text.includes('"version"')) {
      return "package.json"
    }
    if (text.includes('"compilerOptions"')) {
      return "tsconfig.json"
    }
    return "config.json"
  }

  // 2. Markdown / Skill Frontmatter
  if (text.startsWith("---") && (text.includes("name:") || text.includes("description:"))) {
    const nameMatch = text.match(/name:\s*([a-zA-Z0-9_\-]+)/)
    return nameMatch?.[1] ? `${nameMatch[1]}.md` : "SKILL.md"
  }
  if (text.startsWith("# ")) {
    return "README.md"
  }

  // 3. 注释中的明确路径 (// src/... 或 /* ... path: ... */)
  const commentPath = text.match(/(?:\/\/|\/\*|\*)\s*([a-zA-Z0-9_\-./\\]+\.[a-z0-9]{1,10})/i)
  if (commentPath?.[1] && looksLikeToolPath(commentPath[1])) {
    return normalizeToolPath(commentPath[1])
  }

  // 4. CSS
  if (text.includes('@import "tailwindcss"') || text.includes("@tailwind")) {
    return "globals.css"
  }

  // 5. React 组件
  const compMatch = text.match(/export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/)
  if (compMatch?.[1]) {
    return `${compMatch[1]}.tsx`
  }

  // 6. Next.js 约定路由
  if (text.includes('from "next"') || text.includes("Metadata")) {
    if (/layout/i.test(text)) return "layout.tsx"
    if (/page/i.test(text)) return "page.tsx"
  }

  // 7. 类型文件
  if (text.match(/export\s+(?:type|interface)\s+([A-Z][a-zA-Z0-9]+)/)) {
    return "types.ts"
  }

  return undefined
}

function takePath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ""
  const path = normalizeToolPath(value)
  return looksLikeToolPath(path) ? path : ""
}

function pathFromTitle(toolName?: string): string {
  const match = String(toolName ?? "")
    .trim()
    .match(/^(?:read|write|edit|create|update|delete)(?:\s+file)?\s+(\S+)/i)
  return takePath(match?.[1] ?? "")
}

export function extractFilePaths(
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  t: TranslateFn
): SubPageItem[] {
  const candidates = collectPathCandidates(args, result)
  const unique = Array.from(new Set(candidates))
  return unique.map((raw, i) => {
    const name = raw.split(/[\\/]/).pop() || raw
    const http = raw.startsWith("http")
    return {
      id: `subpage_${i}_${name}`,
      title: http ? t("chat.visited", { url: raw }) : t("chat.readName", { name }),
      path: http ? undefined : raw
    }
  })
}

export function mapToolStatus(state: ThreadToolCall["state"]): "pending" | "running" | "completed" | "error" {
  if (state === "output-error" || state === "output-denied") return "error"
  if (state === "input-streaming" || state === "input-available" || state === "approval-requested") {
    return "running"
  }
  return "completed"
}

function collectPathCandidates(args: Record<string, unknown>, result: Record<string, unknown>): string[] {
  const candidates: string[] = []
  const records = inputRecords(args, result)
  for (const rec of records) {
    for (const key of PATH_KEYS) {
      const p = takePath(rec[key])
      if (p) candidates.push(p)
    }
    if (typeof rec.url === "string") candidates.push(rec.url)
    pushStringArray(candidates, rec.files)
    if (Array.isArray(rec.entries)) {
      for (const entry of rec.entries) {
        if (typeof entry === "string" && looksLikeToolPath(entry)) candidates.push(normalizeToolPath(entry))
        else if (entry && typeof entry === "object" && "path" in entry && typeof entry.path === "string") {
          const p = takePath(entry.path)
          if (p) candidates.push(p)
        }
      }
    }
  }
  return candidates
}

function pushStringArray(into: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    if (typeof item === "string" && looksLikeToolPath(item)) into.push(normalizeToolPath(item))
  }
}
