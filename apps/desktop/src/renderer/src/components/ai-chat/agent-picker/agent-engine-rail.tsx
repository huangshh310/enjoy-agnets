/**
 * Composer 顶部引擎快速切换导轨 (Top Engine Rail)
 * 1. 现代化分段胶囊质感（Segmented Pill Tabs），去除杂乱多余小点
 * 2. 鼠标滚轮垂直 deltaY 自动转为水平滚动，支持平滑滑移
 * 3. 自动将选中引擎滚动至可视区域中央
 * 4. 左右两端自适应渐变边缘指示
 */
import { useEffect, useRef, useState } from "react"
import { composerChromeFor, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "./agent-brand-icon"

export function AgentEngineRail({
  primary,
  selectedId,
  currentId,
  onSelect
}: {
  primary: AgentToolPublic[]
  selectedId: string
  currentId: string
  onSelect: (id: string) => void
}) {
  const navRef = useRef<HTMLElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 检查滚动溢出状态
  const checkScroll = () => {
    const el = navRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  // 1. 鼠标滚轮（无论水平滚轮还是垂直滚轮）转换为横向滚动
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    checkScroll()

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      // 触控板或横向滚轮使用 deltaX，标准鼠标垂直滚轮使用 deltaY
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (delta === 0) return
      el.scrollLeft += delta * 0.9
      e.preventDefault()
      e.stopPropagation()
      checkScroll()
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    const handleScroll = () => checkScroll()
    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", checkScroll)

    return () => {
      el.removeEventListener("wheel", handleWheel)
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [primary])

  return (
    <div className="relative flex w-full shrink-0 items-center border-b border-separator-border bg-background-secondary-default/50 px-1 py-1">
      {/* 左侧溢出渐变遮罩 */}
      {canScrollLeft ? (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-background-secondary-default to-transparent" />
      ) : null}

      {/* 滚动容器 */}
      <nav
        ref={navRef}
        role="tablist"
        aria-label="选择智能体引擎"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-1"
      >
        {primary
          .filter((agent) => composerChromeFor(agent.id).showOnEngineRail)
          .map((agent) => (
            <EngineTabItem
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              isCurrent={agent.id === currentId}
              onSelect={() => onSelect(agent.id)}
            />
          ))}
      </nav>

      {/* 右侧溢出渐变遮罩 */}
      {canScrollRight ? (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-background-secondary-default to-transparent" />
      ) : null}
    </div>
  )
}

function EngineTabItem({
  agent,
  isSelected,
  isCurrent,
  onSelect
}: {
  agent: AgentToolPublic
  isSelected: boolean
  isCurrent: boolean
  onSelect: () => void
}) {
  const t = useT()
  const itemRef = useRef<HTMLButtonElement>(null)
  const isReady = agent.status === "ready" || agent.id === DEFAULT_RUNTIME_ID
  const pathKind = composerChromeFor(agent.id).pathKind
  const pathLabel = pathKind === "enjoy-local" ? t("chat.usage.localToolLoop") : t("chat.usage.acpSubscribe")

  // 选中项平滑滚动至视野内
  useEffect(() => {
    if (isSelected) {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [isSelected])

  return (
    <button
      ref={itemRef}
      type="button"
      role="tab"
      aria-selected={isSelected}
      title={`${agent.label} (${isReady ? "已就绪" : "待装载"})`}
      onClick={onSelect}
      className={`group relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-caption-1-medium transition-all duration-150 outline-none select-none ${
        isSelected
          ? "bg-background-primary-default font-semibold text-text-primary shadow-xs ring-1 ring-border-button-default"
          : "text-text-secondary hover:bg-background-primary-default/60 hover:text-text-primary"
      }`}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <AgentBrandIcon id={agent.id} size={14} />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="whitespace-nowrap">{agent.label}</span>
        <span className="whitespace-nowrap text-caption-2-medium text-text-tertiary">{pathLabel}</span>
      </span>

      {/* 仅在当前活跃主引擎时显示一个微光小徽标 */}
      {isCurrent ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-accent-500 shadow-2xs"
          title="当前主引擎"
        />
      ) : null}
    </button>
  )
}
