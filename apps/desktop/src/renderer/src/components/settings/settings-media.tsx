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
import { useT, type TranslateFn } from "@renderer/i18n"
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

function mediaModelRows(t: TranslateFn): Array<{
  title: string
  description: string
  category: MediaModelCategory
  pref: MediaModelPref
  pool: MediaModelPool
  placeholder: string
}> {
  return [
    {
      title: t("settings.media.imageModel"),
      description: t("settings.media.imageDesc"),
      category: "image",
      pref: "defaultImageModelId",
      pool: "image",
      placeholder: t("settings.media.imagePlaceholder")
    },
    {
      title: t("settings.media.videoModel"),
      description: t("settings.media.videoDesc"),
      category: "video",
      pref: "defaultVideoModelId",
      pool: "video",
      placeholder: t("settings.media.videoPlaceholder")
    },
    {
      title: t("settings.media.speechModel"),
      description: t("settings.media.speechDesc"),
      category: "speech",
      pref: "defaultSpeechModelId",
      pool: "speech",
      placeholder: t("settings.media.speechPlaceholder")
    },
    {
      title: t("settings.media.transcribeModel"),
      description: t("settings.media.transcribeDesc"),
      category: "transcription",
      pref: "defaultTranscriptionModelId",
      pool: "transcription",
      placeholder: t("settings.media.transcribePlaceholder")
    }
  ]
}

const IMAGE_ID = /dall-e|imagine-image|flux|sdxl|image/i
const VIDEO_ID = /video|sora|kling|cogvideo|luma|hunyuan/i
const SPEECH_ID = /tts|speech|eleven/i
const TRANSCRIBE_ID = /whisper|transcri|nova/i

export function MediaSettings() {
  const t = useT()
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  const configuredModels = useChatStore((state) => state.models)
  const pools = useMediaModelPools(configuredModels)
  const experimental = preferences?.experimentalMedia ?? false
  const rows = mediaModelRows(t)
  const boundCount = rows.filter((row) => preferences?.[row.pref]).length

  return (
    <div className="flex flex-col gap-6">
      <MediaOverview
        boundCount={boundCount}
        experimental={experimental}
        onOpenStudio={() => void navigate({ to: "/media" })}
      />
      <SettingsCard title={t("settings.media.modelsCard")}>
        {rows.map((row) => (
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
  const t = useT()
  return (
    <SettingsHub
      icon={RiImageLine}
      title={t("settings.media.hubTitle")}
      badge={experimental ? t("common.experimental") : t("settings.media.stable")}
      description={t("settings.media.hubDesc")}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenStudio}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 text-caption-2-medium"
        >
          <RiFolder6Line className="size-3.5 text-accent-500" />
          <span>{t("settings.media.openStudio")}</span>
          <RiArrowRightLine className="ml-0.5 size-3.5 opacity-60" />
        </Button>
      }
      pulses={[
        { label: t("settings.media.bound"), value: t("settings.media.boundValue", { count: boundCount }) },
        {
          label: t("settings.media.experimentalMedia"),
          value: experimental ? t("common.on") : t("common.off"),
          tone: experimental ? "warning" : "default"
        },
        { label: t("settings.media.unsetSlots"), value: String(4 - boundCount) }
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
  const t = useT()
  return (
    <SettingsCard title={t("settings.media.safetyTitle")}>
      <SettingsRow title={t("settings.media.experimentalMedia")} description={t("settings.media.experimentalDesc")}>
        <Switch checked={experimental} onCheckedChange={onExperimentalChange} />
      </SettingsRow>
      <SettingsRow title={t("settings.media.assetLibrary")} description={t("settings.media.assetDesc")}>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenStudio}
          className="inline-flex cursor-pointer items-center gap-1.5"
        >
          <RiFolder6Line className="size-3.5 text-accent-500" />
          <span>{t("settings.media.openStudio")}</span>
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
