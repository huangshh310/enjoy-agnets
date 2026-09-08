import assert from "node:assert/strict"
import { test } from "node:test"
import { assertAbsInsideRoots, assertInsideRoot, resolveKnowledgePath } from "./path-safe.ts"

test("工作区内相对路径通过", () => {
  const root = "C:/workspace"
  const resolved = assertInsideRoot(root, "src/index.ts")
  assert.ok(resolved.toLowerCase().includes("index.ts"))
})

test(".. 逃逸被拒绝", () => {
  assert.throws(() => assertInsideRoot("C:/workspace", "../secret.txt"))
})

test("绝对路径被拒绝", () => {
  // POSIX 上 `C:/...` 不是 isAbsolute，会被当成相对路径拼进 root。
  if (process.platform !== "win32") {
    assert.throws(() => assertInsideRoot("/workspace", "/etc/passwd"))
    return
  }
  assert.throws(() => assertInsideRoot("C:/workspace", "C:/Windows/system.ini"))
})

test("resolveKnowledgePath 规范化相对路径并拒绝逃逸", () => {
  const resolved = resolveKnowledgePath("C:/workspace", "docs/readme.md")
  assert.equal(resolved.rel, "docs/readme.md")
  assert.throws(() => resolveKnowledgePath("C:/workspace", "../.ssh/id_rsa"))
})

test("resolveKnowledgePath 盘符大小写仍视为工作区内", () => {
  if (process.platform !== "win32") return
  const resolved = resolveKnowledgePath("c:/workspace", "C:/workspace/design")
  assert.equal(resolved.rel, "design")
})

test("resolveKnowledgePath 拒绝工作区外绝对路径", () => {
  if (process.platform !== "win32") {
    assert.throws(() => resolveKnowledgePath("/workspace", "/etc/passwd"))
    return
  }
  assert.throws(() => resolveKnowledgePath("C:/workspace", "D:/other/secret.md"))
})

test("assertAbsInsideRoots 允许多根，拒绝逃逸", () => {
  const allowed = ["C:/ws/.cursor/rules", "C:/home/.enjoy-agents/rules"]
  const ok = assertAbsInsideRoots("C:/ws/.cursor/rules/clean.mdc", allowed)
  assert.ok(ok.toLowerCase().includes("clean.mdc"))
  assert.throws(() => assertAbsInsideRoots("C:/Windows/system.ini", allowed))
  assert.throws(() => assertAbsInsideRoots("C:/ws/.cursor/rules/../../secret.txt", allowed))
})
