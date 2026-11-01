/**
 * 助手轮可见工具表面：File Diff / Tool Result。
 * 多文件 Diff 自动聚合为横向可切换标签栏；每文件「留下 / 丢掉」（#117）。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { RiArrowLeftSLine, RiArrowRightSLine, RiCodeSSlashLine } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { asRecord, readString } from "../../../../lib/record.ts"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ToolResultView } from "../../diff/tool-result"
import { FileDiffActions } from "../../diff/file-diff-actions"
import { canDecideFileDiff, type FileDiffDecision } from "../../diff/file-diff-decision"
import { DesktopActFailedCard } from "../desktop-act-failed-card"
import { desktopActFailedSurfaces, hasTurnToolSurfaces, toolResultSurfaces } from "./select-turn-tool-surfaces"

export function TurnToolSurfaces({ tools }: { tools: ThreadToolCall[] }) {
  if (!hasTurnToolSurfaces(tools)) return null
  const diffTools = toolResultSurfaces(tools)
  const failedActs = desktopActFailedSurfaces(tools)
  if (diffTools.length === 0 && failedActs.length === 0) return null

  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {failedActs.map((tool) => (
        <DesktopActFailedCard key={tool.id} tool={tool} />
      ))}
      {diffTools.length > 0 ? <MultiFileDiffTabs tools={diffTools} /> : null}
    </div>
  )
}

/** 多文件差异标签切换查看器 */
function MultiFileDiffTabs({ tools }: { tools: ThreadToolCall[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((s) => s.workspaceId)
  const running = useChatStore((s) => s.running)
  const [selectedId, setSelectedId] = useState<string>(() => tools[0]?.id || "")
  const [decisions, setDecisions] = useState<Record<string, FileDiffDecision>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const activeTool = tools.find((tool) => tool.id === selectedId) || tools[0]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    updateScrollState()
    window.addEventListener("resize", updateScrollState)
    return () => window.removeEventListener("resize", updateScrollState)
  }, [updateScrollState, tools])

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.deltaY === 0) return
    el.scrollLeft += e.deltaY
    updateScrollState()
  }

  function scrollByStep(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" })
    setTimeout(updateScrollState, 200)
  }

  function pathOf(tool: ThreadToolCall): string {
    const res = asRecord(tool.result)
    return readString(res, "path") || tool.name
  }

  async function discardTool(tool: ThreadToolCall) {
    const path = pathOf(tool)
    if (!workspaceId || !path) {
      setDecisions((prev) => ({ ...prev, [tool.id]: "discarded" }))
      return
    }
    setBusyId(tool.id)
    try {
      await getIde().workspace.gitRestore({ workspaceId, paths: [path] })
      setDecisions((prev) => ({ ...prev, [tool.id]: "discarded" }))
      await queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      useChatStore.getState().setError(raw)
    } finally {
      setBusyId(null)
    }
  }

  function keepTool(tool: ThreadToolCall) {
    setDecisions((prev) => ({ ...prev, [tool.id]: "kept" }))
  }

  const visibleTools = tools.filter((tool) => decisions[tool.id] !== "discarded")
  const headerCount = visibleTools.length

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/60 px-2 py-1.5">
        <span className="text-caption-2-medium text-text-secondary">
          {headerCount === 1
            ? t("chat.editedFilesCountOne")
            : t("chat.editedFilesCount", { count: headerCount })}
        </span>
      </div>

      {tools.length > 1 ? (
        <div className="flex items-center border-b border-separator-border/70 bg-background-secondary-default/40 p-1 select-none">
          {canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByStep(-180)}
              aria-label="Scroll left"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
            >
              <RiArrowLeftSLine className="size-4" />
            </button>
          ) : null}
          <div
            ref={scrollRef}
            onWheel={handleWheel}
            onScroll={updateScrollState}
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-0.5 scrollbar-thin"
          >
            {tools.map((tool) => {
              const decision = decisions[tool.id] ?? "pending"
              if (decision === "discarded") {
                return (
                  <div
                    key={tool.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-caption-2-regular text-text-tertiary"
                  >
                    <FileDiffActions decision="discarded" onKeep={() => {}} onDiscard={() => {}} />
                  </div>
                )
              }
              const path = pathOf(tool)
              const fileName = path.split(/[\\/]/).pop() || path
              const res = asRecord(tool.result)
              const additions = typeof res.additions === "number" ? res.additions : undefined
              const deletions = typeof res.deletions === "number" ? res.deletions : undefined
              const isSelected = tool.id === (activeTool?.id ?? "")
              const decidable = canDecideFileDiff({ streaming: running, toolState: tool.state })

              return (
                <div
                  key={tool.id}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-caption-2-regular",
                    isSelected
                      ? "border border-separator-border/80 bg-background-primary-default font-semibold text-text-primary shadow-2xs"
                      : "text-text-tertiary hover:bg-background-secondary-hover/60 hover:text-text-primary"
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      setSelectedId(tool.id)
                      e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
                    }}
                    className="flex cursor-pointer items-center gap-1.5"
                  >
                    <RiCodeSSlashLine className="size-3 text-accent-500" />
                    <span className="max-w-[140px] truncate">{fileName}</span>
                    {additions != null ? (
                      <span className="text-caption-2-regular text-state-success-text">+{additions}</span>
                    ) : null}
                    {deletions != null ? (
                      <span className="text-caption-2-regular text-text-error-primary">-{deletions}</span>
                    ) : null}
                  </button>
                  <FileDiffActions
                    decision={decision}
                    disabled={!decidable}
                    busy={busyId === tool.id}
                    onKeep={() => keepTool(tool)}
                    onDiscard={() => void discardTool(tool)}
                  />
                </div>
              )
            })}
          </div>
          {canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByStep(180)}
              aria-label="Scroll right"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
            >
              <RiArrowRightSLine className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {activeTool && (decisions[activeTool.id] ?? "pending") !== "discarded" ? (
        <div className="relative">
          {tools.length <= 1 ? (
            <div className="flex items-center justify-end gap-2 border-b border-separator-border/60 px-2 py-1.5">
              <FileDiffActions
                decision={decisions[activeTool.id] ?? "pending"}
                disabled={!canDecideFileDiff({ streaming: running, toolState: activeTool.state })}
                busy={busyId === activeTool.id}
                onKeep={() => keepTool(activeTool)}
                onDiscard={() => void discardTool(activeTool)}
              />
            </div>
          ) : null}
          {(decisions[activeTool.id] ?? "pending") === "kept" ? (
            <div className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("chat.diffFileKept")}</div>
          ) : (
            <ToolResultView tool={activeTool} embedded={tools.length > 1} />
          )}
        </div>
      ) : null}
    </div>
  )
}
