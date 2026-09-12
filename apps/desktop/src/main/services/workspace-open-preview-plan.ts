/**
 * 规划可交给系统浏览器的 href。不含 Electron，方便 node:test。
 */
import { promises as fs } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  isWorkspaceHtmlPath,
  OpenWorkspacePreviewInput,
  type OpenWorkspacePreviewResult,
  parseLocalPreviewUrl
} from "@enjoy-agents/ipc-contract/workspace-preview"
import { resolveInsideWorkspace } from "./paths.ts"

export type OpenPreviewDeps = {
  resolveRoot: (workspaceId: string) => Promise<string>
  fileExists: (absPath: string) => Promise<boolean>
  openExternal: (href: string) => Promise<void>
}

export type PreviewPlan =
  | { href: string }
  | { code: "PREVIEW_NOT_ALLOWED" | "PREVIEW_NOT_FOUND" }

export async function defaultFileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath)
    return true
  } catch {
    return false
  }
}

/** 规划可交给 openExternal 的 href；失败只回稳定码。 */
export async function planWorkspacePreviewHref(
  input: OpenWorkspacePreviewInput,
  deps: Pick<OpenPreviewDeps, "resolveRoot" | "fileExists">
): Promise<PreviewPlan> {
  if (input.url) {
    const href = parseLocalPreviewUrl(input.url)
    if (!href) return { code: "PREVIEW_NOT_ALLOWED" }
    return { href }
  }
  if (!input.path || !isWorkspaceHtmlPath(input.path)) {
    return { code: "PREVIEW_NOT_ALLOWED" }
  }
  try {
    const root = await deps.resolveRoot(input.workspaceId)
    const abs = resolveInsideWorkspace(root, input.path)
    if (!(await deps.fileExists(abs))) return { code: "PREVIEW_NOT_FOUND" }
    return { href: pathToFileURL(abs).href }
  } catch {
    return { code: "PREVIEW_NOT_ALLOWED" }
  }
}

export async function openWorkspacePreviewWith(
  raw: unknown,
  deps: OpenPreviewDeps
): Promise<OpenWorkspacePreviewResult> {
  const input = OpenWorkspacePreviewInput.parse(raw)
  const planned = await planWorkspacePreviewHref(input, deps)
  if ("code" in planned) return { ok: false, code: planned.code }
  await deps.openExternal(planned.href)
  return { ok: true }
}
