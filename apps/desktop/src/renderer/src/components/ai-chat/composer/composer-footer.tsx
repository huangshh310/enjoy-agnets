/**
 * Composer 底栏：附件、策略、Fast、语音与发送。
 * 探索/执行在顶栏；引擎芯片与思考在底栏，窄时按容器宽度藏文案。目标/阶段有内容走上沿轨，空入口仍在溢出菜单。
 */
import { RiMicLine } from "@remixicon/react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { composerSendReady } from "@renderer/hooks/runtime-interact/send-composer-guard"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { ComposerSendSplit } from "./runtime-interact/composer-send-split"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { AgentPicker } from "../agent-picker"
import { ComposerThinkingChrome } from "./thinking/composer-thinking-chrome"
import { ApprovalPolicyToggle } from "../approval-policy-toggle"
import { FastModeToggle } from "../fast-mode-toggle"
import { ComposerAttachMenu } from "./composer-attach-menu"
import { ComposerOverflowMenu } from "./composer-overflow-menu"
import { SessionMeter } from "../usage/session-meter"
import type { ComposerProps } from "./composer.types"
import { formatComposerRemoteFootnote } from "@renderer/components/settings/workspace/parse-remote-label"
import { displayThinkingLabel } from "../thread/thinking-label"
import { ModelSwitchFootnoteSlot } from "./model-switch/model-switch-footnote-slot"
import { ComputerUseChip } from "./computer-use-chip"
import { HostInjectBar } from "./host-inject/host-inject-bar"
import { useT } from "@renderer/i18n"

export function ComposerFooter({
  hasDraft,
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
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const hasKey = useChatStore((state) => state.hasKey)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const remoteStatus = useChatStore((state) => state.remoteStatus)
  const remoteLabel = useChatStore((state) => state.remoteLabel)
  useCliLoginLoop(runtimeId)
  const chrome = composerChromeFor(runtimeId)
  const chatReady = useChatReadiness().data?.ready === true
  const sendReady = composerSendReady(
    { runtimeId, hasKey, modelId, workspaceKind, remoteStatus },
    { chatReady }
  )
  const showVoice = chrome.voice && canRealtime
  return (
    <div className="flex min-w-0 flex-col">
    {workspaceKind === "ssh" ? (
      <p className="px-3 text-caption-2-regular text-text-secondary">
        {t("settings.workspace.remoteFootnote")}
        {remoteLabel ? ` · ${formatComposerRemoteFootnote(remoteLabel)}` : ""}
      </p>
    ) : (
      <ModelSwitchFootnoteSlot modelId={modelId} modelLabel={modelLabel} models={models} />
    )}
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-1.5 px-3 pt-1 pb-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <ComposerAttachMenu onPickFiles={onPickFiles} />
        <AgentPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <ComposerThinkingChrome compact modelId={modelId} modelLabel={modelLabel} models={models} />
        <ComputerUseChip />
        <HostInjectBar />
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
            <span className="truncate">{displayThinkingLabel(thinkingLabel, t)}</span>
          </span>
        ) : null}
        <ComposerOverflowMenu />
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
