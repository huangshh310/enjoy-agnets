/**
 * AI 媒体生成器：分段标签、提示词、能力不足提示。常驻在资产库顶部。
 */
import {
  RiAlertLine,
  RiFileLine,
  RiLoader4Line,
  RiMicLine,
  RiSparklingLine,
  RiTranslate2
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { StudioGenerateKind, StudioMode } from "./media-page.types"
import { getStudioModes, type StudioModeEntry } from "./studio-modes"

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"

type StudioGeneratorPanelProps = {
  mode: StudioMode
  onModeChange: (mode: StudioMode) => void
  prompt: string
  onPromptChange: (prompt: string) => void
  modelId: string | null
  sessionId: string | null
  capabilities: string[]
  isGenerating: boolean
  selectedAsset: AssetRecord | undefined
  selectedAudioAsset: AssetRecord | undefined
  experimentalMedia: boolean
  onGenerate: (kind: StudioGenerateKind) => void
}

export function StudioGeneratorPanel({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  modelId,
  sessionId,
  capabilities,
  isGenerating,
  selectedAsset,
  selectedAudioAsset,
  experimentalMedia,
  onGenerate
}: StudioGeneratorPanelProps) {
  const studioModes = getStudioModes(useT())
  const currentMode = studioModes.find((entry) => entry.id === mode) ?? studioModes[0]
  const videoLocked = mode === "video" && !experimentalMedia
  const isCapable =
    !videoLocked && (currentMode.capability ? capabilities.includes(currentMode.capability) : true)
  const canSubmit = Boolean(sessionId && modelId && isCapable && !isGenerating)

  return (
    <section className="relative flex shrink-0 flex-col gap-2.5 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs">
      <StudioModeTabs
        mode={mode}
        experimentalMedia={experimentalMedia}
        modelId={modelId}
        onModeChange={onModeChange}
      />
      {mode === "transcribe" ? (
        <TranscribeActions
          selectedAsset={selectedAsset}
          selectedAudioAsset={selectedAudioAsset}
          canSubmit={canSubmit}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
        />
      ) : (
        <PromptActions
          prompt={prompt}
          placeholder={currentMode.placeholder}
          canSubmit={canSubmit}
          isGenerating={isGenerating}
          mode={mode}
          onPromptChange={onPromptChange}
          onGenerate={onGenerate}
        />
      )}
      <StudioHints
        experimentalMedia={experimentalMedia}
        isCapable={isCapable}
        videoLocked={videoLocked}
        modelId={modelId}
        modeLabel={currentMode.label}
      />
    </section>
  )
}

function StudioModeTabs({
  mode,
  experimentalMedia,
  modelId,
  onModeChange
}: {
  mode: StudioMode
  experimentalMedia: boolean
  modelId: string | null
  onModeChange: (mode: StudioMode) => void
}) {
  const t = useT()
  const studioModes = getStudioModes(t)
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1">
        {studioModes.map((entry) => (
          <ModeTab
            key={entry.id}
            label={entry.label}
            icon={entry.icon}
            active={mode === entry.id}
            locked={Boolean(entry.experimental && !experimentalMedia)}
            onSelect={() => onModeChange(entry.id)}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-tertiary">
        <span>{t("pages.media.modelLabel")}</span>
        <span className="font-mono text-caption-2-semibold text-text-primary">
          {modelId || t("pages.media.modelNone")}
        </span>
      </div>
    </div>
  )
}

function ModeTab({
  label,
  icon: Icon,
  active,
  locked,
  onSelect
}: {
  label: string
  icon: StudioModeEntry["icon"]
  active: boolean
  locked: boolean
  onSelect: () => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      disabled={locked}
      title={locked ? t("pages.media.enableExperimentalVideo") : undefined}
      onClick={onSelect}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-caption-1-medium transition-colors",
        FOCUS_RING,
        locked && "cursor-not-allowed opacity-50",
        active
          ? "bg-background-primary-default text-caption-1-semibold text-text-primary shadow-xs"
          : "text-text-secondary hover:bg-background-tertiary-default/50 hover:text-text-primary"
      )}
    >
      <Icon className={cx("size-3.5", active ? "text-accent-500" : "text-text-tertiary")} />
      <span>{label}</span>
    </button>
  )
}

function StudioHints({
  experimentalMedia,
  isCapable,
  videoLocked,
  modelId,
  modeLabel
}: {
  experimentalMedia: boolean
  isCapable: boolean
  videoLocked: boolean
  modelId: string | null
  modeLabel: string
}) {
  const t = useT()
  const capabilityHint = !isCapable
    ? videoLocked
      ? t("pages.media.enableExperimentalVideo")
      : t("pages.media.modelNoCapability", {
          modelId: modelId || t("pages.media.modelNone"),
          modeLabel
        })
    : null
  if (experimentalMedia && !capabilityHint) return null
  return (
    <div className="flex flex-col gap-1">
      {!experimentalMedia ? (
        <p className="text-caption-2-medium text-text-tertiary">
          {t("pages.media.videoDisabled")}
        </p>
      ) : null}
      {capabilityHint ? (
        <div className="flex items-center gap-1.5 text-caption-2-medium text-status-yellow-text">
          <RiAlertLine className="size-3.5 shrink-0" />
          <span>{capabilityHint}</span>
        </div>
      ) : null}
    </div>
  )
}

function TranscribeActions({
  selectedAsset,
  selectedAudioAsset,
  canSubmit,
  isGenerating,
  onGenerate
}: {
  selectedAsset: AssetRecord | undefined
  selectedAudioAsset: AssetRecord | undefined
  canSubmit: boolean
  isGenerating: boolean
  onGenerate: (kind: StudioGenerateKind) => void
}) {
  const t = useT()
  const ready = canSubmit && Boolean(selectedAudioAsset)
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <div className="flex h-9 flex-1 min-w-0 items-center rounded-xl border border-border-button-default bg-background-secondary-default px-3 text-caption-1-medium">
        {selectedAudioAsset ? (
          <div className="flex items-center gap-2 min-w-0">
            <RiFileLine className="size-4 shrink-0 text-accent-500" />
            <span className="truncate text-text-primary text-caption-1-semibold">{selectedAudioAsset.name}</span>
            <span className="font-mono text-caption-2-medium text-text-tertiary">({selectedAudioAsset.mediaType})</span>
          </div>
        ) : (
          <span className="text-text-tertiary">
            {t(selectedAsset ? "pages.media.selectAudio" : "pages.media.clickAudio")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" disabled={!ready} onClick={() => onGenerate("transcription")} className="h-9 gap-1.5 shadow-xs">
          {isGenerating ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiMicLine className="size-3.5" />}
          <span>{t("pages.media.transcribe")}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!ready}
          onClick={() => onGenerate("translation")}
          className="h-9 gap-1.5 shadow-xs"
        >
          {isGenerating ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiTranslate2 className="size-3.5" />}
          <span>{t("pages.media.translate")}</span>
        </Button>
      </div>
    </div>
  )
}

function PromptActions({
  prompt,
  placeholder,
  canSubmit,
  isGenerating,
  mode,
  onPromptChange,
  onGenerate
}: {
  prompt: string
  placeholder: string
  canSubmit: boolean
  isGenerating: boolean
  mode: Exclude<StudioMode, "transcribe">
  onPromptChange: (prompt: string) => void
  onGenerate: (kind: StudioGenerateKind) => void
}) {
  const t = useT()
  const ready = canSubmit && Boolean(prompt.trim())
  return (
    <div className="flex items-center gap-2">
      <Input
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 flex-1 rounded-xl bg-background-secondary-default text-caption-1-medium focus-visible:bg-background-primary-default"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && ready) onGenerate(mode)
        }}
      />
      <Button size="sm" disabled={!ready} onClick={() => onGenerate(mode)} className="h-9 gap-1.5 shadow-xs shrink-0">
        {isGenerating ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiSparklingLine className="size-3.5" />}
        <span>{t("pages.media.generate")}</span>
      </Button>
    </div>
  )
}
