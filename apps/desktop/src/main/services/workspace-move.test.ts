/**
 * workspace.move：jail、拒绝进自己、目标已存在。
 */
import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { MOVE_EXISTS, MOVE_NOT_FOUND, renameInsideWorkspace } from "./workspace-rename.ts"

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "enjoy-move-"))
  await mkdir(join(root, "src"), { recursive: true })
  await mkdir(join(root, "lib"), { recursive: true })
  await writeFile(join(root, "src", "a.ts"), "export const a = 1\n", "utf8")
  await writeFile(join(root, "lib", "keep.ts"), "export {}\n", "utf8")
  return root
}

test("把文件拖进目录后内容还在", async () => {
  const root = await fixture()
  const result = await renameInsideWorkspace(root, "src/a.ts", "lib")
  assert.equal(result.to, "lib/a.ts")
  assert.equal(await readFile(join(root, "lib", "a.ts"), "utf8"), "export const a = 1\n")
})

test("目标已存在 / 找不到源 / 同位置 / 进自己 / 逃逸都拒绝", async () => {
  const root = await fixture()
  await writeFile(join(root, "lib", "a.ts"), "taken\n", "utf8")
  await assert.rejects(() => renameInsideWorkspace(root, "src/a.ts", "lib"), /MOVE_EXISTS/)
  await assert.rejects(() => renameInsideWorkspace(root, "missing.ts", "lib"), /MOVE_NOT_FOUND/)
  await assert.rejects(() => renameInsideWorkspace(root, "src/a.ts", "src"), /MOVE_SAME_LOCATION/)
  await mkdir(join(root, "src", "nested"), { recursive: true })
  await assert.rejects(() => renameInsideWorkspace(root, "src", "src/nested"), /MOVE_INTO_SELF/)
  await assert.rejects(() => renameInsideWorkspace(root, "../secret.ts", "lib"))
  assert.equal(MOVE_EXISTS, "MOVE_EXISTS")
  assert.equal(MOVE_NOT_FOUND, "MOVE_NOT_FOUND")
})
