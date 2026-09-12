/**
 * 可开目标：选中 html > 改动条 html > 本会话本机预览 URL。
 * 不编造入口，不启动本地服务。
 */
import { extractLocalPreviewUrl, isWorkspaceHtmlPath } from "@enjoy-agents/ipc-contract/workspace-preview"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import type { PickPreviewTargetInput, PreviewTarget } from "./preview-open.types"

export function pickPreviewTarget(input: PickPreviewTargetInput): PreviewTarget | null {
  if (isWorkspaceHtmlPath(input.selectedPath)) {
    return { kind: "html", path: input.selectedPath as string }
  }
  const fromFiles = input.files?.find((file) => isWorkspaceHtmlPath(file.path))
  if (fromFiles) return { kind: "html", path: fromFiles.path }
  if (input.sessionUrl) return { kind: "url", url: input.sessionUrl }
  return null
}

/** 独立完成条不读改动条文件，避免 Keep 后条又冒出来。 */
export function pickStandalonePreviewTarget(input: PickPreviewTargetInput): PreviewTarget | null {
  return pickPreviewTarget({
    selectedPath: input.selectedPath,
    sessionUrl: input.sessionUrl
  })
}

export function previewTargetLabel(target: PreviewTarget): string {
  return target.kind === "html" ? target.path : target.url
}

export function collectSessionPreviewUrl(messages: ThreadMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const href = extractLocalPreviewUrl(textsFromMessage(messages[i]).join("\n"))
    if (href) return href
  }
  return null
}

function textsFromMessage(message: ThreadMessage | undefined): string[] {
  if (!message) return []
  const texts = [message.content, message.reasoning]
  for (const tool of message.tools ?? []) {
    texts.push(tool.argsText, tool.errorText)
    texts.push(...textsFromUnknown(tool.args), ...textsFromUnknown(tool.result))
  }
  return texts.filter((item): item is string => Boolean(item))
}

function textsFromUnknown(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (!value || typeof value !== "object") return []
  const rec = value as Record<string, unknown>
  const keys = ["stdout", "output", "content", "text", "url"]
  return keys.flatMap((key) => (typeof rec[key] === "string" ? [rec[key] as string] : []))
}
