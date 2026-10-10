/**
 * Composer 外壳：拖拽/粘贴附件、自适应输入、引用 Chip 与底栏。工作区名在状态栏，不进输入框顶。
 */
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react"
import { BorderBeam } from "@/components/ui/border-beam"
import { cx } from "@/utils/cx"
import { isRealtimeOpen, toggleRealtimeMic } from "@renderer/hooks/realtime-mic"
import { useComposerHasDraft } from "@renderer/hooks/runtime-interact/use-composer-has-draft"
import { ComposerQueue } from "./composer-queue"
import { ComposerContextChips } from "./composer/composer-context-chips"
import { ComposerQuoteChips } from "./composer/runtime-interact/composer-quote-chips"
import { ComposerHostModeChip } from "./composer/composer-host-mode-chip"
import { ExploreCapabilityRail } from "./composer/explore-execute/explore-capability-rail"
import { ExploreDesktopBanner } from "./composer/explore-execute/explore-desktop-banner"
import { ExploreInterceptBanner } from "./composer/explore-execute/explore-intercept-banner"
import { ComposerSkillChipBar } from "./composer/mentions/composer-skill-chip-bar"
import { ComposerInput } from "./composer/mentions/composer-input"
import { ComposerFooter } from "./composer/composer-footer"
import { ComposerTopChrome } from "./composer/composer-top-chrome"
import { ComposerActivityFrame } from "./composer/stacked-rail/composer-activity-frame"
import { ComposerBranchMismatch } from "./composer/composer-branch-mismatch"
import { listComposerAssets } from "@renderer/hooks/composer-assets"
import { queueComposerFocus, registerComposerFocus } from "@renderer/hooks/composer-focus"
import { useFollowupAutostart } from "@renderer/hooks/use-followup-autostart"
import { clipboardModifiers, isPasteInlineShortcut, planComposerPaste } from "@renderer/lib/pasted-text"
import type { ComposerProps } from "./composer/composer.types"
import { EngineHandoffDock } from "./agent-picker/handoff/engine-handoff-dock"
import { ModelSwitchNotice } from "./composer/model-switch/model-switch-feedback"
import { useT } from "@renderer/i18n"


export function AiChatComposer({
  composer,
  onComposerChange,
  running,
  modelLabel,
  modelId,
  models,
  onModelChange,
  onSend,
  onSteer,
  onStop,
  onAttach,
  className,
  autoFocus = false
}: ComposerProps) {
  const t = useT()
  useFollowupAutostart()
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const hasDraft = useComposerHasDraft(composer)
  const capabilities = models.find((model) => model.id === modelId)?.capabilities ?? []
  const canRealtime = capabilities.includes("realtime")

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 52), 180)}px`
  }, [composer])

  useLayoutEffect(() => {
    const unregister = registerComposerFocus(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      const end = textarea.value.length
      textarea.setSelectionRange(end, end)
    })
    if (autoFocus) {
      const textarea = textareaRef.current
      if (textarea && document.activeElement !== textarea) {
        textarea.focus()
        const end = textarea.value.length
        textarea.setSelectionRange(end, end)
      }
    } else {
      queueComposerFocus()
    }
    return unregister
  }, [autoFocus])

  function pickFiles() {
    fileRef.current?.click()
  }

  function handleFiles(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) onAttach(file)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const data = event.clipboardData
    if (!data) return
    const textarea = event.currentTarget
    const plan = planComposerPaste({
      text: data.getData("text/plain"),
      imageFiles: clipboardImageFiles(data.items),
      value: composer,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
      existingNames: listComposerAssets().map((item) => item.name),
      bypassAutoAttachment: isPasteInlineShortcut(clipboardModifiers(event))
    })
    for (const file of plan.attach) onAttach(file)
    if (plan.preventDefault) event.preventDefault()
  }

  function handleDragOver(event: React.DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setIsDragging(false)
  }

  function handleDrop(event: React.DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files?.length) handleFiles(event.dataTransfer.files)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    onSend()
  }

  return (
    <div className={cx("relative flex flex-col w-full min-w-0 px-6 pb-2", className)}>
      <EngineHandoffDock />
      <ComposerQueue />
      <ExploreDesktopBanner />
      <ExploreInterceptBanner />
      <ComposerBranchMismatch />
      <ModelSwitchNotice />
      <ComposerActivityFrame />
      <form
        data-composer="true"
        data-toast-clearance=""
        onSubmit={onSubmit}
        className="relative z-10 w-full min-w-0"
      >
        <BorderBeam
          size="md"
          colorVariant="ocean"
          theme="auto"
          active={isFocused || running || hasDraft}
          strength={isFocused || running || hasDraft ? 0.75 : 0}
          borderRadius={22}
          className="w-full min-w-0"
        >
          <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-frost="chip"
          className={cx(
            "@container relative flex min-w-0 flex-col overflow-visible rounded-3xl pt-2",
            "border border-border-button-default bg-background-secondary-default dark:bg-background-tertiary-default",
            "shadow-card backdrop-blur-md transition-all duration-300 ease-out",
            "hover:border-border-button-hover hover:shadow-dropdown",
            isFocused && "border-accent-500 ring-2 ring-accent-500/20 shadow-[0_4px_24px_-2px_rgba(59,130,246,0.16)] dark:shadow-[0_4px_28px_-2px_rgba(59,130,246,0.22)]",
            isDragging && "scale-[1.008] border-accent-500 ring-2 ring-accent-500/25"
          )}
        >
          {isDragging ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-accent-500 bg-background-primary-default/90 backdrop-blur-xs animate-in fade-in-50 zoom-in-95 duration-200">
              <p className="text-body-medium font-medium text-accent-500">{t("chat.dropAttach")}</p>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            multiple
            data-testid="composer-attach"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files)
              event.currentTarget.value = ""
            }}
          />

          <ComposerTopChrome />
          <ComposerContextChips />
          <ComposerHostModeChip />
          <ComposerQuoteChips />
          <ComposerSkillChipBar />
          <ComposerInput
            value={composer}
            onChange={onComposerChange}
            onSend={onSend}
            onSteer={onSteer}
            running={running}
            autoFocus={autoFocus}
            textareaRef={textareaRef}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <ExploreCapabilityRail />

          <ComposerFooter
            composer={composer}
            hasDraft={hasDraft}
            onComposerChange={onComposerChange}
            running={running}
            modelLabel={modelLabel}
            modelId={modelId}
            models={models}
            onModelChange={onModelChange}
            onStop={onStop}
            onSend={onSend}
            canRealtime={canRealtime}
            voiceOpen={voiceOpen}
            onVoiceToggle={() => void toggleRealtimeMic().then(() => setVoiceOpen(isRealtimeOpen()))}
            onPickFiles={pickFiles}
          />
          </div>
        </BorderBeam>
      </form>
    </div>
  )
}

function clipboardImageFiles(items: DataTransferItemList | undefined): File[] {
  if (!items?.length) return []
  const files: File[] = []
  for (const item of items) {
    if (!item.type.startsWith("image/")) continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}
