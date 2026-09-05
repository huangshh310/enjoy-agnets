import assert from "node:assert/strict"
import { test } from "node:test"
import { filterKnowledgeDocuments, filterKnowledgeSources } from "./knowledge-document-filters.ts"

const docs = [
  {
    id: "1",
    sourceId: "ks1",
    sourcePath: "design",
    path: "design/specs/ui.md",
    chunkCount: 2,
    status: "ready",
    updatedAt: 2
  },
  {
    id: "2",
    sourceId: "ks2",
    sourcePath: "src",
    path: "src/main.ts",
    chunkCount: 1,
    status: "ready",
    updatedAt: 1
  }
]

const sources = [
  { id: "ks1", path: "design", chunkCount: 2, documentCount: 1, updatedAt: 2 },
  { id: "ks2", path: "src", chunkCount: 1, documentCount: 1, updatedAt: 1 }
]

test("选中 design 时只留下该来源的文档", () => {
  const list = filterKnowledgeDocuments(docs, { selectedPath: "design" })
  assert.equal(list.length, 1)
  assert.equal(list[0]?.path, "design/specs/ui.md")
})

test("View Files 按 sourcePath 过滤，不丢相对路径文档", () => {
  const list = filterKnowledgeDocuments(docs, { selectedPath: "design" })
  assert.ok(list.every((d) => d.sourcePath === "design" || d.path.startsWith("design/")))
})

test("来源过滤同样按 selectedPath", () => {
  const list = filterKnowledgeSources(sources, { selectedPath: "design" })
  assert.equal(list.length, 1)
  assert.equal(list[0]?.path, "design")
})

test("可问 chip 不含未分块文档", () => {
  const mixed = [
    ...docs,
    {
      id: "3",
      sourceId: "ks1",
      sourcePath: "design",
      path: "design/notes.txt",
      chunkCount: 0,
      status: "unindexed",
      updatedAt: 0
    }
  ]
  const list = filterKnowledgeDocuments(mixed, { statusFilter: "askable" })
  assert.equal(list.length, 2)
  assert.ok(list.every((d) => d.chunkCount > 0))
})
