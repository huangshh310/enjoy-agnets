import assert from "node:assert/strict"
import { test } from "node:test"
import { assertInsideRoot, resolveKnowledgePath } from "./path-safe.ts"

test("工作区内相对路径通过", () => {
  const root = "C:/workspace"
  const resolved = assertInsideRoot(root, "src/index.ts")
  assert.ok(resolved.toLowerCase().includes("index.ts"))
})

test(".. 逃逸被拒绝", () => {
  assert.throws(() => assertInsideRoot("C:/workspace", "../secret.txt"))
})

test("绝对路径被拒绝", () => {
  assert.throws(() => assertInsideRoot("C:/workspace", "C:/Windows/system.ini"))
})

test("resolveKnowledgePath 规范化相对路径并拒绝逃逸", () => {
  const resolved = resolveKnowledgePath("C:/workspace", "docs/readme.md")
  assert.equal(resolved.rel, "docs/readme.md")
  assert.throws(() => resolveKnowledgePath("C:/workspace", "../.ssh/id_rsa"))
})
