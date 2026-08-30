"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiCompass3Line,
  RiMicLine,
  RiQuestionLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { BorderBeam } from "@/components/ui/border-beam"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { ModelPicker } from "./model-picker"
import { ReasoningEffortToggle } from "./reasoning-effort-toggle"

/** 运行模式多色彩体系与元数据配置 */
const MODE_ITEMS = [
  {
    id: "agent" as const,
    label: "Agent",
    desc: "Autonomous coding & tools",
    icon: RiTerminalBoxLine,
    colorClass: "text-purple-600 dark:text-purple-300",
    bgClass: "bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/15 dark:bg-purple-500/15 dark:border-purple-500/30",
    iconColor: "text-purple-500 dark:text-purple-400"
  },
  {
    id: "ask" as const,
    label: "Ask",
    desc: "Read-only Q&A & search",
    icon: RiQuestionLine,
    colorClass: "text-sky-600 dark:text-sky-300",
    bgClass: "bg-sky-500/10 border-sky-500/25 hover:bg-sky-500/15 dark:bg-sky-500/15 dark:border-sky-500/30",
    iconColor: "text-sky-500 dark:text-sky-400"
  },
  {
    id: "plan" as const,
    label: "Plan",
    desc: "Architecture & planning",
    icon: RiCompass3Line,
    colorClass: "text-amber-600 dark:text-amber-300",
    bgClass: "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:border-amber-500/30",
    iconColor: "text-amber-500 dark:text-amber-400"
  },
  {
    id: "debug" as const,
    label: "Debug",
    desc: "Systematic troubleshooting",
    icon: RiCodeSSlashLine,
    colorClass: "text-rose-600 dark:text-rose-300",
    bgClass: "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15 dark:bg-rose-500/15 dark:border-rose-500/30",
    iconColor: "text-rose-500 dark:text-rose-400"
  }
]

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

  const activeModeItem = MODE_ITEMS.find((m) => m.id === mode) ?? MODE_ITEMS[0]
  const ActiveIcon = activeModeItem.icon

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
    <form onSubmit={onSubmit} className="px-6 pb-2">
      <BorderBeam
        size="md"
        colorVariant="colorful"
        active={isFocused || running || Boolean(composer.trim())}
        borderRadius={22}
        className="w-full"
      >
        <div
          className={cx(
            "relative flex flex-col rounded-[22px] transition-all duration-200 overflow-hidden",
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
          <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0.5">
            <button
              type="button"
              aria-label="Add context"
              className="inline-flex items-center gap-1 rounded-full bg-background-secondary-default/70 hover:bg-background-secondary-hover border border-border-button-default/60 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors shadow-2xs"
            >
              <RiAddLine className="size-3.5 text-foreground-icon-secondary" />
              <span>Context</span>
            </button>

            {/* 模式选择下拉菜单 (多色区分，无黑边框，精致投影与说明) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Select execution mode"
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all shadow-2xs outline-none cursor-pointer",
                    activeModeItem.bgClass,
                    activeModeItem.colorClass
                  )}
                >
                  <ActiveIcon className={cx("size-3.5 shrink-0", activeModeItem.iconColor)} />
                  <span>{activeModeItem.label}</span>
                  <RiArrowDownSLine className="size-3 opacity-60 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-56 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Execution Mode
                </div>
                {MODE_ITEMS.map((item) => {
                  const ItemIcon = item.icon
                  const isSelected = mode === item.id
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={cx(
                        "flex items-center justify-between rounded-xl px-2 py-1.5 text-left cursor-pointer transition-colors",
                        isSelected
                          ? "bg-background-secondary-default text-text-primary font-medium"
                          : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cx(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg border",
                            item.bgClass
                          )}
                        >
                          <ItemIcon className={cx("size-3.5", item.iconColor)} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-medium leading-tight text-text-primary">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-text-tertiary leading-tight truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <RiCheckLine className={cx("size-4 shrink-0", item.iconColor)} />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* 底栏工具条 (多供应商模型选择、思考能量条、语音与发送按钮) */}
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-1" />

            <div className="flex items-center gap-1.5 ml-auto">
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
