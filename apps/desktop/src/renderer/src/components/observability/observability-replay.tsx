/**
 * Stream replay：按 sequence 列出本机缓冲事件，不读密钥。
 */
import { useState } from "react"
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-body-medium text-text-primary">Stream replay</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void getIde()
              .observability.replay({ limit: 200 })
              .then((result) => setRows(result as ReplayRow[]))
          }
        >
          Load replay
        </Button>
      </div>
      <ul className="max-h-72 divide-y divide-separator-border overflow-auto rounded-2xl border border-border-button-default">
        {rows.map((row, index) => (
          <li key={`${row.runId ?? "run"}-${row.sequence ?? index}`} className="px-4 py-2">
            <p className="text-body-medium text-text-primary">
              {row.sequence ?? "—"} · {row.type}
            </p>
            <p className="text-caption-1-medium text-text-tertiary">{row.runId ?? "no run"}</p>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-body-medium text-text-secondary">
            No buffered events yet. Run a chat or generation first.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
