"use client"

import type { FormEvent, KeyboardEvent } from "react"
import { RiAddLine, RiArrowDownSLine, RiArrowUpLine, RiMicLine } from "@remixicon/react"
import { ComposerLoader } from "@/components/application/composer-loader/composer-loader"
import {
  Dropdown,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger
} from "@/components/base/dropdown/dropdown"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"

const MODELS = [
  { id: "deepseek-chat", label: "DeepSeek V4" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" }
]

export function AiChatComposer() {
  const composer = useChatStore((state) => state.composer)
  const setComposer = useChatStore((state) => state.setComposer)
  const running = useChatStore((state) => state.running)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const setModel = useChatStore((state) => state.setModel)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void sendComposerMessage()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendComposerMessage()
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
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask me anything"
            className="min-h-8 max-h-32 flex-1 resize-none bg-transparent py-1.5 text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <Dropdown>
            <DropdownTrigger className="flex h-8 items-center gap-1 rounded-full px-2 text-body-medium text-text-secondary hover:bg-background-secondary-hover">
              {modelLabel}
              <RiArrowDownSLine className="size-4" aria-hidden />
            </DropdownTrigger>
            <DropdownPopover aria-label="Models" placement="top">
              {MODELS.map((model) => (
                <DropdownItem key={model.id} onSelect={() => setModel(model.id, model.label)}>
                  {model.label}
                </DropdownItem>
              ))}
            </DropdownPopover>
          </Dropdown>
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
