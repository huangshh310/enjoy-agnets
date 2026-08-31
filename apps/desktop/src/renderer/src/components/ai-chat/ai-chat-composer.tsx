"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { RiAddLine, RiArrowUpLine, RiMicLine } from "@remixicon/react"
import { BorderBeam } from "@/components/ui/border-beam"
import { cx } from "@/utils/cx"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
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
  onSend
}: {
  composer: string
  onComposerChange: (value: string) => void
  running: boolean
  modelLabel: string
  modelId: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)

  // 随输入内容自适应调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 48), 180)
    textarea.style.height = `${nextHeight}px`
  }, [composer])

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
          className={cx(
            "@container relative flex min-w-0 flex-col overflow-hidden rounded-[22px] transition-all duration-200",
            "bg-background-tertiary-default/85 dark:bg-[#18181b]/95 backdrop-blur-md",
            "border border-border-button-default/70",
            "shadow-xs",
            isFocused && "border-border-focus-ring/60 shadow-card"
          )}
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 0 rgba(255,255,255,0.06)"
          }}
        >
          {/* 顶栏快捷操作胶囊 (Context 引入与多色模式切换) */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 px-3.5 pt-2.5 pb-0.5">
            <button
              type="button"
              aria-label="Add context"
              className="inline-flex items-center gap-1 rounded-full bg-background-secondary-default/70 hover:bg-background-secondary-hover border border-border-button-default/60 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors shadow-2xs"
            >
              <RiAddLine className="size-3.5 text-foreground-icon-secondary" />
              <span>Context</span>
            </button>

            <ExecutionModeMenu mode={mode} onChange={setMode} />
          </div>

          {/* 文本输入区 (自适应多行输入) */}
          <div className="px-3.5 py-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask Enjoy Agents anything, @ files, / for actions..."
              className="w-full min-h-[48px] max-h-48 resize-none bg-transparent py-1 text-[13.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-placeholder"
            />
          </div>

          {/* 底栏：窄宽度先收文字，再换行，发送键始终可见 */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 px-3 pb-2.5 pt-1">
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
                className="flex size-8 items-center justify-center rounded-full text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
              >
                <RiMicLine className="size-4.5" aria-hidden />
              </button>
              <button
                type="submit"
                aria-label="Send"
                disabled={running || composer.trim().length === 0}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 disabled:active:scale-100"
              >
                <RiArrowUpLine className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </BorderBeam>
    </form>
  )
}
