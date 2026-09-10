/**
 * 运行模式胶囊：智能体 / 规划 / 问答 / 调试。
 * 规划与问答不注册写工具；调试与智能体同一套写工具，只换提示词。
 */
import { useEffect } from "react"
import {
  RiArrowDownSLine,
  RiBugLine,
  RiCheckLine,
  RiCompass3Line,
  RiQuestionLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"
import { coerceComposerMode, COMPOSER_VISIBLE_MODES, type ComposerVisibleMode } from "./composer/composer-mode"

export interface ModeItemConfig {
  id: ComposerVisibleMode
  label: string
  desc: string
  badge: string
  icon: typeof RiTerminalBoxLine
}

export const MODE_ICONS: Record<ComposerVisibleMode, typeof RiTerminalBoxLine> = {
  agent: RiTerminalBoxLine,
  plan: RiCompass3Line,
  ask: RiQuestionLine,
  debug: RiBugLine
}

const MODE_COPY: Record<ComposerVisibleMode, { label: string; desc: string; badge: string }> = {
  agent: { label: "chat.modeAgent", desc: "chat.modeAgentDesc", badge: "chat.modeWriteBadge" },
  plan: { label: "chat.modePlan", desc: "chat.modePlanDesc", badge: "chat.modeReadOnlyBadge" },
  ask: { label: "chat.modeAsk", desc: "chat.modeAskDesc", badge: "chat.modeReadOnlyBadge" },
  debug: { label: "chat.modeDebug", desc: "chat.modeDebugDesc", badge: "chat.modeDebugBadge" }
}

export function getModeItems(t: TranslateFn): ModeItemConfig[] {
  return COMPOSER_VISIBLE_MODES.map((id) => ({
    id,
    label: t(MODE_COPY[id].label),
    desc: t(MODE_COPY[id].desc),
    badge: t(MODE_COPY[id].badge),
    icon: MODE_ICONS[id]
  }))
}

export function ExecutionModeMenu({
  mode,
  onChange,
  align = "end"
}: {
  mode: AgentMode
  onChange: (mode: AgentMode) => void
  align?: "start" | "end"
}) {
  const t = useT()
  const items = getModeItems(t)
  const visible = coerceComposerMode(mode)
  const active = items.find((item) => item.id === visible) ?? items[0]
  const ActiveIcon = active.icon

  useEffect(() => {
    if (visible !== mode) onChange(visible)
  }, [mode, visible, onChange])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.selectMode")}
          className={cx(
            "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-caption-1-semibold transition-all shadow-2xs outline-none cursor-pointer active:scale-[0.97]",
            "border-border-button-default bg-background-secondary-default text-text-primary",
            "hover:bg-background-secondary-hover",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          )}
        >
          <ActiveIcon className="size-3.5 shrink-0 text-foreground-icon-secondary" />
          <span className="whitespace-nowrap">{active.label}</span>
          <RiArrowDownSLine className="size-3 opacity-60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className="w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
      >
        <div className="px-2 pt-1 pb-1.5 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
          {t("chat.modeCoreGroup")}
        </div>
        {items.map((item) => (
          <ModeMenuItem
            key={item.id}
            item={item}
            selected={visible === item.id}
            onPick={() => onChange(item.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModeMenuItem({
  item,
  selected,
  onPick
}: {
  item: ModeItemConfig
  selected: boolean
  onPick: () => void
}) {
  const ItemIcon = item.icon
  return (
    <DropdownMenuItem
      onClick={onPick}
      className={cx(
        "flex items-center justify-between rounded-xl px-2.5 py-2 text-left cursor-pointer transition-colors group",
        selected
          ? "bg-background-secondary-default text-text-primary font-medium"
          : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default mt-0.5">
          <ItemIcon className="size-3.5 text-foreground-icon-secondary" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-caption-1-medium leading-tight text-text-primary">{item.label}</span>
            <span className="rounded bg-background-secondary-default px-1 py-0.2 text-[10px] font-medium text-text-tertiary group-hover:bg-background-primary-default">
              {item.badge}
            </span>
          </div>
          <span className="text-caption-2-regular text-text-tertiary leading-snug mt-0.5">{item.desc}</span>
        </div>
      </div>
      {selected ? <RiCheckLine className="size-4 shrink-0 ml-1.5 text-text-secondary" /> : null}
    </DropdownMenuItem>
  )
}
