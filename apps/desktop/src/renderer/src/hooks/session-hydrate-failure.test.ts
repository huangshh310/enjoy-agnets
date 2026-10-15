import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const { useChatStore } = await import("../stores/chat-store.ts")
const pending = await import("./session-history-pending.ts")
const { bumpSessionHydrateGeneration } = await import("./session-hydrate-generation.ts")
const { settleFailedSessionHydrate } = await import("./session-hydrate-failure.ts")

test("拉历史失败：返回同一个 error 对象（loadSession 原样抛出），并打标退回空态", () => {
  useChatStore.setState({ sessionId: "ses_fail" })
  const generation = bumpSessionHydrateGeneration()
  const boom = new Error("messages failed")
  assert.equal(settleFailedSessionHydrate(boom, { sessionId: "ses_fail", generation }), boom)
  assert.equal(pending.isSessionHistoryHydrated("ses_fail"), true)
  const plain = { code: "E_NOT_ERROR" }
  assert.equal(settleFailedSessionHydrate(plain, { sessionId: "ses_fail", generation }), plain)
})

test("A→B→A 竞态：第一次 A 的迟到失败（世代已过期）不提前结束第二次 A 的加载中", () => {
  useChatStore.setState({ sessionId: "ses_race_a" })
  const firstA = bumpSessionHydrateGeneration()
  bumpSessionHydrateGeneration() // 切到 B
  const secondA = bumpSessionHydrateGeneration() // 又切回 A，前台仍是 A
  settleFailedSessionHydrate(new Error("late"), { sessionId: "ses_race_a", generation: firstA })
  assert.equal(pending.isSessionHistoryHydrated("ses_race_a"), false)
  settleFailedSessionHydrate(new Error("now"), { sessionId: "ses_race_a", generation: secondA })
  assert.equal(pending.isSessionHistoryHydrated("ses_race_a"), true)
})

test("调用方判过期、或前台已换成别的会话：不打标", () => {
  useChatStore.setState({ sessionId: "ses_front" })
  let generation = bumpSessionHydrateGeneration()
  settleFailedSessionHydrate(new Error("x"), { sessionId: "ses_front", generation, stale: () => true })
  assert.equal(pending.isSessionHistoryHydrated("ses_front"), false)
  generation = bumpSessionHydrateGeneration()
  settleFailedSessionHydrate(new Error("x"), { sessionId: "ses_gone", generation })
  assert.equal(pending.isSessionHistoryHydrated("ses_gone"), false)
})

// 接线守护：session-lifecycle.ts 依赖 .tsx（engine-handoff-store → agent-brand-icon），node:test 加载不了，
// 只能读源码断言 loadSession 的 catch 把原始 error 交给 settleFailedSessionHydrate 再原样抛出。
test("接线：loadSession 拉历史失败时 throw settleFailedSessionHydrate(error, …)", () => {
  const src = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  const body = src.slice(src.indexOf("export async function loadSession"), src.indexOf("export async function createAndOpenSession"))
  assert.match(
    body,
    /try \{\s*rows = \(await getIde\(\)\.session\.messages\(\{ sessionId \}\)\) as MessageRow\[\]\s*\} catch \(error\) \{[^}]*throw settleFailedSessionHydrate\(error, \{ sessionId, generation, stale \}\)\s*\}/
  )
})
