import assert from "node:assert/strict"
import { test } from "node:test"
import {
  extractLocalPreviewUrl,
  isWorkspaceHtmlPath,
  OpenWorkspacePreviewInput,
  OpenWorkspacePreviewResult,
  parseLocalPreviewUrl
} from "./workspace-preview.ts"

test("入参必须二选一：html 路径或本机 URL", () => {
  const html = OpenWorkspacePreviewInput.parse({
    workspaceId: "ws_1",
    path: "preview/index.html"
  })
  assert.equal(html.path, "preview/index.html")
  const url = OpenWorkspacePreviewInput.parse({
    workspaceId: "ws_1",
    url: "http://127.0.0.1:5173/"
  })
  assert.equal(url.url, "http://127.0.0.1:5173/")
  assert.throws(() => OpenWorkspacePreviewInput.parse({ workspaceId: "ws_1" }))
  assert.throws(() =>
    OpenWorkspacePreviewInput.parse({
      workspaceId: "ws_1",
      path: "a.html",
      url: "http://127.0.0.1:5173"
    })
  )
})

test("只认工作区 html / htm，拒绝逃逸与其它后缀", () => {
  assert.equal(isWorkspaceHtmlPath("preview/index.html"), true)
  assert.equal(isWorkspaceHtmlPath("docs/readme.HTM"), true)
  assert.equal(isWorkspaceHtmlPath("src/auth/login.ts"), false)
  assert.equal(isWorkspaceHtmlPath("../secret.html"), false)
  assert.equal(isWorkspaceHtmlPath("/etc/index.html"), false)
  assert.equal(isWorkspaceHtmlPath("index.html.md"), false)
})

test("本机预览 URL 只认环回，0.0.0.0 改写成 127.0.0.1", () => {
  assert.equal(parseLocalPreviewUrl("http://127.0.0.1:5173/"), "http://127.0.0.1:5173/")
  assert.equal(parseLocalPreviewUrl("http://localhost:3000/app"), "http://localhost:3000/app")
  assert.equal(parseLocalPreviewUrl("http://0.0.0.0:4173/"), "http://127.0.0.1:4173/")
  assert.equal(parseLocalPreviewUrl("https://example.com"), null)
  assert.equal(parseLocalPreviewUrl("file:///tmp/index.html"), null)
  assert.equal(parseLocalPreviewUrl("javascript:alert(1)"), null)
})

test("从 Vite / Next 日志抽出本机 URL，忽略远程", () => {
  const vite = "  ➜  Local:   http://localhost:5173/\n  ➜  Network: http://192.168.1.8:5173/"
  assert.equal(extractLocalPreviewUrl(vite), "http://localhost:5173/")
  assert.equal(
    extractLocalPreviewUrl("open https://github.com/foo then http://127.0.0.1:3000"),
    "http://127.0.0.1:3000/"
  )
  assert.equal(extractLocalPreviewUrl("see https://example.com/docs"), null)
})

test("失败结果只带稳定码，不带绝对路径", () => {
  const parsed = OpenWorkspacePreviewResult.parse({
    ok: false,
    code: "PREVIEW_NOT_ALLOWED"
  })
  assert.equal(parsed.ok, false)
  if (!parsed.ok) assert.equal(parsed.code, "PREVIEW_NOT_ALLOWED")
})
