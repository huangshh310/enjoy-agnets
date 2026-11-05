import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyDiffViewOptions,
  LARGE_FILE_LINES,
  splitWordDiff,
  wouldFoldLargeFile
} from "./file-diff-options.ts"
import type { FileDiffModel } from "@enjoy-agents/agent-core/diff"

test("hideWhitespace 丢掉只有空白的增删行", () => {
  const model: FileDiffModel = {
    path: "a.ts",
    additions: 1,
    deletions: 1,
    hunks: [
      {
        header: "@@",
        oldStart: 1,
        newStart: 1,
        lines: [
          { kind: "del", text: "   ", oldNo: 1 },
          { kind: "add", text: "hello", newNo: 1 },
          { kind: "context", text: "keep", oldNo: 2, newNo: 2 }
        ]
      }
    ]
  }
  const next = applyDiffViewOptions(model, { hideWhitespace: true })
  assert.equal(next.hunks[0]?.lines.length, 2)
  assert.equal(next.hunks[0]?.lines[0]?.kind, "add")
})

test("splitWordDiff 抽出公共前后缀", () => {
  const parts = splitWordDiff("fooBar", "fooQux")
  assert.equal(parts.prefix, "foo")
  assert.equal(parts.removed, "Bar")
  assert.equal(parts.added, "Qux")
  assert.equal(parts.suffix, "")
})

test("wouldFoldLargeFile 对齐 LARGE_FILE_LINES=400", () => {
  assert.equal(LARGE_FILE_LINES, 400)
  const lines = Array.from({ length: 401 }, (_, i) => ({
    kind: "add" as const,
    text: `line-${i}`,
    newNo: i + 1
  }))
  const model: FileDiffModel = {
    path: "huge.ts",
    additions: 401,
    deletions: 0,
    hunks: [
      { header: "@@ -0,0 +1,401 @@", oldStart: 0, newStart: 1, lines },
      { header: "@@ -0,0 +402,1 @@", oldStart: 0, newStart: 402, lines: [{ kind: "add", text: "tail", newNo: 402 }] }
    ]
  }
  assert.equal(wouldFoldLargeFile(model, true), true)
  assert.equal(wouldFoldLargeFile(model, false), false)
  const folded = applyDiffViewOptions(model, { foldLargeFiles: true })
  assert.equal(folded.hunks.length, 1)
})
