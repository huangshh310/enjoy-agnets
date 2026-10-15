import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { isSessionHistoryHydrated, markSessionHistoryHydrated, sessionHistoryPending } from "./session-history-pending.ts"

const base = { sessionId: "s1", messageCount: 0, running: false, hydrated: false, timedOut: false }

test("选中会话、历史还没回灌：算加载中，不画空态", () => {
  assert.equal(sessionHistoryPending(base), true)
})

test("回灌完、有消息、在跑、没会话、等超时：都不算加载中", () => {
  assert.equal(sessionHistoryPending({ ...base, hydrated: true }), false)
  assert.equal(sessionHistoryPending({ ...base, messageCount: 2 }), false)
  assert.equal(sessionHistoryPending({ ...base, running: true }), false)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null }), false)
  assert.equal(sessionHistoryPending({ ...base, timedOut: true }), false)
})

test("工作区挑前台会话期间（还没 sessionId）也算加载中；没在挑就照常空态", () => {
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: true }), true)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: false }), false)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: true, timedOut: true }), false)
})

test("打标后即视为已回灌", () => {
  assert.equal(isSessionHistoryHydrated("s-mark"), false)
  markSessionHistoryHydrated("s-mark")
  assert.equal(isSessionHistoryHydrated("s-mark"), true)
})

test("回灌成功与新建会话两个入口都打标；ChatStage 空态吃这个判定", () => {
  const hydrate = readFileSync(new URL("./session-hydrate.ts", import.meta.url), "utf8")
  assert.match(hydrate, /markSessionHistoryHydrated\(input\.sessionId\)/)
  const created = readFileSync(new URL("./create-window-composer.ts", import.meta.url), "utf8")
  assert.match(created, /markSessionHistoryHydrated\(sessionId\)/)
  const stage = readFileSync(new URL("../components/app-shell/chat/chat-stage.tsx", import.meta.url), "utf8")
  assert.match(stage, /useSessionHistoryPending/)
  assert.match(stage, /thread-history-loading/)
  const boot = readFileSync(new URL("./use-agent-session.ts", import.meta.url), "utf8")
  assert.match(boot, /setForegroundSessionPicking\(true\)/)
  assert.match(boot, /setForegroundSessionPicking\(false\)/)
})
