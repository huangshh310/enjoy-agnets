/**
 * removeWorkspace 必须先 drop SSH pool 再删行，不依赖 renderer 切走 disconnect。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "workspace.ts"), "utf8")
const removeFn = src.slice(src.indexOf("export async function removeWorkspace"), src.indexOf("export async function readWorkspaceFile"))

test("removeWorkspace 先 dropSshPool 再删行", () => {
  const dropAt = removeFn.indexOf("dropSshPool(workspaceId)")
  const deleteAt = removeFn.indexOf("DELETE FROM workspaces")
  assert.ok(dropAt >= 0, "删除 SSH 项目必须由 main dropSshPool")
  assert.ok(deleteAt > dropAt, "必须先断开连接再删档案行")
  assert.match(removeFn, /lastWorkspaceId/)
})
