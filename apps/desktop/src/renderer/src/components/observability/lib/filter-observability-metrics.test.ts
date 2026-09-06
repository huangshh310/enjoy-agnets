import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { filterObservabilityMetrics } from "./filter-observability-metrics.ts"

function metric(
  partial: Pick<TelemetryMetric, "id" | "status" | "kind"> & Partial<TelemetryMetric>
): TelemetryMetric {
  return {
    createdAt: 0,
    runId: partial.runId ?? partial.id,
    ...partial
  }
}

describe("filterObservabilityMetrics", () => {
  const rows = [
    metric({ id: "1", status: "ok", kind: "agent", modelId: "gpt-4o", runId: "run-a" }),
    metric({ id: "2", status: "running", kind: "stream", modelId: "claude", runId: "run-b" }),
    metric({ id: "3", status: "failed", kind: "image", modelId: "flux", runId: "run-c", errorClass: "timeout" })
  ]

  it("keeps all when filters are open", () => {
    const next = filterObservabilityMetrics(rows, {
      statusFilter: "all",
      kindFilter: "all",
      search: "",
      exactModelId: null
    })
    assert.equal(next.length, 3)
  })

  it("filters failed without treating running as failed", () => {
    const next = filterObservabilityMetrics(rows, {
      statusFilter: "failed",
      kindFilter: "all",
      search: "",
      exactModelId: null
    })
    assert.deepEqual(next.map((row) => row.id), ["3"])
  })

  it("matches exact model id instead of substring", () => {
    const next = filterObservabilityMetrics(rows, {
      statusFilter: "all",
      kindFilter: "all",
      search: "gpt",
      exactModelId: "claude"
    })
    assert.deepEqual(next.map((row) => row.id), ["2"])
  })
})
