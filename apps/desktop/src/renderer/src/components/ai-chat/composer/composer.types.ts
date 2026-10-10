/**
 * Composer 外壳与子区域共用的属性。
 */
import type { ModelOption } from "@renderer/stores/chat-store"

export type ComposerProps = {
  composer: string
  onComposerChange: (value: string) => void
  running: boolean
  modelLabel: string
  modelId: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
  onSend: () => void
  onSteer: () => void
  onStop: () => void
  onAttach: (file: File) => void
  className?: string
  autoFocus?: boolean
}
