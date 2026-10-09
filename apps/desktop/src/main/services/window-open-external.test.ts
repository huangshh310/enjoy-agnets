/**
 * 外链只认 http(s)，拒绝 javascript / file。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { openExternalHttpUrl, planExternalHttpUrl } from "./window-open-external.ts"

test("http(s) 规范化后交给 open", async () => {
  assert.equal(planExternalHttpUrl("https://example.com/a"), "https://example.com/a")
  const opened: string[] = []
  const result = await openExternalHttpUrl("http://example.com", async (href) => {
    opened.push(href)
  })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(opened, ["http://example.com/"])
})

test("javascript / file / 非法串拒绝", () => {
  assert.throws(() => planExternalHttpUrl("javascript:alert(1)"), /OPEN_EXTERNAL_NOT_ALLOWED/)
  assert.throws(() => planExternalHttpUrl("file:///etc/passwd"), /OPEN_EXTERNAL_NOT_ALLOWED/)
  assert.throws(() => planExternalHttpUrl("not a url"), /OPEN_EXTERNAL_INVALID/)
})
