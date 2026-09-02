/**
 * 媒体生成器分段：生图 / TTS / 实验视频 / STT。
 */
import { RiImageLine, RiMicLine, RiMovieLine, RiVolumeUpLine } from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import type { StudioMode } from "./media-page.types"

export type StudioModeEntry = {
  id: StudioMode
  label: string
  icon: typeof RiImageLine
  capability?: string
  placeholder: string
  experimental?: boolean
}

const MODE_DEFS: Array<
  Omit<StudioModeEntry, "label" | "placeholder"> & { labelKey: string; placeholderKey: string }
> = [
  {
    id: "image",
    labelKey: "pages.media.modeImage",
    icon: RiImageLine,
    capability: "image",
    placeholderKey: "pages.media.modeImagePlaceholder"
  },
  {
    id: "speech",
    labelKey: "pages.media.modeSpeech",
    icon: RiVolumeUpLine,
    capability: "speech",
    placeholderKey: "pages.media.modeSpeechPlaceholder"
  },
  {
    id: "video",
    labelKey: "pages.media.modeVideo",
    icon: RiMovieLine,
    capability: "video",
    placeholderKey: "pages.media.modeVideoPlaceholder",
    experimental: true
  },
  {
    id: "transcribe",
    labelKey: "pages.media.modeTranscribe",
    icon: RiMicLine,
    capability: "transcription",
    placeholderKey: "pages.media.modeTranscribePlaceholder"
  }
]

export function getStudioModes(t: TranslateFn): StudioModeEntry[] {
  return MODE_DEFS.map((entry) => ({
    id: entry.id,
    label: t(entry.labelKey),
    icon: entry.icon,
    capability: entry.capability,
    placeholder: t(entry.placeholderKey),
    experimental: entry.experimental
  }))
}
