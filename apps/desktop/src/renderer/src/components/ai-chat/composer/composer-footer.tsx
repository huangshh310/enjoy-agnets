/**
 * Composer 底栏：附件、策略、Fast、语音与发送。
 * 探索/执行、思考、引擎与模型芯片在顶栏。
 */
import { RiMicLine } from "@remixicon/react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { composerSendReady } from "@renderer/hooks/runtime-interact/send-composer-guard"
import { ComposerSendSplit } from "./runtime-interact/composer-send-split"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { ApprovalPolicyToggle } from "../approval-policy-toggle"
import { FastModeToggle } from "../fast-mode-toggle"
import { ComposerAttachMenu } from "./composer-attach-menu"
import { SessionMeter } from "../usage/session-meter"
import type { ComposerProps } from "./composer.types"
import { formatComposerRemoteFootnote } from "@renderer/components/settings/workspace/parse-remote-label"
import { ModelSwitchFootnoteSlot } from "./model-switch/model-switch-footnote-slot"
import { useT } from "@renderer/i18n"

export function ComposerFooter({
  hasDraft,
  running,
  modelLabel,
  modelId,
  models,
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
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const hasKey = useChatStore((state) => state.hasKey)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const remoteStatus = useChatStore((state) => state.remoteStatus)
  const remoteLabel = useChatStore((state) => state.remoteLabel)
  useCliLoginLoop(runtimeId)
  const chrome = composerChromeFor(runtimeId)
  const sendReady = composerSendReady({ runtimeId, hasKey, modelId, workspaceKind, remoteStatus })
  const showVoice = chrome.voice && canRealtime
  return (
    <div className="flex min-w-0 flex-col">
    {workspaceKind === "ssh" ? (
      <p className="px-3 text-caption-2-regular text-text-tertiary">
        {t("settings.workspace.remoteFootnote")}
        {remoteLabel ? ` · ${formatComposerRemoteFootnote(remoteLabel)}` : ""}
      </p>
    ) : (
      <ModelSwitchFootnoteSlot modelId={modelId} modelLabel={modelLabel} models={models} />
    )}
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-1.5 px-3 pt-1 pb-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <ComposerAttachMenu onPickFiles={onPickFiles} />
        <SessionMeter />
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        {chrome.permission ? <ApprovalPolicyToggle /> : null}
        {chrome.fast ? <FastModeToggle /> : null}
        {showVoice ? (
          <button
            type="button"
            aria-label={t("chat.voiceInput")}
            title={voiceOpen ? t("chat.stopVoice") : t("chat.voice")}
            onClick={onVoiceToggle}
            className={cx(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              voiceOpen
                ? "text-accent-500 hover:bg-background-secondary-hover"
                : "text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary"
            )}
          >
            <RiMicLine className="size-4.5" aria-hidden />
          </button>
        ) : null}
        {running ? (
          <span className="flex max-w-[140px] items-center gap-1.5 truncate px-2 font-mono text-caption-2-medium text-accent-500 select-none">
            <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
            <span className="truncate">{thinkingLabel || t("chat.working")}</span>
          </span>
        ) : null}
        <ComposerSendSplit
          running={running}
          hasDraft={hasDraft}
          ready={sendReady}
          onSend={onSend}
          onStop={onStop}
        />
      </div>
    </div>
    </div>
  )
}
