import assert from "node:assert/strict"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { shouldPollWorkspaceWatch, workspaceFingerprint } from "./workspace-watch-fingerprint.ts"

test("只在 win32 轮询补 fs.watch", () => {
  assert.equal(shouldPollWorkspaceWatch("win32"), true)
  assert.equal(shouldPollWorkspaceWatch("darwin"), false)
})

test("指纹随文件内容变化", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-watch-"))
  await mkdir(join(root, "src"))
  await writeFile(join(root, "src", "a.ts"), "a")
  const first = await workspaceFingerprint(root)
  await writeFile(join(root, "src", "a.ts"), "ab")
  const second = await workspaceFingerprint(root)
  assert.notEqual(first, second)
})
