/**
 * 会话允许水位：缺水位 / 读不到库 / 消息没了 / 条数变少 → 失败关闭。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  advanceSessionAllowWatermark,
  hashSessionMessageIds,
  peekSessionAllowWatermark,
  resetAllSessionAllowWatermarks,
  sessionAllowHistoryLooksTruncated,
  setSessionHistoryReaderForTest,
  stampSessionAllowWatermark
} from "./conversation-session-allow-history.ts"

test.afterEach(() => {
  resetAllSessionAllowWatermarks()
  setSessionHistoryReaderForTest()
})

test("无水位或读不到库视为截断", () => {
  setSessionHistoryReaderForTest(() => ({ ids: ["m1"] }))
  assert.equal(sessionAllowHistoryLooksTruncated("ses_none"), true)
  stampSessionAllowWatermark("ses_none")
  setSessionHistoryReaderForTest(() => undefined)
  assert.equal(sessionAllowHistoryLooksTruncated("ses_none"), true)
})

test("水位前缀对不上或条数变少才算截断，变长不算", () => {
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1"] }))
  stampSessionAllowWatermark("ses_wm")
  assert.deepEqual(peekSessionAllowWatermark("ses_wm"), {
    idHash: hashSessionMessageIds(["u1", "a1"]),
    messageCount: 2
  })
  setSessionHistoryReaderForTest(() => ({ ids: ["u1"] }))
  assert.equal(sessionAllowHistoryLooksTruncated("ses_wm"), true)
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1", "u2"] }))
  assert.equal(sessionAllowHistoryLooksTruncated("ses_wm"), false)
})

test("同长度但 id 序列变了算截断", () => {
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1"] }))
  stampSessionAllowWatermark("ses_hash")
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "aX"] }))
  assert.equal(sessionAllowHistoryLooksTruncated("ses_hash"), true)
})

test("入参条数少于库条数算截断", () => {
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1"] }))
  stampSessionAllowWatermark("ses_in")
  assert.equal(sessionAllowHistoryLooksTruncated("ses_in", 1), true)
  assert.equal(sessionAllowHistoryLooksTruncated("ses_in", 2), false)
})

test("后续历史变长且旧水位前缀仍对才前推", () => {
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1"] }))
  stampSessionAllowWatermark("ses_fwd")
  setSessionHistoryReaderForTest(() => ({ ids: ["u1", "a1", "u2", "a2"] }))
  advanceSessionAllowWatermark("ses_fwd")
  assert.deepEqual(peekSessionAllowWatermark("ses_fwd"), {
    idHash: hashSessionMessageIds(["u1", "a1", "u2", "a2"]),
    messageCount: 4
  })
  setSessionHistoryReaderForTest(() => ({ ids: ["u1"] }))
  advanceSessionAllowWatermark("ses_fwd")
  assert.deepEqual(peekSessionAllowWatermark("ses_fwd"), {
    idHash: hashSessionMessageIds(["u1", "a1", "u2", "a2"]),
    messageCount: 4
  })
})
