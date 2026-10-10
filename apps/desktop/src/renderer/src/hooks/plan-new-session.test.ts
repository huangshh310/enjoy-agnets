import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { planNewSession } from "./plan-new-session.ts"

test("S1-5 无项目时新对话不自动选文件夹", () => {
  assert.equal(planNewSession(null), "empty_home")
  assert.equal(planNewSession(undefined), "empty_home")
  assert.equal(planNewSession(""), "empty_home")
})

test("S1-5 有项目时新对话才建会话", () => {
  assert.equal(planNewSession("ws_1"), "create")
})

test("S1-5 startPersistedSession 无项目不弹选夹窗", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "use-agent-session.ts"), "utf8")
  const fn = src.slice(src.indexOf("export async function startPersistedSession"))
  assert.match(fn, /planNewSession/)
  assert.match(fn, /landEmptyHome/)
  assert.doesNotMatch(fn.slice(0, fn.indexOf("export async function openChangedFile")), /openFolder/)
})
