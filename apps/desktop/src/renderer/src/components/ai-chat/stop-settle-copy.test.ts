/**
 * E1 M2 文案与显示层：luna ⑥ 写类工具行标题、验收条只在「可能只做了一半」时说「可能改了文件」、
 * ⑨ held 从停止转来仍说「你停止了上一轮…」（只换句子）、Inbox / 收工判定不被带 settling 的 run.error 抹掉。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { zhChat } from "../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../i18n/catalogs/en/chat.ts"

const human = await import("./thread/thinking/step-tree/tool-human-copy.ts")
const placeholder = await import("./composer/session-review/review-placeholder-kind.ts")
const view = await import("./thread/queue-paused-view.ts")
const attention = await import("../../stores/attention/ingest-attention.ts")
const phase = await import("./review-gate/review-gate-phase.ts")
const turnFrom = await import("./review-gate/turn-from-event.ts")

const tr = (cat: Record<string, unknown>) => (path: string, vars?: Record<string, string | number>) =>
  String(cat[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
const zh = tr(zhChat as never)
const en = tr(enChat as never)

test("⑥ 写类工具行标题：五态中英一一对应设计 §1.3.1", () => {
  const rows: Array<[Parameters<typeof human.stoppedToolTitle>[0], string, string]> = [
    ["stopping", "正在停下…", "Stopping…"],
    ["stuck", "没能停下", "Couldn't stop"],
    ["none_confirmed", "已停止 · 没有写入", "Stopped · nothing written"],
    ["maybe_partial", "已停止 · 可能只做了一半", "Stopped · may be incomplete"],
    ["completed", "已停止", "Stopped"]
  ]
  for (const [v, z, e] of rows) {
    assert.equal(human.stoppedToolTitle(v, true, zh as never), z)
    assert.equal(human.stoppedToolTitle(v, false, en as never), e)
  }
  assert.equal(human.stoppedToolTitle(null, true, zh as never), "已停止", "没有收尾记录的写类工具只说已停止，不说写了")
  assert.equal(human.stoppedToolTitle(null, false, zh as never), null, "非写类、无收尾记录：沿用原标题")
})

test("⑥ 禁用词：停止相关新句子里没有 写了/改了/完成/已写入/已保存 · wrote/changed/done/completed/saved/edited", () => {
  const keys = ["stopStopping", "stopStuck", "stopStuckHint", "stopAgain", "stopStuckHeader", "placeholderStopping", "toolStoppedNothingWritten", "toolStoppedMaybePartial", "toolStopped"]
  for (const key of keys) {
    const z = String((zhChat as Record<string, unknown>)[key])
    const e = String((enChat as Record<string, unknown>)[key])
    assert.doesNotMatch(z, /写了|改了|完成|已写入|已保存/, key)
    assert.doesNotMatch(e, /\b(wrote|changed|done|completed|saved|edited)\b/i, key)
  }
})

test("工具行：stopped 且归收尾管时用状态标题（对象弱化跟后），通用「已停止」徽标不再叠", () => {
  const src = readFileSync(new URL("./thread/thinking/step-tree/tool-step-row.tsx", import.meta.url), "utf8")
  assert.match(src, /node\.status === "stopped" \? stoppedToolTitle\(stopView, node\.kind === "editing", t\) : null/)
  assert.match(src, /node\.status === "stopped" && !stoppedTitle \?/)
})

const write = (id: string) => ({ id, name: "write_file", state: "output-error", result: { code: "user_aborted" }, args: { path: "e2e-stub.txt" } })

test("验收占位：没有写入 → 不说可能改了；可能只做了一半 → 保留「可能改了文件」；做完再停 → 按写类", () => {
  const verdict = (v: string | null) => () => v
  assert.equal(placeholder.reviewPlaceholderKind([write("t1")], false), "maybe", "无回执：现网 D5 口径")
  assert.equal(placeholder.reviewPlaceholderKind([write("t1")], false, verdict("maybe_partial")), "maybe")
  assert.notEqual(placeholder.reviewPlaceholderKind([write("t1")], false, verdict("none_confirmed")), "maybe")
  assert.equal(placeholder.reviewPlaceholderKind([write("t1")], false, verdict("completed")), "files")
})

test("⑨ held 从停止转来：说明行仍说「你停止了上一轮…」；按钮照 held；不传来源时与 #169 原句一致", () => {
  const provider = { kind: "named" as const, name: "P" }
  const base = { reason: "held" as const, count: 2, composerHasContent: false, pendingFailed: null, provider }
  const fromStop = view.queuePausedView({ ...base, t: zh as never, heldFrom: "stopped" })
  assert.equal(fromStop.text, "你停止了上一轮，排队的 2 条先不发。")
  assert.equal(fromStop.shortText, "你停止了上一轮。")
  const plain = view.queuePausedView({ ...base, t: zh as never })
  assert.equal(plain.text, "排队的 2 条先不发。")
  assert.deepEqual([fromStop.showContinue, fromStop.showEditFirst], [plain.showContinue, plain.showEditFirst])
  assert.equal(view.queuePausedView({ ...base, t: en as never, heldFrom: "stopped" }).text, "You stopped the last turn, so 2 queued messages are on hold.")
  assert.equal(view.queuePausedView({ ...base, t: zh as never, heldFrom: "engineSwitched" }).text, "排队的 2 条先不发。", "只换停止来源")
})

test("Inbox：带 settling 的 run.error 不出「出错」；run.stopped stuck 不动；终态只信 turn", () => {
  const settling = { type: "run.error", runId: "r", message: "aborted", code: "user_aborted", settling: { deadlineAt: 1 } }
  assert.equal(attention.attentionKindFromEvent(settling as never), null)
  assert.equal(attention.attentionKindFromEvent({ type: "run.error", runId: "r", message: "boom" } as never), "error", "普通出错照旧")
  assert.equal(attention.attentionKindFromEvent({ type: "run.stopped", runId: "r", sessionId: "s", phase: "stuck", receipt: { write: "maybe_partial", tools: [] } } as never), null)
  assert.equal(
    attention.attentionKindFromEvent({ type: "run.stopped", runId: "r", sessionId: "s", phase: "final", receipt: { write: "maybe_partial", tools: [] }, turn: { workflow: "needs_review", attention: "stopped" } } as never),
    null
  )
})

test("收工判定：run.stopped 终态的 turn 生效；stuck / 无 turn 不动", () => {
  const final = { type: "run.stopped", runId: "r", sessionId: "s", phase: "final", receipt: { write: "maybe_partial", tools: [] }, turn: { workflow: "needs_review", attention: "stopped" } }
  assert.deepEqual(turnFrom.turnFromEvent(final as never), final.turn)
  assert.equal(phase.workflowAfterStreamEvent("run.stopped", { turn: final.turn as never }), "needs_review")
  assert.equal(phase.workflowAfterStreamEvent("run.stopped", {}), null)
  const sync = readFileSync(new URL("./review-gate/sync-review-gate.ts", import.meta.url), "utf8")
  assert.match(sync, /if \(event\.type === "run\.error" && event\.settling\) return/)
})
