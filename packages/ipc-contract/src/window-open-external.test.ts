/**
 * window.openExternal 入参：只放行 http(s)，拒 file / javascript / data / 自定义协议。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  externalUrlHasUserinfo,
  externalUrlScheme,
  isAllowedExternalHttpScheme,
  parseWindowOpenExternalInput,
  WindowOpenExternalInput
} from "./window.ts"

test("Zod 放行 http(s)，规范化 trim", () => {
  assert.equal(WindowOpenExternalInput.parse({ url: " https://example.com/a " }).url, "https://example.com/a")
  assert.equal(WindowOpenExternalInput.parse({ url: "http://127.0.0.1:5173/" }).url, "http://127.0.0.1:5173/")
})

test("Zod 拒绝 file / javascript / data / 自定义协议 / 无 scheme", () => {
  const rejected = [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:text/html,hi",
    "blob:https://example.com/1",
    "vscode://file/tmp",
    "about:blank",
    "mailto:a@b.com",
    "example.com",
    ""
  ]
  for (const url of rejected) {
    assert.equal(WindowOpenExternalInput.safeParse({ url }).success, false, url)
  }
  assert.equal(WindowOpenExternalInput.safeParse({ url: "https://x", extra: 1 }).success, false)
})

test("Zod 与 parse 拒绝 userinfo 凭据", () => {
  const rejected = [
    "https://user:pass@example.com/",
    "http://alice@127.0.0.1:8080/x",
    "https://user:@example.com"
  ]
  for (const url of rejected) {
    assert.equal(externalUrlHasUserinfo(url), true, url)
    assert.equal(WindowOpenExternalInput.safeParse({ url }).success, false, url)
    assert.deepEqual(parseWindowOpenExternalInput({ url }), {
      ok: false,
      code: "OPEN_EXTERNAL_NOT_ALLOWED"
    })
  }
  assert.equal(externalUrlHasUserinfo("https://example.com/a@b"), false)
})

test("parseWindowOpenExternalInput 失败回码不抛", () => {
  assert.deepEqual(parseWindowOpenExternalInput({ url: "https://ok.example" }), {
    ok: true,
    url: "https://ok.example"
  })
  assert.deepEqual(parseWindowOpenExternalInput({ url: "file:///tmp" }), {
    ok: false,
    code: "OPEN_EXTERNAL_NOT_ALLOWED"
  })
  assert.deepEqual(parseWindowOpenExternalInput({}), {
    ok: false,
    code: "OPEN_EXTERNAL_INVALID"
  })
})

test("scheme 帮手只认 http/https", () => {
  assert.equal(externalUrlScheme("HTTPS://A"), "https")
  assert.equal(isAllowedExternalHttpScheme("http"), true)
  assert.equal(isAllowedExternalHttpScheme("https"), true)
  assert.equal(isAllowedExternalHttpScheme("file"), false)
  assert.equal(isAllowedExternalHttpScheme("javascript"), false)
  assert.equal(isAllowedExternalHttpScheme(null), false)
})
