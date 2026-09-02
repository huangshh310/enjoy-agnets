/**
 * Composer 外壳：拖拽/粘贴附件、自适应输入、顶栏与底栏。
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { BorderBeam } from "@/components/ui/border-beam"
import { cx } from "@/utils/cx"
import { isRealtimeOpen, toggleRealtimeMic } from "@renderer/hooks/realtime-mic"
import { ComposerQueue } from "./composer-queue"
import { ComposerFooter } from "./composer/composer-footer"
import { ComposerToolbar } from "./composer/composer-toolbar"
import type { ComposerProps } from "./composer/composer.types"
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
  onStop,
  onAttach,
  className
}: ComposerProps) {
  const t = useT()
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const capabilities = models.find((model) => model.id === modelId)?.capabilities ?? []
  const canRealtime = capabilities.includes("realtime")

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 52), 180)}px`
  }, [composer])

  function pickFiles() {
    fileRef.current?.click()
  }

  function handleFiles(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) onAttach(file)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items
    if (!items?.length) return
    let hasImage = false
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue
      const file = item.getAsFile()
      if (!file) continue
      hasImage = true
      onAttach(file)
    }
    if (hasImage && !event.clipboardData.getData("text/plain")) event.preventDefault()
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
    if (!running && composer.trim().length > 0) onSend()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (!running && composer.trim().length > 0) onSend()
  }

  return (
    <div className={cx("relative flex flex-col w-full min-w-0 px-6 pb-2", className)}>
      <ComposerQueue />
      <form onSubmit={onSubmit} className="relative z-10 w-full min-w-0">
        <BorderBeam
          size="md"
          colorVariant="ocean"
          theme="auto"
          active={isFocused || running || Boolean(composer.trim())}
          strength={isFocused || running || Boolean(composer.trim()) ? 0.75 : 0}
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
            "@container relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-border-button-default bg-background-secondary-default/95 dark:bg-background-tertiary-default shadow-card hover:border-border-button-hover hover:shadow-dropdown backdrop-blur-md transition-all duration-200",
            isFocused && "border-accent-500 ring-2 ring-accent-500/15 shadow-dropdown",
            isDragging && "border-accent-500 ring-2 ring-accent-500/20"
          )}
        >
          {isDragging ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[22px] border-2 border-dashed border-accent-500 bg-background-primary-default/90 backdrop-blur-xs">
              <p className="text-body-medium text-accent-500">{t("chat.dropAttach")}</p>
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

          <ComposerToolbar onPickFiles={pickFiles} />
          <div className="px-3.5 py-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t("chat.placeholder")}
              className="max-h-48 min-h-[52px] w-full resize-none bg-transparent py-1.5 text-body-medium leading-relaxed text-text-primary outline-none placeholder:text-text-secondary/70"
            />
          </div>

          <ComposerFooter
            composer={composer}
            onComposerChange={onComposerChange}
            running={running}
            modelLabel={modelLabel}
            modelId={modelId}
            models={models}
            onModelChange={onModelChange}
            onStop={onStop}
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
