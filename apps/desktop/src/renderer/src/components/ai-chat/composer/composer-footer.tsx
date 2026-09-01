/**
 * Composer 底栏：附件菜单、策略/模型/推理、语音与发送。
 */
import { RiArrowUpLine, RiMicLine, RiStopLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { ApprovalPolicyToggle } from "../approval-policy-toggle"
import { ModelPicker } from "../model-picker"
import { ReasoningEffortToggle } from "../reasoning-effort-toggle"
import { ComposerAttachMenu } from "./composer-attach-menu"
import type { ComposerProps } from "./composer.types"

export function ComposerFooter({
  composer,
  onComposerChange,
  running,
  modelLabel,
  modelId,
  models,
  onModelChange,
  onStop,
  canRealtime,
  voiceOpen,
  onVoiceToggle,
  onPickFiles
}: Pick<
  ComposerProps,
  | "composer"
  | "onComposerChange"
  | "running"
  | "modelLabel"
  | "modelId"
  | "models"
  | "onModelChange"
  | "onStop"
> & {
  canRealtime: boolean
  voiceOpen: boolean
  onVoiceToggle: () => void
  onPickFiles: () => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-1 px-3 pt-1 pb-2.5">
      <ComposerAttachMenu
        composer={composer}
        onComposerChange={onComposerChange}
        onPickFiles={onPickFiles}
      />
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
        <ApprovalPolicyToggle />
        <ModelPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <ReasoningEffortToggle />
        <button
          type="button"
          aria-label="Voice input"
          disabled={!canRealtime}
          title={
            canRealtime
              ? voiceOpen
                ? "Stop voice (experimental)"
                : "Voice (experimental)"
              : "This model does not advertise Realtime."
          }
          onClick={onVoiceToggle}
          className={cx(
            "flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent",
            voiceOpen
              ? "text-accent-500 hover:bg-background-secondary-hover"
              : "text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          )}
        >
          <RiMicLine className="size-4.5" aria-hidden />
        </button>
        <button
          type={running ? "button" : "submit"}
          aria-label={running ? "Stop" : "Send"}
          disabled={!running && composer.trim().length === 0}
          onClick={running ? onStop : undefined}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 disabled:active:scale-100"
        >
          {running ? <RiStopLine className="size-5" aria-hidden /> : <RiArrowUpLine className="size-5" aria-hidden />}
        </button>
      </div>
    </div>
  )
}
