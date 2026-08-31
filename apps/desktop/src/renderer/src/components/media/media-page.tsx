/**
 * 资产库：导入、预览元数据、导出到工作区（覆盖确认 + 系统保存框）。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiImageLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { exportLibraryAsset, generateLibraryMedia } from "@renderer/hooks/media-library"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

export function MediaPage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [exportPath, setExportPath] = useState("assets/export.bin")
  const [prompt, setPrompt] = useState("a quiet workspace")
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [overwriteArmed, setOverwriteArmed] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const sessionId = useChatStore((state) => state.sessionId)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)
  const capabilities = models.find((model) => model.id === modelId)?.capabilities ?? []
  const canImage = capabilities.includes("image")
  const canSpeech = capabilities.includes("speech")
  const canVideo = capabilities.includes("video")
  const canTranscribe = capabilities.includes("transcription")
  const assetsQuery = useQuery({
    queryKey: ["assets"],
    enabled: hasIde(),
    queryFn: () => getIde().assets.list() as Promise<AssetRecord[]>
  })
  const assets = assetsQuery.data ?? []
  const groups = useMemo(
    () => [
      {
        id: "library",
        label: "Library",
        items: [{ id: "all", label: "All assets", icon: RiImageLine, meta: String(assets.length) }]
      }
    ],
    [assets.length]
  )

  async function onImport(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setExportNote("Asset exceeds the 8 MB import limit.")
      return
    }
    const buffer = await file.arrayBuffer()
    const bytesBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    await getIde().assets.import({
      name: file.name,
      mediaType: file.type || "application/octet-stream",
      bytesBase64
    })
    await queryClient.invalidateQueries({ queryKey: ["assets"] })
  }

  return (
    <SecondaryPageShell groups={groups} selectedId="all" onSelect={() => undefined} contentWidth="wide">
      <div className="flex flex-col gap-6">
        <div>
          <h1 data-testid="page-media" className="text-title-3-semibold text-text-primary">
            Media
          </h1>
          <p className="mt-1 text-body-medium text-text-secondary">
            Generated and imported files live in the app asset library. Export to the workspace is explicit.
            Video and Realtime are experimental.
          </p>
        </div>
        <label className="text-body-medium text-text-secondary">
          Import
          <input
            type="file"
            className="mt-2 block"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void onImport(file)
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <Button
            size="sm"
            variant="outline"
            disabled={!sessionId || !modelId || !canImage}
            title={canImage ? undefined : `${modelId} does not advertise Image generation.`}
            onClick={() =>
              void generateLibraryMedia({
                kind: "image",
                sessionId: sessionId!,
                modelId,
                prompt
              }).then(() => queryClient.invalidateQueries({ queryKey: ["assets"] }))
            }
          >
            Generate image
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!sessionId || !modelId || !canSpeech}
            title={canSpeech ? undefined : `${modelId} does not advertise Speech.`}
            onClick={() =>
              void generateLibraryMedia({
                kind: "speech",
                sessionId: sessionId!,
                modelId,
                prompt
              }).then(() => queryClient.invalidateQueries({ queryKey: ["assets"] }))
            }
          >
            Generate speech
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!sessionId || !modelId || !canVideo}
            title={canVideo ? "Video (experimental)" : `${modelId} does not advertise Video.`}
            onClick={() =>
              void generateLibraryMedia({
                kind: "video",
                sessionId: sessionId!,
                modelId,
                prompt
              }).then(() => queryClient.invalidateQueries({ queryKey: ["assets"] }))
            }
          >
            Generate video
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!sessionId || !modelId || !canTranscribe || !selectedAssetId}
            title={
              !canTranscribe
                ? `${modelId} does not advertise Transcription.`
                : selectedAssetId
                  ? "Transcribe the selected audio asset"
                  : "Select an audio asset first"
            }
            onClick={() =>
              void generateLibraryMedia({
                kind: "transcription",
                sessionId: sessionId!,
                modelId,
                prompt,
                attachments: selectedAssetId ? [selectedAssetId] : []
              })
            }
          >
            Transcribe
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!sessionId || !modelId || !canTranscribe || !selectedAssetId}
            title={
              !canTranscribe
                ? `${modelId} does not advertise speech translation (uses transcription models).`
                : selectedAssetId
                  ? "Translate the selected audio asset"
                  : "Select an audio asset first"
            }
            onClick={() =>
              void generateLibraryMedia({
                kind: "translation",
                sessionId: sessionId!,
                modelId,
                prompt,
                attachments: selectedAssetId ? [selectedAssetId] : []
              })
            }
          >
            Translate
          </Button>
        </div>
        <div className="flex gap-2">
          <Input value={exportPath} onChange={(event) => setExportPath(event.target.value)} />
        </div>
        {exportNote ? <p className="text-body-medium text-text-secondary">{exportNote}</p> : null}
        <ul className="divide-y divide-separator-border rounded-2xl border border-border-button-default">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between px-4 py-3">
              <button type="button" className="text-left" onClick={() => setSelectedAssetId(asset.id)}>
                <p className="text-body-medium text-text-primary">
                  {asset.name}
                  {selectedAssetId === asset.id ? " · selected" : ""}
                </p>
                <p className="text-caption-1-medium text-text-tertiary">
                  {asset.kind} · {asset.size} bytes
                </p>
              </button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="asset-export"
                  disabled={!workspaceId}
                  onClick={() =>
                    void exportLibraryAsset({
                      id: asset.id,
                      workspaceId: workspaceId!,
                      relativePath: exportPath,
                      overwrite: overwriteArmed
                    }).then((result) => {
                      if (result.overwriteRisk && !result.exported) {
                        setOverwriteArmed(true)
                        setExportNote(`Overwrite risk at ${result.targetPath}. Click Export again to confirm.`)
                        return
                      }
                      setOverwriteArmed(false)
                      setExportNote(result.exported ? `Exported to ${result.targetPath}` : "Export blocked.")
                    }).catch((error: unknown) => {
                      setOverwriteArmed(false)
                      setExportNote(error instanceof Error ? error.message : "Export blocked.")
                    })
                  }
                >
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void getIde().assets.upload({ id: asset.id, purpose: "file" })}
                >
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void getIde().assets.delete(asset.id).then(() => queryClient.invalidateQueries({ queryKey: ["assets"] }))}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {assets.length === 0 ? (
            <li className="px-4 py-6 text-body-medium text-text-secondary">Asset library is empty.</li>
          ) : null}
        </ul>
      </div>
    </SecondaryPageShell>
  )
}
