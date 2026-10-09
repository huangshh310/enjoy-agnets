import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveInsideWorkspace } from "./paths.ts"

test("相对路径锁在工作区内", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-jail-in-"))
  const expected = join(realpathSync(root), "src", "a.ts")
  assert.equal(resolveInsideWorkspace(root, "src/a.ts"), expected)
  assert.throws(() => resolveInsideWorkspace(root, "../secret"), /escapes/)
})

test("工作区内指向 jail 外的符号链接被拒", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-jail-link-"))
  const outside = mkdtempSync(join(tmpdir(), "enjoy-jail-out-"))
  writeFileSync(join(outside, "secret.txt"), "no")
  const link = join(root, "link.txt")
  try {
    symlinkSync(join(outside, "secret.txt"), link)
  } catch {
    return
  }
  assert.throws(() => resolveInsideWorkspace(root, "link.txt"), /escapes/)
})
