/**
 * O1 / O3：act 带 runId；停手先熄再取消执行器，再 abort 那一条 run。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { currentToolRunId, runWithActiveRunId } from "../active-run-id.ts"
import {
  inferPumpingRunId,
  resolveDesktopActRunId,
  runDesktopOverlayStop,
  stopOverlayAbortRunIds
} from "./desktop-overlay-lifecycle.ts"

test("begin 优先显式 runId，其次 ALS，再退回活泵", () => {
  assert.equal(resolveDesktopActRunId("run_explicit", "run_als", "run_pump"), "run_explicit")
  assert.equal(resolveDesktopActRunId(undefined, "run_als", "run_pump"), "run_als")
  assert.equal(resolveDesktopActRunId("  ", undefined, "run_pump"), "run_pump")
  assert.equal(resolveDesktopActRunId(undefined, undefined, undefined), undefined)
})

test("ALS 把当前工具链绑到 runId", async () => {
  assert.equal(currentToolRunId(), undefined)
  await runWithActiveRunId("run_bound", async () => {
    assert.equal(currentToolRunId(), "run_bound")
  })
  assert.equal(currentToolRunId(), undefined)
})

test("已知 controllingRunId 时 stop 只 abort 那一条，不扫全部", () => {
  const runs = [
    { runId: "run_a", pumping: true },
    { runId: "run_b", pumping: true }
  ]
  assert.deepEqual(stopOverlayAbortRunIds("run_b", runs), ["run_b"])
  assert.deepEqual(stopOverlayAbortRunIds(undefined, runs), ["run_a", "run_b"])
  assert.deepEqual(stopOverlayAbortRunIds("  ", [{ runId: "run_idle", pumping: false }]), ["run_idle"])
})

test("没有活泵时 infer 为空，stop 才退回全部 ActiveRun", () => {
  const idle = [{ runId: "run_idle", pumping: false }]
  assert.equal(inferPumpingRunId(idle), undefined)
  assert.deepEqual(stopOverlayAbortRunIds(undefined, idle), ["run_idle"])
  assert.equal(inferPumpingRunId([{ runId: "run_p", pumping: true }]), "run_p")
})

test("stop：先 end overlay，再 executor cancel，再 abort 该 runId", async () => {
  const marks: string[] = []
  await runDesktopOverlayStop({
    controllingRunId: "run_act",
    previewOnly: false,
    runs: [
      { runId: "run_act", pumping: true },
      { runId: "run_other", pumping: true }
    ],
    endOverlay: () => marks.push("end"),
    cancelInFlight: () => marks.push("cancel"),
    abortAgent: async (runId) => {
      marks.push(`abort:${runId}`)
    }
  })
  assert.deepEqual(marks, ["end", "cancel", "abort:run_act"])
})

test("设置预览 stop 只熄铬，不 cancel、不 abort", async () => {
  const marks: string[] = []
  await runDesktopOverlayStop({
    controllingRunId: undefined,
    previewOnly: true,
    runs: [{ runId: "run_act", pumping: true }],
    endOverlay: () => marks.push("end"),
    cancelInFlight: () => marks.push("cancel"),
    abortAgent: async () => {
      marks.push("abort")
    }
  })
  assert.deepEqual(marks, ["end"])
})
