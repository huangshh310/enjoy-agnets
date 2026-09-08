/**
 * Composer 底栏：附件菜单、策略/模型/推理、语音与发送。
 */
import { RiMicLine } from "@remixicon/react"
import { ComposerSendSplit } from "./runtime-interact/composer-send-split"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { ExecutionModeMenu } from "../execution-mode-menu"
import { ApprovalPolicyToggle } from "../approval-policy-toggle"
import { AgentPicker } from "../agent-picker"
import { ReasoningEffortToggle } from "../reasoning-effort-toggle"
import { FastModeToggle } from "../fast-mode-toggle"
import { ComposerAttachMenu } from "./composer-attach-menu"
import type { ComposerProps } from "./composer.types"
import { useT } from "@renderer/i18n"

export function ComposerFooter({
  composer,
  hasDraft,
  onComposerChange,
  running,
  modelLabel,
  modelId,
  models,
  onModelChange,
  onStop,
  onSend,
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
  | "onSend"
> & {
  hasDraft: boolean
  canRealtime: boolean
  voiceOpen: boolean
  onVoiceToggle: () => void
  onPickFiles: () => void
}) {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-1.5 px-3 pt-1 pb-2.5">
      <ComposerAttachMenu
        composer={composer}
        onComposerChange={onComposerChange}
        onPickFiles={onPickFiles}
      />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        <ExecutionModeMenu mode={mode} onChange={setMode} />
        <ApprovalPolicyToggle />
        <AgentPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <FastModeToggle />
        <ReasoningEffortToggle />
        <button
          type="button"
          aria-label={t("chat.voiceInput")}
          disabled={!canRealtime}
          title={
            canRealtime
              ? voiceOpen
                ? t("chat.stopVoice")
                : t("chat.voice")
              : t("chat.noRealtime")
          }
          onClick={onVoiceToggle}
          className={cx(
            "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent",
            voiceOpen
              ? "text-accent-500 hover:bg-background-secondary-hover"
              : "text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          )}
        >
          <RiMicLine className="size-4.5" aria-hidden />
        </button>
        {running ? (
          <span className="flex max-w-[140px] items-center gap-1.5 truncate px-2 font-mono text-caption-2-medium text-accent-500 select-none">
            <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
            <span className="truncate">{thinkingLabel || t("chat.modeAgent")}</span>
          </span>
        ) : null}
        <ComposerSendSplit
          running={running}
          hasDraft={hasDraft}
          onSend={onSend}
          onStop={onStop}
        />
      </div>
    </div>
  )
}
