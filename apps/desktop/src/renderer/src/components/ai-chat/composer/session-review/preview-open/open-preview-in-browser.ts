/**
 * 走 workspace.openPreview，禁止点进右栏 webview。
 */
import { OpenWorkspacePreviewResult } from "@enjoy-agents/ipc-contract/workspace-preview"
import { getIde } from "@renderer/lib/ide"
import type { PreviewTarget } from "./preview-open.types"

export async function openPreviewInBrowser(
  workspaceId: string,
  target: PreviewTarget
): Promise<boolean> {
  const payload =
    target.kind === "html"
      ? { workspaceId, path: target.path }
      : { workspaceId, url: target.url }
  const raw = await getIde().workspace.openPreview(payload)
  const parsed = OpenWorkspacePreviewResult.safeParse(raw)
  return parsed.success && parsed.data.ok
}
