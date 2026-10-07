/**
 * 把截图贴进当前焦点会话的草稿。没有会话就先开一条。不发送，不开桌面工具。
 */
import { queueComposerAsset } from "@renderer/hooks/composer-assets"
import { createAndOpenSession } from "@renderer/hooks/session-lifecycle"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

export async function attachAppsnapPng(pngBase64: string): Promise<void> {
  const store = useChatStore.getState()
  if (!store.sessionId) {
    const workspaceId = store.workspaceId ?? store.repositories.find((node) => node.kind === "workspace")?.id
    if (!workspaceId) return
    await createAndOpenSession(workspaceId)
  }
  const bytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0))
  const name = `appsnap-${Date.now()}.png`
  const asset = (await getIde().assets.import({
    name,
    mediaType: "image/png",
    bytesBase64: pngBase64
  })) as { id: string }
  queueComposerAsset({
    id: asset.id,
    name,
    mediaType: "image/png",
    size: bytes.byteLength,
    url: URL.createObjectURL(new Blob([bytes], { type: "image/png" }))
  })
}
