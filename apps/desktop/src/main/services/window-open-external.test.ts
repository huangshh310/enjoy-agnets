/**
 * main 复验：只认 http(s)，显式拒绝 file / javascript / data / 凭据 / 自定义协议；失败回码。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { openExternalHttpUrl, planExternalHttpUrl } from "./window-open-external.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("http(s) 规范化后交给 open", async () => {
  assert.deepEqual(planExternalHttpUrl("https://example.com/a"), {
    ok: true,
    href: "https://example.com/a"
  })
  const opened: string[] = []
  const result = await openExternalHttpUrl("http://example.com", async (href) => {
    opened.push(href)
  })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(opened, ["http://example.com/"])
})

test("显式拒绝 file / javascript / data / 自定义协议 / 非法串，不抛", async () => {
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
    assert.deepEqual(planExternalHttpUrl(url), { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }, url)
    const opened: string[] = []
    const result = await openExternalHttpUrl(url, async (href) => {
      opened.push(href)
    })
    assert.deepEqual(result, { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }, url)
    assert.deepEqual(opened, [])
  }
  assert.deepEqual(planExternalHttpUrl("not a url"), { ok: false, code: "OPEN_EXTERNAL_INVALID" })
})

test("拒绝带 userinfo 凭据的 URL", async () => {
  const creds = [
    "https://user:pass@example.com/docs",
    "http://alice@127.0.0.1/x",
    "https://u:p@example.com"
  ]
  for (const url of creds) {
    assert.deepEqual(planExternalHttpUrl(url), { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }, url)
    const opened: string[] = []
    const result = await openExternalHttpUrl(url, async (href) => {
      opened.push(href)
    })
    assert.deepEqual(result, { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }, url)
    assert.deepEqual(opened, [])
  }
})

test("IPC handler 先 parseWindowOpenExternalInput 再复验，不 throw parse", () => {
  const src = readFileSync(join(dir, "../ipc-shell.ts"), "utf8")
  assert.ok(src.includes("parseWindowOpenExternalInput(raw)"))
  assert.ok(src.includes("openExternalHttpUrl(parsed.url,"))
  assert.ok(!src.includes("WindowOpenExternalInput.parse("))
})
