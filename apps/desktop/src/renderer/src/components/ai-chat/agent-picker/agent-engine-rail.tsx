/**
 * Picker 顶部分组导轨：本地 = Enjoy Local；本机助手 = CLI 引擎。
 * 组标题可带轻量 CLI 提示，卡片上不写 ACP 协议词。
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { EngineRailTab } from "./engine-rail-tab"

export function AgentEngineRail({
  local,
  cli,
  soon = [],
  selectedId,
  currentId,
  onSelect
}: {
  local: AgentToolPublic[]
  cli: AgentToolPublic[]
  soon?: AgentToolPublic[]
  selectedId: string
  currentId: string
  onSelect: (id: string) => void
}) {
  const t = useT()

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 border-b border-separator-border bg-background-secondary-default/50 px-1 py-1">
      {local.length > 0 ? (
        <RailGroup label={t("chat.railLocal")}>
          {local.map((agent) => (
            <EngineRailTab
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              isCurrent={agent.id === currentId}
              onSelect={() => onSelect(agent.id)}
            />
          ))}
        </RailGroup>
      ) : null}

      {cli.length > 0 || soon.length > 0 ? (
        <RailGroup
          label={t("chat.railCli")}
          cue={t("chat.railCliCue")}
          scroll
          scrollKey={`${cli.length}:${soon.length}`}
        >
          {cli.map((agent) => (
            <EngineRailTab
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              isCurrent={agent.id === currentId}
              onSelect={() => onSelect(agent.id)}
            />
          ))}
          {soon.length > 0 ? (
            <>
              <span className="shrink-0 px-1.5 text-caption-2-medium text-text-tertiary">
                {t("chat.agentSoon")}
              </span>
              {soon.map((agent) => (
                <EngineRailTab
                  key={agent.id}
                  agent={agent}
                  isSelected={agent.id === selectedId}
                  isCurrent={false}
                  onSelect={() => onSelect(agent.id)}
                />
              ))}
            </>
          ) : null}
        </RailGroup>
      ) : null}
    </div>
  )
}

function RailGroup({
  label,
  cue,
  scroll = false,
  scrollKey,
  children
}: {
  label: string
  cue?: string
  scroll?: boolean
  scrollKey?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <div className="flex shrink-0 flex-col px-1.5 leading-tight">
        <span className="whitespace-nowrap text-caption-2-medium text-text-tertiary">{label}</span>
        {cue ? <span className="whitespace-nowrap text-caption-2-medium text-text-tertiary/70">{cue}</span> : null}
      </div>
      {scroll ? (
        <RailScroller token={scrollKey ?? label}>{children}</RailScroller>
      ) : (
        <nav role="tablist" aria-label={label} className="flex min-w-0 flex-1 items-center gap-1 px-1">
          {children}
        </nav>
      )}
    </div>
  )
}

function RailScroller({ token, children }: { token: string; children: ReactNode }) {
  const navRef = useRef<HTMLElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 2)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    }
    checkScroll()
    const handleWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (delta === 0) return
      el.scrollLeft += delta * 0.9
      event.preventDefault()
      event.stopPropagation()
      checkScroll()
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    el.addEventListener("scroll", checkScroll, { passive: true })
    window.addEventListener("resize", checkScroll)
    return () => {
      el.removeEventListener("wheel", handleWheel)
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [token])

  return (
    <div className="relative min-w-0 flex-1">
      {canScrollLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background-secondary-default to-transparent" />
      ) : null}
      <nav
        ref={navRef}
        role="tablist"
        aria-label="本机助手"
        className="flex min-w-0 items-center gap-1 overflow-x-auto scroll-smooth px-1 no-scrollbar"
      >
        {children}
      </nav>
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background-secondary-default to-transparent" />
      ) : null}
    </div>
  )
}
