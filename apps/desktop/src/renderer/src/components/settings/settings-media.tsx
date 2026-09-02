/**
 * Settings → Media & Assets：多模态生成模型配置中心。
 * 严格从已配置 Providers 检索绑定；顶部看板与 Workspace / MCP 同构。
 */
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { RiArrowRightLine, RiFolder6Line, RiImageLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { SettingsHub } from "./settings-hub"
import {
  ConfiguredMediaModelSelector,
  type MediaModelCategory
} from "./settings-media-model-selector"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

type MediaModelPref =
  | "defaultImageModelId"
  | "defaultVideoModelId"
  | "defaultSpeechModelId"
  | "defaultTranscriptionModelId"

type MediaModelPool = "image" | "video" | "speech" | "transcription"

const MEDIA_MODEL_ROWS: Array<{
  title: string
  description: string
  category: MediaModelCategory
  pref: MediaModelPref
  pool: MediaModelPool
  placeholder: string
}> = [
  {
    title: "Image generation model",
    description: "Used by generateImage when creating illustrations, mockups, or assets in chat.",
    category: "image",
    pref: "defaultImageModelId",
    pool: "image",
    placeholder: "Select a configured image model..."
  },
  {
    title: "Video generation model",
    description: "Used by experimental_generateVideo for text-to-video and image-to-video workflows.",
    category: "video",
    pref: "defaultVideoModelId",
    pool: "video",
    placeholder: "Select a configured video model..."
  },
  {
    title: "Speech synthesis (TTS) model",
    description: "Used by generateSpeech for voice rendering and conversational audio responses.",
    category: "speech",
    pref: "defaultSpeechModelId",
    pool: "speech",
    placeholder: "Select a configured TTS model..."
  },
  {
    title: "Audio transcription (STT) model",
    description: "Used by transcribe for speech-to-text conversion and audio indexing.",
    category: "transcription",
    pref: "defaultTranscriptionModelId",
    pool: "transcription",
    placeholder: "Select a configured STT model..."
  }
]

const IMAGE_ID = /dall-e|imagine-image|flux|sdxl|image/i
const VIDEO_ID = /video|sora|kling|cogvideo|luma|hunyuan/i
const SPEECH_ID = /tts|speech|eleven/i
const TRANSCRIBE_ID = /whisper|transcri|nova/i

export function MediaSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  const configuredModels = useChatStore((state) => state.models)
  const pools = useMediaModelPools(configuredModels)
  const experimental = preferences?.experimentalMedia ?? false
  const boundCount = MEDIA_MODEL_ROWS.filter((row) => preferences?.[row.pref]).length

  return (
    <div className="flex flex-col gap-6">
      <MediaOverview
        boundCount={boundCount}
        experimental={experimental}
        onOpenStudio={() => void navigate({ to: "/media" })}
      />
      <SettingsCard title="Multi-modal generation models">
        {MEDIA_MODEL_ROWS.map((row) => (
          <SettingsRow key={row.pref} title={row.title} description={row.description}>
            <ConfiguredMediaModelSelector
              selectedModelId={preferences?.[row.pref]}
              fallbackPlaceholder={row.placeholder}
              category={row.category}
              models={pools[row.pool]}
              allConfiguredModels={configuredModels}
              onSelect={(id) => void update({ [row.pref]: id })}
              onNavigateProviders={() =>
                void navigate({ to: "/settings/$section", params: { section: "providers" } })
              }
            />
          </SettingsRow>
        ))}
      </SettingsCard>
      <MediaSafetyCard
        experimental={experimental}
        onExperimentalChange={(value) => void update({ experimentalMedia: value })}
        onOpenStudio={() => void navigate({ to: "/media" })}
      />
    </div>
  )
}

function MediaOverview({
  boundCount,
  experimental,
  onOpenStudio
}: {
  boundCount: number
  experimental: boolean
  onOpenStudio: () => void
}) {
  return (
    <SettingsHub
      icon={RiImageLine}
      title="Multi-modal generation"
      badge={experimental ? "Experimental" : "Stable defaults"}
      description="Bind image, video, speech, and transcription models from configured Providers."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenStudio}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 text-caption-2-medium"
        >
          <RiFolder6Line className="size-3.5 text-accent-500" />
          <span>Open Asset Studio</span>
          <RiArrowRightLine className="ml-0.5 size-3.5 opacity-60" />
        </Button>
      }
      pulses={[
        { label: "Bound models", value: `${boundCount} / 4` },
        {
          label: "Experimental media",
          value: experimental ? "On" : "Off",
          tone: experimental ? "warning" : "default"
        },
        { label: "Unset slots", value: String(4 - boundCount) }
      ]}
    />
  )
}

function MediaSafetyCard({
  experimental,
  onExperimentalChange,
  onOpenStudio
}: {
  experimental: boolean
  onExperimentalChange: (value: boolean) => void
  onOpenStudio: () => void
}) {
  return (
    <SettingsCard title="Safety & asset hub">
      <SettingsRow
        title="Experimental media"
        description="Enable Video generation and WebRTC Realtime audio sessions. Failures isolate and degrade gracefully."
      >
        <Switch checked={experimental} onCheckedChange={onExperimentalChange} />
      </SettingsRow>
      <SettingsRow
        title="Asset library"
        description="Inspect generated artifacts, import external media, or export assets with path approval."
      >
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenStudio}
          className="inline-flex cursor-pointer items-center gap-1.5"
        >
          <RiFolder6Line className="size-3.5 text-accent-500" />
          <span>Open Asset Studio</span>
          <RiArrowRightLine className="ml-0.5 size-3.5 opacity-60" />
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

function useMediaModelPools(configuredModels: ModelOption[]) {
  return useMemo(
    () => ({
      image: configuredModels.filter(
        (model) => model.capabilities?.includes("image") || IMAGE_ID.test(model.id)
      ),
      video: configuredModels.filter(
        (model) => model.capabilities?.includes("video") || VIDEO_ID.test(model.id)
      ),
      speech: configuredModels.filter(
        (model) => model.capabilities?.includes("speech") || SPEECH_ID.test(model.id)
      ),
      transcription: configuredModels.filter(
        (model) => model.capabilities?.includes("transcription") || TRANSCRIBE_ID.test(model.id)
      )
    }),
    [configuredModels]
  )
}
