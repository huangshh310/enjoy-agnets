import assert from "node:assert/strict"
import { test } from "node:test"
import { applyDiffViewOptions, splitWordDiff } from "./file-diff-options.ts"
import type { FileDiffModel } from "@enjoy-agents/agent-core/diff"

test("hideWhitespace 丢掉只有空白的增删行", () => {
  const model: FileDiffModel = {
    path: "a.ts",
    additions: 1,
    deletions: 1,
    hunks: [
      {
        header: "@@",
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
