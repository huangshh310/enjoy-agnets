/**
 * Settings → Media & Assets：多模态生成模型配置中心。
 * 严格从用户在 Providers 中已配置的提供商模型列表中检索与绑定，支持生图、视频、语音合成与语音转写。
 */
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowDownSLine,
  RiArrowRightLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiFolder6Line,
  RiInformationLine,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { ModelBrandIcon, ProviderIcon } from "./providers/provider-icons"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

export function MediaSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  const configuredModels = useChatStore((state) => state.models)
  // 1. 生图模型：从已配置的 Providers 中筛选具备 image 能力或命名的模型
  const imageModels = useMemo(() => {
    return configuredModels.filter(
      (m) => m.capabilities?.includes("image") || /dall-e|imagine-image|flux|sdxl|image/i.test(m.id)
    )
  }, [configuredModels])

  // 2. 视频模型：从已配置的 Providers 中筛选具备 video 能力或命名的模型
  const videoModels = useMemo(() => {
    return configuredModels.filter(
      (m) => m.capabilities?.includes("video") || /video|sora|kling|cogvideo|luma|hunyuan/i.test(m.id)
    )
  }, [configuredModels])

  // 3. 语音合成 (TTS) 模型：从已配置的 Providers 中筛选具备 speech 能力或命名的模型
  const speechModels = useMemo(() => {
    return configuredModels.filter(
      (m) => m.capabilities?.includes("speech") || /tts|speech|eleven/i.test(m.id)
    )
  }, [configuredModels])

  // 4. 语音转写 (STT) 模型：从已配置的 Providers 中筛选具备 transcription 能力或命名的模型
  const transcriptionModels = useMemo(() => {
    return configuredModels.filter(
      (m) => m.capabilities?.includes("transcription") || /whisper|transcri|nova/i.test(m.id)
    )
  }, [configuredModels])

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 核心多模态模型引擎 ────────────────────────── */}
      <SettingsCard title="Multi-modal generation models">
        {/* 生图模型配置 */}
        <SettingsRow
          title="Image generation model"
          description="Used by generateImage when creating illustrations, mockups, or assets in chat."
        >
          <ConfiguredMediaModelSelector
            selectedModelId={preferences?.defaultImageModelId}
            fallbackPlaceholder="Select a configured image model..."
            category="image"
            models={imageModels}
            allConfiguredModels={configuredModels}
            onSelect={(id) => void update({ defaultImageModelId: id })}
            onNavigateProviders={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
          />
        </SettingsRow>

        {/* 视频模型配置 */}
        <SettingsRow
          title="Video generation model"
          description="Used by experimental_generateVideo for text-to-video and image-to-video workflows."
        >
          <ConfiguredMediaModelSelector
            selectedModelId={preferences?.defaultVideoModelId}
            fallbackPlaceholder="Select a configured video model..."
            category="video"
            models={videoModels}
            allConfiguredModels={configuredModels}
            onSelect={(id) => void update({ defaultVideoModelId: id })}
            onNavigateProviders={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
          />
        </SettingsRow>

        {/* 语音合成模型配置 */}
        <SettingsRow
          title="Speech synthesis (TTS) model"
          description="Used by generateSpeech for voice rendering and conversational audio responses."
        >
          <ConfiguredMediaModelSelector
            selectedModelId={preferences?.defaultSpeechModelId}
            fallbackPlaceholder="Select a configured TTS model..."
            category="speech"
            models={speechModels}
            allConfiguredModels={configuredModels}
            onSelect={(id) => void update({ defaultSpeechModelId: id })}
            onNavigateProviders={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
          />
        </SettingsRow>

        {/* 语音转写模型配置 */}
        <SettingsRow
          title="Audio transcription (STT) model"
          description="Used by transcribe for speech-to-text conversion and audio indexing."
        >
          <ConfiguredMediaModelSelector
            selectedModelId={preferences?.defaultTranscriptionModelId}
            fallbackPlaceholder="Select a configured STT model..."
            category="transcription"
            models={transcriptionModels}
            allConfiguredModels={configuredModels}
            onSelect={(id) => void update({ defaultTranscriptionModelId: id })}
            onNavigateProviders={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
          />
        </SettingsRow>
      </SettingsCard>

      {/* ─── 安全与资产中枢 ────────────────────────────── */}
      <SettingsCard title="Safety & asset hub">
        <SettingsRow
          title="Experimental media"
          description="Enable Video generation and WebRTC Realtime audio sessions. Failures isolate and degrade gracefully."
        >
          <Switch
            checked={preferences?.experimentalMedia ?? false}
            onCheckedChange={(value) => void update({ experimentalMedia: value })}
          />
        </SettingsRow>

        <SettingsRow
          title="Asset library"
          description="Inspect generated artifacts, import external media, or export assets with path approval."
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/media" })}
            className="inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RiFolder6Line className="size-3.5 text-accent-500" />
            <span>Open Asset Studio</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

/**
 * 专用于从已配置 Providers 中选择多模态模型的 Popover 组合选择器
 */
function ConfiguredMediaModelSelector({
  selectedModelId,
  fallbackPlaceholder,
  category,
  models,
  allConfiguredModels,
  onSelect,
  onNavigateProviders
}: {
  selectedModelId?: string
  fallbackPlaceholder: string
  category: "image" | "video" | "speech" | "transcription"
  models: ModelOption[]
  allConfiguredModels: ModelOption[]
  onSelect: (modelId: string) => void
  onNavigateProviders: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [customInput, setCustomInput] = useState("")
  const [isCustomMode, setIsCustomMode] = useState(false)

  // 当前选中的模型详情（若在已配置列表中）
  const activeModel = useMemo(() => {
    if (!selectedModelId) return undefined
    return allConfiguredModels.find((m) => m.id === selectedModelId)
  }, [allConfiguredModels, selectedModelId])

  // 按提供商对筛选后的可用模型进行分组
  const groupedModels = useMemo(() => {
    const map = new Map<string, { providerName: string; providerKind: string; items: ModelOption[] }>()
    for (const model of models) {
      const key = model.providerId || model.provider || "default"
      const name = model.providerName || model.provider || "Custom Provider"
      if (!map.has(key)) {
        map.set(key, { providerName: name, providerKind: model.provider, items: [] })
      }
      map.get(key)!.items.push(model)
    }
    return Array.from(map.values())
  }, [models])

  // 根据搜索过滤模型
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedModels
    const q = search.toLowerCase().trim()
    return groupedModels
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (m) => m.id.toLowerCase().includes(q) || (m.label && m.label.toLowerCase().includes(q))
        )
      }))
      .filter((g) => g.items.length > 0)
  }, [groupedModels, search])

  const categoryTitleMap = {
    image: "Image Generation",
    video: "Video Generation",
    speech: "Speech (TTS)",
    transcription: "Transcription (STT)"
  }

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[340px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cx(
              "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5",
              "text-left outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer shadow-2xs group"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedModelId ? (
                <>
                  <div className="flex size-4.5 shrink-0 items-center justify-center">
                    <ModelBrandIcon
                      modelId={selectedModelId}
                      providerKind={activeModel?.provider}
                      apiStyle={activeModel?.apiStyle}
                      size={16}
                    />
                  </div>
                  <span className="truncate text-caption-1-medium text-text-primary">
                    {activeModel?.label || selectedModelId}
                  </span>
                  {activeModel?.providerName ? (
                    <span className="rounded bg-background-secondary-default px-1.5 py-0.2 text-[10px] font-medium text-text-tertiary">
                      {activeModel.providerName}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="truncate text-caption-1-regular text-text-placeholder">
                  {fallbackPlaceholder}
                </span>
              )}
            </div>
            <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className="flex w-[340px] flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
        >
          {/* 搜索框 */}
          <div className="relative mb-1.5 px-1">
            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search configured models..."
              className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pl-8 pr-3 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
            />
          </div>

          {/* 列表主体 */}
          <div className="max-h-60 overflow-y-auto pr-0.5 flex flex-col gap-2">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.providerName} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    <ProviderIcon kind={group.providerKind} size={12} />
                    <span>{group.providerName}</span>
                  </div>

                  {group.items.map((m) => {
                    const isSelected = m.id === selectedModelId
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelect(m.id)
                          setOpen(false)
                        }}
                        className={cx(
                          "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-background-secondary-default text-text-primary font-medium"
                            : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ModelBrandIcon
                            modelId={m.id}
                            providerKind={m.provider}
                            apiStyle={m.apiStyle}
                            size={14}
                          />
                          <span className="truncate text-caption-2-medium">{m.label || m.id}</span>
                        </div>
                        {isSelected ? (
                          <RiCheckLine className="size-3.5 shrink-0 text-accent-500 ml-1.5" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-background-secondary-default text-text-tertiary mb-2">
                  <RiInformationLine className="size-4" />
                </div>
                <p className="text-caption-2-medium text-text-primary">
                  No {categoryTitleMap[category]} models found
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">
                  Add or detect models in your configured Providers.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    onNavigateProviders()
                  }}
                  className="mt-3 h-7 px-2.5 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Providers</span>
                  <RiExternalLinkLine className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* 底部自定义 Model ID 快捷入口 */}
          <div className="mt-2 pt-2 border-t border-separator-border px-1">
            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="w-full text-left px-2 py-1 text-[11px] text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer"
              >
                + Enter custom Model ID manually...
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Custom model id (e.g. dall-e-3)"
                  className="h-7 text-caption-2-regular flex-1 px-2"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const trimmed = customInput.trim()
                    if (trimmed) {
                      onSelect(trimmed)
                      setIsCustomMode(false)
                      setOpen(false)
                    }
                  }}
                  disabled={!customInput.trim()}
                  className="h-7 px-2 text-[11px] cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
