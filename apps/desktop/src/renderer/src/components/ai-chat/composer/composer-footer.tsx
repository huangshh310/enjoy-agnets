/**
 * Composer 底栏：附件、策略、Fast、语音与发送。
 * 探索/执行在顶栏；引擎芯片与思考在底栏，窄时按容器宽度藏文案。目标/阶段有内容走上沿轨，空入口仍在溢出菜单。
 * 733 一行（段 A）：行不折行；按容器实测宽选级 L0–L3e（footer-density.ts），级别经 row 的 data 属性下传。
 */
import { useRef } from "react"
import { RiMicLine } from "@remixicon/react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { composerSendReady } from "@renderer/hooks/runtime-interact/send-composer-guard"
import { composerActionButtons } from "@renderer/hooks/composer-submit-intent"
import { ComposerSendSplit } from "./runtime-interact/composer-send-split"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { AgentPicker } from "../agent-picker"
import { ComposerModelChip } from "./model-switch/composer-model-chip"
import { ComposerThinkingChrome } from "./thinking/composer-thinking-chrome"
import { ApprovalPolicyToggle } from "../approval-policy-toggle"
import { FastModeToggle } from "../fast-mode-toggle"
import { ComposerAttachMenu } from "./composer-attach-menu"
import { ComposerPreviewToggle } from "./composer-preview-toggle"
import { ComposerPromptLibraryButton } from "./prompt-library/composer-prompt-library-button"
import { ComposerOverflowMenu } from "./composer-overflow-menu"
import { SessionMeter } from "../usage/session-meter"
import type { ComposerProps } from "./composer.types"
import { formatComposerRemoteFootnote } from "@renderer/components/settings/workspace/parse-remote-label"
import { displayThinkingLabel } from "../thread/thinking-label"
import { ModelSwitchFootnoteSlot } from "./model-switch/model-switch-footnote-slot"
import { ComputerUseChip } from "./computer-use-chip"
import { PresetDesktopBiasPill } from "./preset-desktop-bias-pill"
import { HostInjectBar } from "./host-inject/host-inject-bar"
import { useI18n, type TranslateFn } from "@renderer/i18n"
import { FOOTER_GE2_HIDDEN, FOOTER_LEFT_CLIP, footerOverflowItems } from "./footer-density"
import { useFooterDensity } from "./use-footer-density"
import { footerDotTone, useFooterOptionalChips, type FooterOptionalChips } from "./use-footer-optional-chips"
import { hostInjectWarns } from "./host-inject/host-inject-view.ts"
import { HostInjectWarnLines } from "./host-inject/host-inject-popover.tsx"

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
  onPickFiles,
  previewOpen = false,
  onPreviewToggle,
  compactVerticalSlack = false
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
  previewOpen?: boolean
  onPreviewToggle?: () => void
  /** 仅托盘转单行条（slot<108）时收回底栏垂直余量；不改发送尺寸。 */
  compactVerticalSlack?: boolean
}) {
  const { t, locale } = useI18n()
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
  // E1 M3（luna §1.4 733 让位）：停止 + 排队并排时收起过程 chip（顶部已有「执行中」），不折行、不抬高 form。
  const showRunChip = running && !composerActionButtons(running, hasDraft).paired
  const paired = composerActionButtons(running, hasDraft).paired
  const optional = useFooterOptionalChips()
  const rowRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const contentKey = JSON.stringify([
    locale,
    runtimeId,
    modelLabel,
    modelId,
    running,
    paired,
    showRunChip,
    chrome.permission,
    chrome.fast,
    showVoice,
    Boolean(onPreviewToggle),
    optional.cu,
    optional.pb,
    optional.hi,
    optional.hostView.kind,
    optional.enabledMcp,
    optional.enabledSkills
  ])
  const { step, density, overflow } = useFooterDensity({ rowRef, leftRef, rightRef, contentKey })
  const moved = footerOverflowItems(step)
  const dot = moved.chips ? footerDotTone({ ...optional, view: optional.hostView }) : "none"
  const hasMovedChips = moved.chips && (optional.cu || optional.pb || optional.hi)
  const movedPreview = moved.preview && Boolean(onPreviewToggle)
  const overflowSection =
    hasMovedChips || moved.meter || moved.library || movedPreview ? (
      <FooterOverflowSection
        optional={optional}
        chips={hasMovedChips}
        meter={moved.meter}
        library={moved.library}
        preview={movedPreview}
        previewOpen={previewOpen}
        onPreviewToggle={onPreviewToggle}
      />
    ) : null
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
    <div
      ref={rowRef}
      data-testid="composer-footer-row"
      data-footer-density={density}
      data-footer-overflow={overflow}
      className={cx(
        "group/footer flex min-w-0 flex-nowrap items-center justify-between gap-x-1 gap-y-1.5 px-3 pt-1 pb-2.5 [&[data-footer-switching]_*]:transition-none",
        compactVerticalSlack && "gap-y-0.5 pt-0 pb-2"
      )}
    >
      {/* 裁切壳：只在 L≥1 横向裁切（L0 放得下、不裁，1440 合成层与现网一致）；纵向不裁，「已切换」浮签照常外溢 */}
      <div className={cx("flex min-w-0 flex-1", FOOTER_LEFT_CLIP)}>
      <div ref={leftRef} data-testid="composer-footer-left" className="flex w-max flex-nowrap items-center gap-1.5">
        <ComposerAttachMenu onPickFiles={onPickFiles} />
        {onPreviewToggle && !moved.preview ? (
          <ComposerPreviewToggle previewOpen={previewOpen} onToggle={onPreviewToggle} />
        ) : null}
        {moved.library ? null : <ComposerPromptLibraryButton />}
        <AgentPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <ComposerModelChip modelId={modelId} modelLabel={modelLabel} models={models} />
        <ComposerThinkingChrome compact modelId={modelId} modelLabel={modelLabel} models={models} />
        {moved.chips ? null : <ComputerUseChip />}
        {moved.chips ? null : <PresetDesktopBiasPill />}
        {moved.chips ? null : <HostInjectBar />}
        {moved.meter ? null : <SessionMeter />}
      </div>
      </div>
      <div ref={rightRef} data-testid="composer-footer-right" className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1">
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
        {showRunChip ? (
          <span
            data-testid="composer-run-chip"
            title={displayThinkingLabel(thinkingLabel, t)}
            aria-label={displayThinkingLabel(thinkingLabel, t)}
            className="flex max-w-[140px] items-center gap-1.5 truncate px-2 font-mono text-caption-2-medium text-accent-500 select-none group-data-[footer-density=2]/footer:w-3 group-data-[footer-density=2]/footer:justify-center group-data-[footer-density=2]/footer:px-0 group-data-[footer-density=3]/footer:w-3 group-data-[footer-density=3]/footer:justify-center group-data-[footer-density=3]/footer:px-0"
          >
            <span className="size-1.5 rounded-full bg-accent-500 animate-pulse group-data-[footer-density=2]/footer:size-3 group-data-[footer-density=3]/footer:size-3" />
            <span className={cx("truncate", FOOTER_GE2_HIDDEN)}>{displayThinkingLabel(thinkingLabel, t)}</span>
          </span>
        ) : null}
        <ComposerOverflowMenu
          overflowSection={overflowSection}
          dot={dot}
          status={dot === "none" ? "" : overflowStatusText(optional, t)}
        />
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

/** L3b 起底栏交给溢出菜单顶部小节的项：原组件原样渲染，不加文案。 */
function FooterOverflowSection({
  optional,
  chips,
  meter,
  library,
  preview,
  previewOpen,
  onPreviewToggle
}: {
  optional: FooterOptionalChips
  chips: boolean
  meter: boolean
  library: boolean
  preview: boolean
  previewOpen: boolean
  onPreviewToggle?: () => void
}) {
  return (
    <>
      {chips ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <ComputerUseChip />
          <PresetDesktopBiasPill />
          <HostInjectBar />
        </div>
      ) : null}
      {chips && optional.hi && hostInjectWarns(optional.hostView) ? (
        <div data-testid="composer-overflow-host-warn">
          <HostInjectWarnLines view={optional.hostView} />
        </div>
      ) : null}
      {meter || library || preview ? (
        <div className="flex flex-wrap items-center gap-1.5 [&_[data-testid=session-meter]]:inline-flex">
          {meter ? <SessionMeter /> : null}
          {library ? <ComposerPromptLibraryButton /> : null}
          {preview && onPreviewToggle ? (
            <ComposerPreviewToggle previewOpen={previewOpen} onToggle={onPreviewToggle} />
          ) : null}
        </div>
      ) : null}
    </>
  )
}

/** sr-only：L3 溢出菜单里此刻有哪些 chip（复用三颗 chip 的原文案）；HostInject 黄色时再加原警告文案。 */
function overflowStatusText(o: FooterOptionalChips, t: TranslateFn): string {
  const parts: string[] = []
  if (o.cu) parts.push(t("chat.desktopChip"))
  if (o.pb) parts.push(t("chat.presetDesktopBiasPill"))
  if (o.hi && o.hostLane) {
    parts.push(
      o.hostLane === "both"
        ? t("chat.hostInjectChip", { mcp: o.enabledMcp, skills: o.enabledSkills })
        : o.hostLane === "mcp"
          ? t("chat.hostInjectChipMcp", { mcp: o.enabledMcp })
          : t("chat.hostInjectChipSkills", { skills: o.enabledSkills })
    )
    const view = o.hostView
    if (view.kind === "failed") {
      parts.push(t("chat.hostInjectSkipped", { names: view.skipped.map((item) => item.name).join(" · ") }))
    } else if (view.kind === "unsupported") {
      if (view.mcp) parts.push(t("chat.hostInjectMcpUnsupported"))
      if (view.skills) parts.push(t("chat.hostInjectSkillsUnsupported"))
    }
  }
  return parts.join(" · ")
}
