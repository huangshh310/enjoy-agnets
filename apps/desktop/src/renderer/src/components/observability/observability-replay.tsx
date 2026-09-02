/**
 * Stream Event Replay Buffer 事件回放组件：
 * 按 sequence 列出主进程内存缓冲事件，支持初始自动载入与事件类型过滤。
 */
import { useEffect, useMemo, useState } from "react"
import {
  RiHistoryLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

type ReplayRow = {
  type: string
  runId?: string
  sequence?: number
  timestamp?: number
}

export function ObservabilityReplay() {
  const t = useT()
  const [rows, setRows] = useState<ReplayRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState("")

  async function loadReplay() {
    if (!hasIde()) return
    setIsLoading(true)
    try {
      const result = await getIde().observability.replay({ limit: 200 })
      setRows(result as ReplayRow[])
    } finally {
      setIsLoading(false)
    }
  }

  // 组件首次挂载时自动拉取
  useEffect(() => {
    void loadReplay()
  }, [])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) => r.type.toLowerCase().includes(q) || (r.runId && r.runId.toLowerCase().includes(q))
    )
  }, [rows, search])

  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiHistoryLine className="size-4 text-accent-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.replayTitle", { n: filteredRows.length })}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <RiSearchLine className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("pages.observability.filterEventType")}
              className="pl-6.5 h-6.5 text-[10.5px] bg-background-secondary-default/50 font-mono"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => void loadReplay()}
            className="gap-1.5 h-7 text-caption-2-medium shrink-0"
          >
            {isLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiRefreshLine className="size-3" />
            )}
            <span>{t("pages.observability.refreshEvents")}</span>
          </Button>
        </div>
      </div>

      <div className="mt-1">
        {filteredRows.length === 0 ? (
          <div className="flex min-h-[5.5rem] flex-col items-center justify-center rounded-lg border border-dashed border-separator-border/60 bg-background-secondary-default/20 p-4 text-center">
            <RiTerminalBoxLine className="size-5 text-text-tertiary mb-1" />
            <p className="text-[11px] text-text-tertiary">
              {rows.length === 0
                ? t("pages.observability.noBufferedEvents")
                : t("pages.observability.noMatchingEvents")}
            </p>
          </div>
        ) : (
          <ul className="max-h-72 divide-y divide-separator-border/40 overflow-auto rounded-lg border border-separator-border/60 bg-background-secondary-default/40 font-mono text-[11px]">
            {filteredRows.map((row, index) => (
              <li
                key={`${row.runId ?? "run"}-${row.sequence ?? index}`}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-background-secondary-hover/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-background-secondary-default px-1.5 py-0.2 text-[10px] font-semibold text-text-secondary">
                    #{row.sequence ?? "—"}
                  </span>
                  <span className="font-semibold text-text-primary">{row.type}</span>
                </div>
                <span className="text-[10px] text-text-tertiary">
                  {row.runId
                    ? t("pages.observability.runId", { id: row.runId.slice(0, 14) })
                    : t("pages.observability.noRun")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
