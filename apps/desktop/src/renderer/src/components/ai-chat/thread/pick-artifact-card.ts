/**
 * 从助手轮工具/改动里挑一张产物薄卡。写入中不给假预览；无「第 N 版」。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { isWorkspaceHtmlPath } from "@enjoy-agents/ipc-contract/workspace-preview"
import { asRecord, readString } from "../../../lib/record.ts"
import type { ArtifactCardModel } from "./artifact-card"

export function pickArtifactCard(input: {
  tools: ThreadToolCall[]
  streaming?: boolean
  sessionUrl?: string | null
}): ArtifactCardModel | null {
  const writing = Boolean(input.streaming)
  const htmlPath = findHtmlPath(input.tools)
  if (htmlPath) {
    const name = htmlPath.split(/[\\/]/).pop() || htmlPath
    return {
      title: name,
      kind: "web",
      writing: writing && !toolPathReady(input.tools, htmlPath),
      path: htmlPath
    }
  }
  if (input.sessionUrl?.trim()) {
    let host = input.sessionUrl
    try {
      host = new URL(input.sessionUrl).host || input.sessionUrl
    } catch {
      /* keep raw */
    }
    return {
      title: host,
      kind: "web",
      writing,
      url: input.sessionUrl
    }
  }
  return null
}

function findHtmlPath(tools: ThreadToolCall[]): string | null {
  for (const tool of tools) {
    const result = asRecord(tool.result)
    const args = asRecord(tool.args)
    const path =
      readString(result, "path") ||
      readString(args, "path") ||
      readString(args, "file_path") ||
      readString(args, "filePath")
    if (path && isWorkspaceHtmlPath(path)) return path
  }
  return null
}

function toolPathReady(tools: ThreadToolCall[], path: string): boolean {
  return tools.some((tool) => {
    if (tool.state !== "output-available") return false
    const result = asRecord(tool.result)
    const args = asRecord(tool.args)
    const p =
      readString(result, "path") ||
      readString(args, "path") ||
      readString(args, "file_path") ||
      readString(args, "filePath")
    return p === path
  })
}
