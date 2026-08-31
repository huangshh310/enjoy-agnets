/**
 * 资产与媒体工作室：导入、多模态生成（生图/语音/视频/转写/翻译）、元数据卡片预览、安全导出工作区。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAlertLine,
  RiDeleteBinLine,
  RiFileLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiFolderUploadLine,
  RiImageLine,
  RiInformationLine,
  RiLoader4Line,
  RiMicLine,
  RiMovieLine,
  RiSparklingLine,
  RiTranslate2,
  RiUpload2Line,
  RiUploadCloud2Line,
  RiVolumeUpLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { exportLibraryAsset, generateLibraryMedia } from "@renderer/hooks/media-library"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

type StudioMode = "image" | "speech" | "video" | "transcribe" | "import"

export function MediaPage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)

  const [mode, setMode] = useState<StudioMode>("image")
  const [prompt, setPrompt] = useState("a sleek futuristic terminal interface with blue neon accents")
  const [exportPath, setExportPath] = useState("assets/export.bin")
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [overwriteArmed, setOverwriteArmed] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const visibleAssets = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    if (!q) return assets
    return assets.filter((a) => `${a.name} ${a.kind} ${a.mediaType}`.toLowerCase().includes(q))
  }, [assets, filterQuery])

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId),
    [assets, selectedAssetId]
  )

  const groups = useMemo(
    () => [
      {
        id: "library",
        label: "Asset Studio",
        items: [
          {
            id: "all",
            label: "All assets",
            icon: RiImageLine,
            meta: String(assets.length)
          }
        ]
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
      mediaType: resolveMediaType(file.name, file.type),
      bytesBase64
    })
    await queryClient.invalidateQueries({ queryKey: ["assets"] })
    setExportNote(`Imported ${file.name} successfully.`)
  }

  async function runGeneration(kind: "image" | "speech" | "video" | "transcription" | "translation") {
    if (!sessionId || !modelId || isGenerating) return
    setIsGenerating(true)
    setExportNote(null)
    try {
      await generateLibraryMedia({
        kind,
        sessionId,
        modelId,
        prompt,
        attachments: selectedAssetId ? [selectedAssetId] : []
      })
      await queryClient.invalidateQueries({ queryKey: ["assets"] })
      setExportNote(`Generated ${kind} asset successfully.`)
    } catch (err: unknown) {
      setExportNote(err instanceof Error ? err.message : `Failed to generate ${kind}.`)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleExport(asset: AssetRecord) {
    if (!workspaceId) return
    try {
      const result = await exportLibraryAsset({
        id: asset.id,
        workspaceId,
        relativePath: exportPath,
        overwrite: overwriteArmed
      })
      if (result.overwriteRisk && !result.exported) {
        setOverwriteArmed(true)
        setExportNote(`Overwrite risk at ${result.targetPath}. Click Export again to confirm overwrite.`)
        return
      }
      setOverwriteArmed(false)
      setExportNote(result.exported ? `Exported to ${result.targetPath}` : "Export blocked.")
    } catch (error: unknown) {
      setOverwriteArmed(false)
      setExportNote(error instanceof Error ? error.message : "Export failed.")
    }
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter assets..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
      searchValue={filterQuery}
      onSearchChange={setFilterQuery}
      filterNav={false}
    >
      <div className="flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-xs">
              <RiImageLine className="size-5" />
            </div>
            <h1 data-testid="page-media" className="text-title-3-semibold text-text-primary">
              Asset & Media Studio
            </h1>
          </div>
          <p className="text-body-medium text-text-secondary">
            Generate and manage multimodal assets (images, audio, speech, video). Export to workspace or upload to Provider files.
          </p>
        </header>

        {/* Studio Console Card */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1">
              <StudioTabButton
                active={mode === "image"}
                onClick={() => setMode("image")}
                icon={RiImageLine}
                label="Image"
              />
              <StudioTabButton
                active={mode === "speech"}
                onClick={() => setMode("speech")}
                icon={RiVolumeUpLine}
                label="Speech (TTS)"
              />
              <StudioTabButton
                active={mode === "video"}
                onClick={() => setMode("video")}
                icon={RiMovieLine}
                label="Video (Exp)"
              />
              <StudioTabButton
                active={mode === "transcribe"}
                onClick={() => setMode("transcribe")}
                icon={RiMicLine}
                label="STT & Translate"
              />
              <StudioTabButton
                active={mode === "import"}
                onClick={() => setMode("import")}
                icon={RiUploadCloud2Line}
                label="Upload file"
              />
            </div>

            {/* Model capability info */}
            <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
              <span>Active model:</span>
              <span className="font-mono font-medium text-text-primary">
                {modelId || "None selected"}
              </span>
            </div>
          </div>

          {/* Mode Contents */}
          <div className="mt-4">
            {mode === "image" ? (
              <div className="flex flex-col gap-3">
                <CapabilityNotice capable={canImage} modelId={modelId} capabilityName="Image Generation" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter prompt description for image generation..."
                    className="bg-background-secondary-default focus-visible:bg-background-primary-default"
                  />
                  <Button
                    size="sm"
                    disabled={!sessionId || !modelId || !canImage || isGenerating || !prompt.trim()}
                    onClick={() => void runGeneration("image")}
                    className="gap-1.5 shadow-xs shrink-0"
                  >
                    {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiSparklingLine className="size-4" />}
                    <span>Generate image</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === "speech" ? (
              <div className="flex flex-col gap-3">
                <CapabilityNotice capable={canSpeech} modelId={modelId} capabilityName="Text to Speech" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter text to synthesize into spoken audio..."
                    className="bg-background-secondary-default focus-visible:bg-background-primary-default"
                  />
                  <Button
                    size="sm"
                    disabled={!sessionId || !modelId || !canSpeech || isGenerating || !prompt.trim()}
                    onClick={() => void runGeneration("speech")}
                    className="gap-1.5 shadow-xs shrink-0"
                  >
                    {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiVolumeUpLine className="size-4" />}
                    <span>Generate speech</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === "video" ? (
              <div className="flex flex-col gap-3">
                <CapabilityNotice capable={canVideo} modelId={modelId} capabilityName="Video (Experimental)" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter prompt for video generation (Experimental)..."
                    className="bg-background-secondary-default focus-visible:bg-background-primary-default"
                  />
                  <Button
                    size="sm"
                    disabled={!sessionId || !modelId || !canVideo || isGenerating || !prompt.trim()}
                    onClick={() => void runGeneration("video")}
                    className="gap-1.5 shadow-xs shrink-0"
                  >
                    {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiMovieLine className="size-4" />}
                    <span>Generate video</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === "transcribe" ? (
              <div className="flex flex-col gap-3.5">
                <CapabilityNotice capable={canTranscribe} modelId={modelId} capabilityName="Audio Transcription & Translation" />
                <div className="rounded-xl border border-border-button-default bg-background-secondary-default p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-1-medium font-medium text-text-secondary">
                      Selected audio source:
                    </span>
                    {selectedAsset ? (
                      <span className="font-mono text-caption-2-medium text-accent-600 dark:text-accent-400 font-semibold">
                        {selectedAsset.name} ({selectedAsset.mediaType})
                      </span>
                    ) : (
                      <span className="text-caption-2-medium text-amber-500 font-medium">
                        Select an audio file from library below
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={!sessionId || !modelId || !canTranscribe || !selectedAssetId || isGenerating}
                    onClick={() => void runGeneration("transcription")}
                    className="gap-1.5 shadow-xs"
                  >
                    {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiMicLine className="size-4" />}
                    <span>Transcribe speech</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!sessionId || !modelId || !canTranscribe || !selectedAssetId || isGenerating}
                    onClick={() => void runGeneration("translation")}
                    className="gap-1.5 shadow-xs"
                  >
                    {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiTranslate2 className="size-4" />}
                    <span>Translate audio</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === "import" ? (
              <div className="flex flex-col gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) void onImport(file)
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/50 p-8 text-center cursor-pointer hover:border-accent-500/50 hover:bg-background-secondary-hover/40 transition-all"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs">
                    <RiUploadCloud2Line className="size-6" />
                  </div>
                  <p className="mt-3 text-body-medium font-semibold text-text-primary">
                    Click to browse or drop local media file here
                  </p>
                  <p className="mt-1 text-caption-1-medium text-text-tertiary">
                    PNG, JPG, SVG, MP3, WAV, MP4, PDF up to 8 MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void onImport(file)
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Global Export & Feedback Notice */}
        {exportNote ? (
          <div
            className={cx(
              "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-caption-1-medium shadow-xs",
              overwriteArmed
                ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300"
                : "border-border-button-default bg-background-secondary-default text-text-secondary"
            )}
          >
            <RiInformationLine className="size-4 shrink-0" />
            <span className="flex-1">{exportNote}</span>
          </div>
        ) : null}

        {/* Asset Library List & Bento Grid */}
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                Asset Library ({visibleAssets.length})
              </h3>
            </div>

            {/* Target Workspace Export Path */}
            <div className="flex items-center gap-2">
              <span className="text-caption-2-medium text-text-tertiary">Default export path:</span>
              <Input
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder="assets/export.bin"
                className="h-8 w-44 font-mono text-[12px] bg-background-secondary-default"
              />
            </div>
          </div>

          {visibleAssets.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-6 py-8 text-center">
              <RiImageLine className="size-8 text-text-tertiary" />
              <p className="mt-2 text-body-medium font-semibold text-text-primary">
                No assets in library
              </p>
              <p className="mt-1 max-w-sm text-caption-1-medium text-text-secondary">
                Generate images, synthesized speech, or upload local files using the studio console above.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id
                return (
                  <article
                    key={asset.id}
                    onClick={() => setSelectedAssetId(isSelected ? null : asset.id)}
                    className={cx(
                      "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all shadow-xs cursor-pointer",
                      isSelected
                        ? "border-accent-500 bg-accent-500/[0.04] ring-2 ring-accent-500/20 shadow-sm"
                        : "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md"
                    )}
                  >
                    <div>
                      {/* Top bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default shadow-xs text-text-secondary">
                            <AssetKindIcon kind={asset.kind} />
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate text-body-medium font-semibold text-text-primary">
                              {asset.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                              <span className="font-mono">{formatBytes(asset.size)}</span>
                              <span>·</span>
                              <span className="uppercase">{asset.kind}</span>
                              {asset.experimental ? (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-500 font-medium">Experimental</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase shrink-0",
                            asset.source === "generated"
                              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400"
                              : "bg-background-tertiary-default text-text-tertiary"
                          )}
                        >
                          {asset.source}
                        </span>
                      </div>

                      {/* Image Thumbnail preview if image */}
                      {asset.mediaType.startsWith("image/") ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-separator-border/60 bg-background-secondary-default">
                          <AssetImageThumb assetId={asset.id} />
                        </div>
                      ) : null}
                    </div>

                    {/* Footer Actions */}
                    <div
                      className="mt-3.5 flex items-center justify-between border-t border-separator-border/60 pt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-mono text-[10px] text-text-tertiary truncate max-w-[130px]">
                        {asset.hash.slice(0, 14)}...
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="asset-export"
                          disabled={!workspaceId}
                          title={`Export to ${exportPath}`}
                          className="h-7 px-2 text-caption-2-medium gap-1"
                          onClick={() => void handleExport(asset)}
                        >
                          <RiFolderUploadLine className="size-3" />
                          <span>Export</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          title="Upload as Provider file reference"
                          className="h-7 px-2 text-caption-2-medium gap-1"
                          onClick={() => void getIde().assets.upload({ id: asset.id, purpose: "file" })}
                        >
                          <RiUpload2Line className="size-3" />
                          <span>Upload</span>
                        </Button>

                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Delete asset"
                          className="size-7 text-text-tertiary hover:text-rose-500"
                          onClick={() =>
                            void getIde()
                              .assets.delete(asset.id)
                              .then(() => queryClient.invalidateQueries({ queryKey: ["assets"] }))
                          }
                        >
                          <RiDeleteBinLine className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </SecondaryPageShell>
  )
}

function StudioTabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: typeof RiImageLine
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption-1-medium transition-all",
        active
          ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      <Icon className={cx("size-4", active ? "text-accent-500" : "text-text-tertiary")} />
      <span>{label}</span>
    </button>
  )
}

function CapabilityNotice({
  capable,
  modelId,
  capabilityName
}: {
  capable: boolean
  modelId: string | null
  capabilityName: string
}) {
  if (capable) return null
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2 text-caption-1-medium text-amber-700 dark:text-amber-300">
      <RiAlertLine className="size-4 shrink-0 text-amber-500" />
      <span>
        Current model <code className="font-mono font-semibold">{modelId || "None"}</code> does not advertise {capabilityName}. Switch models in Chat or configure media providers in Settings.
      </span>
    </div>
  )
}

function AssetKindIcon({ kind }: { kind: AssetRecord["kind"] }) {
  if (kind === "image") return <RiImageLine className="size-4 text-accent-500" />
  if (kind === "audio") return <RiFileMusicLine className="size-4 text-amber-500" />
  if (kind === "video") return <RiFileVideoLine className="size-4 text-purple-500" />
  return <RiFileLine className="size-4 text-text-tertiary" />
}

function AssetImageThumb({ assetId }: { assetId: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!hasIde()) return
    let active = true
    void getIde()
      .assets.read(assetId)
      .then((row) => {
        if (!active) return
        const rec = row as { bytesBase64?: string; mediaType?: string }
        if (rec.bytesBase64) {
          setSrc(`data:${rec.mediaType || "image/png"};base64,${rec.bytesBase64}`)
        }
      })
    return () => {
      active = false
    }
  }, [assetId])

  if (!src) return <div className="h-32 w-full animate-pulse bg-background-tertiary-default/50" />
  return (
    <img
      src={src}
      alt="Asset preview"
      className="max-h-48 w-full object-cover rounded-xl"
    />
  )
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

