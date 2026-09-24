/**
 * 聊天输入框推理模式/思考强度切换组件 (Reasoning Effort Selector)：
 * 1. 触发按钮带多色能量指示计 (Mini Energy Meter) 与微光状态
 * 2. 弹层内嵌入交互式思考能量条 (Reasoning Energy Bar)，支持直接拖拽/点选档位
 * 3. 5 档深度与渐变色彩实时联动
 */
import { useState } from "react"
import { RiBrainLine, RiCheckLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { blockDismissWhileEnergyDrag } from "./reasoning-energy-drag"
import {
  getEffortLevels,
  getEffortMeta
} from "./reasoning-effort-config"
import { MiniEnergyMeter, ReasoningEnergyBar } from "./reasoning-energy-bar"

export function ReasoningEffortToggle({ compact = false }: { compact?: boolean } = {}) {
  const reasoningEffort = useChatStore((state) => state.reasoningEffort)
  const setReasoningEffort = useChatStore((state) => state.setReasoningEffort)
  const t = useT()
  const [open, setOpen] = useState(false)
  const currentMeta = getEffortMeta(reasoningEffort, t)
  const levels = getEffortLevels(t)

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (!next && document.documentElement.dataset.energyDrag === "1") return
        setOpen(next)
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="composer-thinking-effort"
          aria-label={t("chat.effortAria")}
          className={cx(
            "group flex shrink-0 items-center whitespace-nowrap rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            compact
              ? "h-6 gap-1 px-2 text-caption-2-medium ring-1 ring-border-button-default/80"
              : "h-8 gap-1.5 px-2.5 text-caption-1-medium shadow-2xs",
            currentMeta.value !== "none"
              ? currentMeta.badgeClass
              : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          )}
        >
          <RiBrainLine className={cx("size-3 shrink-0 transition-colors", currentMeta.iconColorClass)} />
          <span className="whitespace-nowrap font-semibold">{currentMeta.label}</span>
          {compact ? null : (
            <span className="ml-0.5 inline-flex">
              <MiniEnergyMeter value={reasoningEffort} />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-card overflow-hidden"
        onPointerDownOutside={blockDismissWhileEnergyDrag}
        onInteractOutside={blockDismissWhileEnergyDrag}
        onFocusOutside={blockDismissWhileEnergyDrag}
      >
        {/* 顶部标题与当前能量档位徽标 */}
        <div className="flex items-center justify-between px-1 pt-0.5 pb-2">
          <div className="flex items-center gap-1.5">
            <RiBrainLine className={cx("size-4", currentMeta.iconColorClass)} />
            <span className="text-[12px] font-semibold text-text-primary">
              {t("chat.effortEnergy")}
            </span>
          </div>
          <span
            className={cx(
              "rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors",
              currentMeta.badgeClass
            )}
          >
            {t("chat.effortLevel", { index: currentMeta.index, label: currentMeta.label })}
          </span>
        </div>

        {/* 交互式能量条 (可直接拖拽或点击) */}
        <div className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/40 p-2.5 mb-1.5 flex flex-col gap-1.5">
          <ReasoningEnergyBar
            value={reasoningEffort}
            onChange={setReasoningEffort}
            size="sm"
            showLabels={false}
          />
          <div className="flex items-center justify-between px-0.5 text-[10px] text-text-tertiary">
            <span>{t("chat.effortFast")}</span>
            <span>{t("chat.effortBalanced")}</span>
            <span>{t("chat.effortDeep")}</span>
          </div>
        </div>

        <DropdownMenuSeparator className="-mx-2.5 my-1.5 bg-separator-border" />

        {/* 档位列表 */}
        <div className="space-y-0.5">
          {levels.map((opt) => {
            const isSelected = currentMeta.value === opt.value

            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setReasoningEffort(opt.effortValue)}
                className={cx(
                  "flex items-center justify-between rounded-xl px-2.5 py-1.5 cursor-pointer text-left transition-colors",
                  isSelected
                    ? cx(opt.activeBgClass, "shadow-2xs")
                    : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cx(
                      "size-2 rounded-full shrink-0 transition-all",
                      isSelected ? opt.barGradient : "bg-border-button-default"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-medium leading-tight text-text-primary">
                      {opt.label} ({opt.shortLabel})
                    </span>
                    <span className="text-[10px] text-text-tertiary truncate mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </div>
                {isSelected ? (
                  <RiCheckLine className={cx("size-4 shrink-0", opt.iconColorClass)} />
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
