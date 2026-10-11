/**
 * leo MF-A / MF-B：STALE 之后的重试决策与 renderer 重试路径。
 * 探针：库 u1,a1,u2,a2,hb_u,hb_a；对 a2 重新生成 → 绝不能拿 [a2,hb_u,hb_a] 当名单重试（那会删 3 条用户没看见的行）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { TRUNCATE_RUN_ACTIVE, TRUNCATE_STALE_SNAPSHOT } from "@enjoy-agents/ipc-contract/session-truncate"
import {
  buildRetryHistory,
  decideTruncateRetry,
  isBlockedStart,
  startWithTruncateRetry,
  TRUNCATE_TAIL_CHANGED,
  type RetryHistoryEntry
} from "./truncate-retry.ts"

type Msg = RetryHistoryEntry & { id: string }

const m = (id: string, role: "user" | "assistant", content = id): Msg => ({ id, role, content })

test("planner：刷新后尾巴多了后台行，不重试", () => {
  const decision = decideTruncateRetry({
    mode: "after",
    anchorId: "u2",
    expectedTailIds: ["a2"],
    refreshedIds: ["u1", "a1", "u2", "a2", "hb_u", "hb_a"]
  })
  assert.deepEqual(decision, { retry: false, code: TRUNCATE_TAIL_CHANGED })
})

test("planner：尾巴完全相同才重试，且沿用原名单", () => {
  const decision = decideTruncateRetry({
    mode: "after",
    anchorId: "u2",
    expectedTailIds: ["a2"],
    refreshedIds: ["u1", "a1", "u2", "a2"]
  })
  assert.deepEqual(decision, { retry: true, expectedTailIds: ["a2"] })
})

test("planner：尾巴少了 / 换了 / 保留点没了都不重试", () => {
  const base = { mode: "after" as const, anchorId: "u2", expectedTailIds: ["a2", "u3"] }
  assert.equal(decideTruncateRetry({ ...base, refreshedIds: ["u1", "u2", "a2"] }).retry, false)
  assert.equal(decideTruncateRetry({ ...base, refreshedIds: ["u1", "u2", "u3", "a2"] }).retry, false)
  assert.equal(decideTruncateRetry({ ...base, refreshedIds: ["u1", "a2", "u3"] }).retry, false)
})

test("planner：rewind 用 from（含 anchor）", () => {
  assert.deepEqual(
    decideTruncateRetry({
      mode: "from",
      anchorId: "u2",
      expectedTailIds: ["u2", "a2"],
      refreshedIds: ["u1", "a1", "u2", "a2"]
    }),
    { retry: true, expectedTailIds: ["u2", "a2"] }
  )
  assert.equal(
    decideTruncateRetry({
      mode: "from",
      anchorId: "u2",
      expectedTailIds: ["u2", "a2"],
      refreshedIds: ["u1", "a1", "u2", "a2", "hb_u"]
    }).retry,
    false
  )
})

test("MF-B：重试 history 的保留点用原请求内容（编辑后的新问题），不是库里旧内容", () => {
  const history = buildRetryHistory({
    keepId: "u2",
    keepEntry: m("u2", "user", "新问题"),
    refreshed: [m("u1", "user"), m("a1", "assistant"), m("u2", "user", "旧问题"), m("a2", "assistant")]
  })
  assert.deepEqual(history, [m("u1", "user"), m("a1", "assistant"), m("u2", "user", "新问题")])
})

/** 模拟 main：库名单 + agent.run 截断校验，记录每次起跑交来的 history / 名单。 */
function fakeMain(db: Msg[]) {
  const calls: Array<{ history: Msg[]; expectedTailIds: string[] }> = []
  let view: Msg[] = []
  let notices: string[] = []
  let restores = 0
  let reapplied = 0
  const deps = (keepId: string, opts?: { firstCode?: string }) => ({
    start: async (history: Msg[], expectedTailIds: string[]) => {
      calls.push({ history, expectedTailIds })
      if (opts?.firstCode && calls.length === 1) return { ok: false, code: opts.firstCode }
      const index = db.findIndex((row) => row.id === keepId)
      const tail = db.slice(index + 1).map((row) => row.id)
      if (index < 0 || tail.join(",") !== expectedTailIds.join(",")) {
        return { ok: false, code: TRUNCATE_STALE_SNAPSHOT }
      }
      // 截断 + persistUser（取 history 最后一条用户句）。
      const last = history[history.length - 1]!
      db.splice(index, db.length - index, { ...db[index]!, content: last.content })
      return { ok: true, runId: "run_1" }
    },
    blockedCode: (result: unknown) =>
      (result as { ok?: boolean; code?: string }).ok === false ? (result as { code: string }).code : null,
    restoreView: async () => {
      restores += 1
      view = db.map((row) => ({ ...row }))
    },
    readMessages: () => view,
    reapplyOptimistic: () => {
      reapplied += 1
    },
    notice: (code: string) => {
      notices.push(code)
    }
  })
  return {
    calls,
    deps,
    get notices() {
      return notices
    },
    get restores() {
      return restores
    },
    get reapplied() {
      return reapplied
    },
    reset() {
      notices = []
    }
  }
}

test("MF-A 渲染重试路径：库多了心跳行 → 只打一次 agent.run，不删任何行，提示再点一次", async () => {
  const db = [m("u1", "user"), m("a1", "assistant"), m("u2", "user"), m("a2", "assistant"), m("hb_u", "user"), m("hb_a", "assistant")]
  // renderer 看见的是 u1,a1,u2,a2；在它点「重新生成」之前心跳已落库，但第一次名单被 main 判过期的情形：
  const main = fakeMain(db)
  const result = await startWithTruncateRetry(main.deps("u2"), {
    keepId: "u2",
    expectedTailIds: ["a2"],
    history: [m("u1", "user"), m("a1", "assistant"), m("u2", "user")]
  })
  assert.equal(main.calls.length, 1, "不得自动重试")
  assert.deepEqual(result, { ok: false, code: TRUNCATE_TAIL_CHANGED })
  assert.equal(isBlockedStart(result), true)
  assert.deepEqual(main.notices, [TRUNCATE_TAIL_CHANGED])
  assert.equal(main.restores, 1, "撤回乐观截断并刷新视图")
  assert.deepEqual(
    db.map((row) => row.id),
    ["u1", "a1", "u2", "a2", "hb_u", "hb_a"],
    "后台行一条都不能删"
  )
})

test("MF-A 渲染重试路径：刷新后尾巴相同 → 带原名单重试一次", async () => {
  const db = [m("u1", "user"), m("a1", "assistant"), m("u2", "user"), m("a2", "assistant")]
  const main = fakeMain(db)
  const result = await startWithTruncateRetry(main.deps("u2", { firstCode: TRUNCATE_STALE_SNAPSHOT }), {
    keepId: "u2",
    expectedTailIds: ["a2"],
    history: [m("u1", "user"), m("a1", "assistant"), m("u2", "user")]
  })
  assert.equal(main.calls.length, 2)
  assert.deepEqual(main.calls[1]?.expectedTailIds, ["a2"])
  assert.deepEqual(result, { ok: true, runId: "run_1" })
  assert.equal(main.reapplied, 1)
  assert.deepEqual(main.notices, [])
  assert.deepEqual(db.map((row) => row.id), ["u1", "a1", "u2"])
})

test("MF-B 渲染重试路径：编辑重发重试时带新内容，库里也存新内容", async () => {
  const db = [m("u1", "user"), m("a1", "assistant"), m("u2", "user", "旧问题"), m("a2", "assistant")]
  const main = fakeMain(db)
  await startWithTruncateRetry(main.deps("u2", { firstCode: TRUNCATE_STALE_SNAPSHOT }), {
    keepId: "u2",
    expectedTailIds: ["a2"],
    history: [m("u1", "user"), m("a1", "assistant"), m("u2", "user", "新问题")]
  })
  assert.equal(main.calls.length, 2)
  const retryHistory = main.calls[1]!.history
  assert.equal(retryHistory[retryHistory.length - 1]?.content, "新问题", "模型要回答新问题")
  assert.equal(db.find((row) => row.id === "u2")?.content, "新问题", "库里存新内容")
})

test("soft 3：TRUNCATE_RUN_ACTIVE 不重试，但撤回乐观截断并提示", async () => {
  const db = [m("u1", "user"), m("a1", "assistant")]
  const main = fakeMain(db)
  const result = await startWithTruncateRetry(main.deps("u1", { firstCode: TRUNCATE_RUN_ACTIVE }), {
    keepId: "u1",
    expectedTailIds: ["a1"],
    history: [m("u1", "user")]
  })
  assert.equal(main.calls.length, 1)
  assert.deepEqual(result, { ok: false, code: TRUNCATE_RUN_ACTIVE })
  assert.equal(main.restores, 1)
  assert.deepEqual(main.notices, [TRUNCATE_RUN_ACTIVE])
})
