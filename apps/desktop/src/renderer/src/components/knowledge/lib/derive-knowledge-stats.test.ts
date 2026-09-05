import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifySourceFault,
  deriveKnowledgeStats,
  isMissingPathError,
  knowledgeActionErrorKey
} from "./derive-knowledge-stats.ts"

test("17 文件 0 块时 askableChunks 为 0，扫描数不冒充完成态", () => {
  const stats = deriveKnowledgeStats(
    [{ id: "s1", path: "docs", status: "idle", chunkCount: 0 }],
    Array.from({ length: 17 }, (_, i) => ({ chunkCount: 0, path: `f${i}` }))
  )
  assert.equal(stats.askableChunks, 0)
  assert.equal(stats.scannedFiles, 17)
  assert.equal(stats.askableFiles, 0)
})

test("错误源的块数不计入可问块", () => {
  const stats = deriveKnowledgeStats(
    [
      { id: "ok", path: "src", status: "ready", chunkCount: 8 },
      { id: "bad", path: "gone", status: "error", error: "fail", chunkCount: 99 }
    ],
    [{ chunkCount: 8 }, { chunkCount: 0 }]
  )
  assert.equal(stats.askableChunks, 8)
  assert.equal(stats.readySourceCount, 1)
  assert.equal(stats.unavailable.length, 1)
})

test("ENOENT 分类为 missing，动作错误走 pathNotFound 短句键", () => {
  assert.equal(isMissingPathError("ENOENT: no such file or directory"), true)
  assert.equal(classifySourceFault({ id: "1", path: "x", status: "error", error: "ENOENT" }), "missing")
  assert.equal(classifySourceFault({ id: "2", path: "y", status: "error", error: "embed timeout" }), "error")
  assert.equal(
    knowledgeActionErrorKey(new Error("ENOENT: no such file or directory, scandir")),
    "pathNotFound"
  )
  assert.equal(knowledgeActionErrorKey(new Error("embed failed")), "statusError")
})
