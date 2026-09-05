import assert from "node:assert/strict"
import { test } from "node:test"
import { filterKnowledgeHits, resolveEnabledSourceIds } from "./filter-knowledge-hits.ts"

const hits = [
  { sourceId: "a", path: "src/main.ts", snippet: "a" },
  { sourceId: "b", path: "design/ui.md", snippet: "b" }
]

test("未启用的透镜命中被丢掉", () => {
  const list = filterKnowledgeHits(hits, { enabledSourceIds: ["a"] })
  assert.equal(list.length, 1)
  assert.equal(list[0]?.sourceId, "a")
})

test("全部透镜关闭时命中为空", () => {
  assert.equal(filterKnowledgeHits(hits, { enabledSourceIds: [] }).length, 0)
})

test("selectedPath 按路径前缀再收窄", () => {
  const list = filterKnowledgeHits(hits, {
    enabledSourceIds: ["a", "b"],
    selectedPath: "design"
  })
  assert.equal(list.length, 1)
  assert.equal(list[0]?.path, "design/ui.md")
})

test("点选单源时只启用该透镜，忽略关闭开关", () => {
  const ids = resolveEnabledSourceIds(
    [
      { id: "a", path: "src", enabled: false },
      { id: "b", path: "design", enabled: true }
    ],
    "src"
  )
  assert.deepEqual(ids, ["a"])
})
