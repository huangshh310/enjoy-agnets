/**
 * 四态纯函数，不碰盘。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { sourceStatus } from "./source-status.ts"

test("scan none 一律 unsupported，即使目录存在", () => {
  assert.equal(
    sourceStatus({ scan: "none", directoryFound: true, sessionCount: 3 }),
    "unsupported"
  )
})

test("目录不存在是 directory-missing", () => {
  assert.equal(
    sourceStatus({ scan: "jsonl", directoryFound: false, sessionCount: 0 }),
    "directory-missing"
  )
})

test("有用量会话是 has-usage", () => {
  assert.equal(
    sourceStatus({ scan: "jsonl", directoryFound: true, sessionCount: 1 }),
    "has-usage"
  )
})

test("目录在但 0 会话是 scanned-empty", () => {
  assert.equal(
    sourceStatus({ scan: "jsonl", directoryFound: true, sessionCount: 0 }),
    "scanned-empty"
  )
})
