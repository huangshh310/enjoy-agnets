import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  RiAddLine,
  RiArrowUpLine,
  RiAttachmentLine,
  RiFolder6Line,
  RiGlobalLine,
  RiMicLine,
  RiStopLine
} from "@remixicon/react"
import { BorderBeam } from "@/components/ui/border-beam"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { isRealtimeOpen, toggleRealtimeMic } from "@renderer/hooks/realtime-mic"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { ComposerQueue } from "./composer-queue"
import { ApprovalPolicyToggle } from "./approval-policy-toggle"
import { ExecutionModeMenu } from "./execution-mode-menu"
import { ModelPicker } from "./model-picker"
import { ReasoningEffortToggle } from "./reasoning-effort-toggle"

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
  onAttach
}: {
  composer: string
  onComposerChange: (value: string) => void
  running: boolean
  modelLabel: string
  modelId: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
  onSend: () => void
  onStop: () => void
  onAttach: (file: File) => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const capabilities = models.find((model) => model.id === modelId)?.capabilities ?? []
  const canRealtime = capabilities.includes("realtime")

  // 随输入内容自适应调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 48), 180)
    textarea.style.height = `${nextHeight}px`
  }, [composer])

  function handleFiles(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      onAttach(file)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items
    if (!items || items.length === 0) return

    let hasImage = false
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          hasImage = true
          onAttach(file)
        }
      }
    }
    if (hasImage && !event.clipboardData.getData("text/plain")) {
      event.preventDefault()
    }
  }

  function handleDragOver(event: React.DragEvent) {
    if (event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault()
      setIsDragging(true)
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setIsDragging(false)
  }

  function handleDrop(event: React.DragEvent) {
    if (event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault()
      setIsDragging(false)
      if (event.dataTransfer.files?.length) {
        handleFiles(event.dataTransfer.files)
      }
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!running && composer.trim().length > 0) {
      onSend()
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!running && composer.trim().length > 0) {
        onSend()
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 px-6 pb-2">
      <BorderBeam
        size="md"
        colorVariant="colorful"
        active={isFocused || running || Boolean(composer.trim())}
        borderRadius={22}
        className="w-full min-w-0"
      >
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cx(
            "@container relative flex min-w-0 flex-col overflow-hidden rounded-[22px] transition-all duration-200",
            "bg-background-tertiary-default/85 dark:bg-[#18181b]/95 backdrop-blur-md",
            "border border-border-button-default/70",
            "shadow-xs",
            isFocused && "border-border-focus-ring/60 shadow-card",
            isDragging && "border-accent-500/80 ring-2 ring-accent-500/20"
          )}
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 0 rgba(255,255,255,0.06)"
          }}
        >
          {/* 拖拽释放指示遮罩 */}
          {isDragging ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[22px] bg-background-primary-default/90 backdrop-blur-xs border-2 border-dashed border-accent-500">
              <p className="text-body-medium font-medium text-accent-600 dark:text-accent-400">
                Drop files or images here to attach
              </p>
            </div>
          ) : null}

          {/* 顶栏快捷操作胶囊 (Context 引入、工作区胶囊与模式切换) */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 px-3.5 pt-2.5 pb-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
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
              <button
                type="button"
                aria-label="Add context"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-full bg-background-secondary-default/70 hover:bg-background-secondary-hover border border-border-button-default/60 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors shadow-2xs"
              >
                <RiAddLine className="size-3.5 text-foreground-icon-secondary" />
                <span>Context</span>
              </button>

              <ExecutionModeMenu mode={mode} onChange={setMode} />
            </div>

            {/* Codex-style Workspace Capsule */}
            {workspaceId ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default/60 bg-background-secondary-default/60 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary shadow-2xs">
                <RiFolder6Line className="size-3 text-accent-500" />
                <span className="max-w-[120px] truncate font-semibold text-text-primary">
                  {workspaceName}
                </span>
                <span className="text-text-tertiary">·</span>
                <span className="text-caption-2-medium text-text-tertiary">本地</span>
              </div>
            ) : null}
          </div>

          {/* 附件/图片排队区（置于输入框最上方） */}
          <ComposerQueue />

          {/* 文本输入区 (自适应多行输入) */}
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
              placeholder="Ask Enjoy Agents anything, @ files, / for actions..."
              className="w-full min-h-[48px] max-h-48 resize-none bg-transparent py-1 text-[13.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-placeholder"
            />
          </div>

          {/* 底栏：左侧添加附件图标菜单 + 右侧模型选择/语音/发送按钮 */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-1 px-3 pb-2.5 pt-1">
            {/* 左下角快捷添加图片/文件与数据源菜单 */}
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add photos, files & sources"
                    title="Add photos, files & sources"
                    className="flex size-7.5 items-center justify-center rounded-full text-foreground-icon-secondary transition-all hover:bg-background-secondary-hover hover:text-text-primary hover:scale-105 active:scale-95 border border-border-button-default/50 hover:border-border-button-default shadow-2xs"
                  >
                    <RiAddLine className="size-4.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="w-72 rounded-2xl border-none bg-background-primary-default p-1.5 shadow-card backdrop-blur-md"
                >
                  <DropdownMenuItem
                    onClick={() => fileRef.current?.click()}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-background-secondary-hover"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
                      <RiAttachmentLine className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col text-left">
                      <span className="truncate text-body-medium font-medium text-text-primary">
                        Add photos & files
                      </span>
                      <span className="truncate text-caption-2-medium text-text-tertiary">
                        Upload from your computer
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onComposerChange(composer ? `${composer} @` : "@")}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-background-secondary-hover"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
                      <RiFolder6Line className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col text-left">
                      <span className="truncate text-body-medium font-medium text-text-primary">
                        Workspace files
                      </span>
                      <span className="truncate text-caption-2-medium text-text-tertiary">
                        Reference files & docs (@)
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onComposerChange(composer ? `${composer} /web ` : "/web ")}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-background-secondary-hover"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
                      <RiGlobalLine className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col text-left">
                      <span className="truncate text-body-medium font-medium text-text-primary">
                        Web search
                      </span>
                      <span className="truncate text-caption-2-medium text-text-tertiary">
                        Real-time web & documentation
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <div className="mt-1 border-t border-border-card/40 px-3 pt-2 pb-1 text-caption-2-medium text-text-tertiary">
                    Type @ for files, / for actions
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 右下角：策略/模型/推理/语音/发送按钮 */}
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 ml-auto">
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                <ApprovalPolicyToggle />
                <ModelPicker
                  modelId={modelId}
                  modelLabel={modelLabel}
                  models={models}
                  onModelChange={onModelChange}
                />
                <ReasoningEffortToggle />
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
                  onClick={() =>
                    void toggleRealtimeMic().then(() => setVoiceOpen(isRealtimeOpen()))
                  }
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
          </div>
        </div>
      </BorderBeam>
    </form>
  )
}
