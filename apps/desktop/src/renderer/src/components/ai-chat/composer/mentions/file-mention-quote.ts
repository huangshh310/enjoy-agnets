/**
 * @ 选中的工作区文件/目录收成 QuotedContext。超长截断并标明，让模型去 read_file。
 */
import type { QuotedContext } from "@enjoy-agents/ipc-contract"

/** 与 ipc-contract `QUOTE_SNIPPET_MAX` 对齐；测试不能 value-import 合约桶入口。 */
export const MENTION_SNIPPET_MAX = 2000
const TRUNCATE_MARK = "\n…(truncated; use read_file for the rest)"

export function clipMentionContent(text: string, max = MENTION_SNIPPET_MAX): string {
  if (text.length <= max) return text
  const room = Math.max(0, max - TRUNCATE_MARK.length)
  return `${text.slice(0, room)}${TRUNCATE_MARK}`
}

export function quoteWorkspaceFile(path: string, content: string): QuotedContext {
  return {
    id: mentionQuoteId("file", path),
    type: "file",
    title: path,
    snippet: clipMentionContent(content),
    content: clipMentionContent(content),
    metadata: { path, mention: "file" }
  }
}

export function quoteWorkspaceFolder(path: string, names: readonly string[]): QuotedContext {
  const listing = names.length > 0 ? names.map((name) => `- ${name}`).join("\n") : "(empty directory)"
  const body = `Directory ${path}:\n${listing}`
  return {
    id: mentionQuoteId("dir", path),
    type: "file",
    title: `${path}/`,
    snippet: clipMentionContent(body),
    content: clipMentionContent(body),
    metadata: { path, mention: "folder" }
  }
}

export function quoteUnreadableFile(path: string, reason: "binary" | "unreadable"): QuotedContext {
  const body =
    reason === "binary"
      ? `Binary or non-text file ${path}. Use read_file / the Files pane; do not guess contents.`
      : `Could not read ${path}. Use read_file on this workspace-relative path.`
  return {
    id: mentionQuoteId("file", path),
    type: "file",
    title: path,
    snippet: body,
    content: body,
    metadata: { path, mention: reason }
  }
}

function mentionQuoteId(kind: string, path: string): string {
  return `mention:${kind}:${path}`
}
