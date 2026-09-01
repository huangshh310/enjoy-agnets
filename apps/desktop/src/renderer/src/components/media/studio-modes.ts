/**
 * 媒体生成器分段：生图 / TTS / 实验视频 / STT。
 */
import { RiImageLine, RiMicLine, RiMovieLine, RiVolumeUpLine } from "@remixicon/react"
import type { StudioMode } from "./media-page.types"

export const STUDIO_MODES: {
  id: StudioMode
  label: string
  icon: typeof RiImageLine
  capability?: string
  placeholder: string
  experimental?: boolean
}[] = [
  {
    id: "image",
    label: "Image",
    icon: RiImageLine,
    capability: "image",
    placeholder: "Describe the image you want to generate..."
  },
  {
    id: "speech",
    label: "Speech (TTS)",
    icon: RiVolumeUpLine,
    capability: "speech",
    placeholder: "Enter text to synthesize into spoken audio..."
  },
  {
    id: "video",
    label: "Video (Exp)",
    icon: RiMovieLine,
    capability: "video",
    placeholder: "Describe video scene to generate (Experimental)...",
    experimental: true
  },
  {
    id: "transcribe",
    label: "STT & Audio",
    icon: RiMicLine,
    capability: "transcription",
    placeholder: "Select an audio asset from library below to transcribe or translate..."
  }
]
