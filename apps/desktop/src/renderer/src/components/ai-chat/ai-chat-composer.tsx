"use client"

import type { FormEvent, KeyboardEvent } from "react"
import { RiAddLine, RiArrowUpLine, RiMicLine } from "@remixicon/react"
import { ComposerLoader } from "@/components/application/composer-loader/composer-loader"
import type { ModelOption } from "@renderer/stores/chat-store"
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
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    onSend()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <form onSubmit={onSubmit} className="px-8 pb-1">
      <ComposerLoader active={running} surface={false}>
        <div className="flex items-end gap-1.5 rounded-[28px] bg-background-tertiary-default px-1.5 py-1.5">
          <button
            type="button"
            aria-label="Add context"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-secondary shadow-xs hover:bg-ai-chat-composer-add-hover-background"
          >
            <RiAddLine className="size-5" aria-hidden />
          </button>
          <textarea
            rows={1}
            value={composer}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask me anything"
            className="min-h-8 max-h-32 flex-1 resize-none bg-transparent py-1.5 text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
          />

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
            className="flex size-8 items-center justify-center rounded-full text-foreground-icon-secondary hover:bg-background-secondary-hover"
          >
            <RiMicLine className="size-5" aria-hidden />
          </button>
          <button
            type="submit"
            aria-label="Send"
            disabled={running || composer.trim().length === 0}
            className="flex size-8 items-center justify-center rounded-full bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected disabled:opacity-40"
          >
            <RiArrowUpLine className="size-5" aria-hidden />
          </button>
        </div>
      </ComposerLoader>
    </form>
  )
}
