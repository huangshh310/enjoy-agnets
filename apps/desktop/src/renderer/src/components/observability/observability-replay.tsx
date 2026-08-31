/**
 * Stream replay：按 sequence 列出本机缓冲事件，不读密钥。
 */
import { useState } from "react"
import {
  RiHistoryLine,
  RiLoader4Line,
  RiRefreshLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { getIde } from "@renderer/lib/ide"

type ReplayRow = {
  type: string
  runId?: string
  sequence?: number
  timestamp?: number
}

export function ObservabilityReplay() {
  const [rows, setRows] = useState<ReplayRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function loadReplay() {
    setIsLoading(true)
    try {
      const result = await getIde().observability.replay({ limit: 200 })
      setRows(result as ReplayRow[])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
        <div className="flex items-center gap-2">
          <RiHistoryLine className="size-4 text-accent-500" />
          <h3 className="text-body-medium font-semibold text-text-primary">
            Stream Event Replay Buffer
          </h3>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => void loadReplay()}
          className="gap-1.5 shadow-xs"
        >
          {isLoading ? (
            <RiLoader4Line className="size-3.5 animate-spin" />
          ) : (
            <RiRefreshLine className="size-3.5" />
          )}
          <span>Load recent buffer</span>
        </Button>
      </div>

      <div className="mt-3.5">
        {rows.length === 0 ? (
          <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/50 p-6 text-center">
            <RiTerminalBoxLine className="size-6 text-text-tertiary" />
            <p className="mt-1.5 text-caption-1-medium text-text-secondary">
              No buffered stream events loaded. Click &quot;Load recent buffer&quot; to inspect main process memory.
            </p>
          </div>
        ) : (
          <ul className="max-h-72 divide-y divide-separator-border/60 overflow-auto rounded-xl border border-border-button-default bg-background-secondary-default">
            {rows.map((row, index) => (
              <li
                key={`${row.runId ?? "run"}-${row.sequence ?? index}`}
                className="flex items-center justify-between px-3.5 py-2 font-mono text-[12px] hover:bg-background-secondary-hover/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-background-tertiary-default px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                    #{row.sequence ?? "—"}
                  </span>
                  <span className="font-semibold text-text-primary">{row.type}</span>
                </div>
                <span className="text-[11px] text-text-tertiary">
                  {row.runId ? `run: ${row.runId.slice(0, 10)}...` : "no run"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

