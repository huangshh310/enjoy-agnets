/**
 * 资产库页面状态：分类、生成、导入导出、删除确认。
 */
import { useState } from "react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useMediaAssets } from "./use-media-assets"
import { useMediaIo } from "./use-media-io"
import { useMediaStudio } from "./use-media-studio"

export function useMediaLibrary() {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)
  const experimentalMedia = useSettingsSnapshot().data?.preferences.experimentalMedia ?? false
  const capabilities = models.find((model) => model.id === modelId)?.capabilities ?? []
  const [note, setNote] = useState<string | null>(null)
  const assets = useMediaAssets()
  const studio = useMediaStudio({
    sessionId,
    modelId,
    experimentalMedia,
    selectedAudioAsset: assets.selectedAudioAsset,
    refresh: assets.refresh,
    setNote
  })
  const io = useMediaIo({
    workspaceId,
    selectedAssetId: assets.selectedAssetId,
    pendingDeleteId: assets.pendingDeleteId,
    setSelectedAssetId: assets.setSelectedAssetId,
    setPendingDeleteId: assets.setPendingDeleteId,
    refresh: assets.refresh,
    setNote
  })

  return {
    assets,
    studio,
    io,
    notice: { note, setNote },
    sessionId,
    modelId,
    capabilities,
    experimentalMedia
  }
}
