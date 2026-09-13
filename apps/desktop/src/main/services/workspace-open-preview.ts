/**
 * 把工作区 html 或本机预览 URL 交给系统浏览器。
 * 不嵌页内浏览器，不启动本地服务。
 */
import { shell } from "electron"
import {
  defaultFileExists,
  openWorkspacePreviewWith,
  type OpenPreviewDeps
} from "./workspace-open-preview-plan.ts"
import { getWorkspace } from "./workspace.ts"

export type { OpenPreviewDeps, PreviewPlan } from "./workspace-open-preview-plan.ts"
export { planWorkspacePreviewHref } from "./workspace-open-preview-plan.ts"

const defaultDeps: OpenPreviewDeps = {
  resolveRoot: async (workspaceId) => {
    const workspace = await getWorkspace(workspaceId)
    if (workspace.kind === "ssh") {
      throw new Error("SSH workspace has no local preview root.")
    }
    return workspace.rootPath
  },
  fileExists: defaultFileExists,
  openExternal: (href) => shell.openExternal(href)
}

export async function openWorkspacePreview(
  raw: unknown,
  deps: OpenPreviewDeps = defaultDeps
) {
  return openWorkspacePreviewWith(raw, deps)
}
