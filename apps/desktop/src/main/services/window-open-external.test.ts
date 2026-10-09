/**
 * main 复验：只认 http(s)，显式拒绝 file / javascript / data / 自定义协议。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { openExternalHttpUrl, planExternalHttpUrl } from "./window-open-external.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("http(s) 规范化后交给 open", async () => {
  assert.equal(planExternalHttpUrl("https://example.com/a"), "https://example.com/a")
  const opened: string[] = []
  const result = await openExternalHttpUrl("http://example.com", async (href) => {
    opened.push(href)
  })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(opened, ["http://example.com/"])
})

test("显式拒绝 file / javascript / data / 自定义协议 / 非法串", () => {
  const notAllowed = [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:text/html,hi",
    "blob:https://example.com/1",
    "vscode://file/tmp",
    "about:blank",
    "mailto:a@b.com",
    "intent://scan"
  ]
  for (const url of notAllowed) {
    assert.throws(() => planExternalHttpUrl(url), /OPEN_EXTERNAL_NOT_ALLOWED/, url)
  }
  assert.throws(() => planExternalHttpUrl("not a url"), /OPEN_EXTERNAL_INVALID/)
})

test("IPC handler 先 Zod WindowOpenExternalInput 再复验", () => {
  const src = readFileSync(join(dir, "../ipc-shell.ts"), "utf8")
  assert.ok(src.includes("WindowOpenExternalInput.parse(raw)"))
  assert.ok(src.includes("openExternalHttpUrl(url,"))
})
