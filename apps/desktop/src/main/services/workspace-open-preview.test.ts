import assert from "node:assert/strict"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { test } from "node:test"
import {
  openWorkspacePreviewWith,
  planWorkspacePreviewHref
} from "./workspace-open-preview-plan.ts"

test("html 必须在工作区内且真实存在，打开 file URL", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-preview-"))
  await writeFile(join(root, "index.html"), "<html></html>")
  const planned = await planWorkspacePreviewHref(
    { workspaceId: "ws_1", path: "index.html" },
    {
      resolveRoot: async () => root,
      fileExists: async (abs) => abs === join(root, "index.html")
    }
  )
  assert.deepEqual(planned, { href: pathToFileURL(join(root, "index.html")).href })
})

test("缺文件 / 逃逸 / 非 html 都拒绝，不编造 URL", async () => {
  const missing = await planWorkspacePreviewHref(
    { workspaceId: "ws_1", path: "gone.html" },
    {
      resolveRoot: async () => "/tmp/ws",
      fileExists: async () => false
    }
  )
  assert.deepEqual(missing, { code: "PREVIEW_NOT_FOUND" })
  const escape = await planWorkspacePreviewHref(
    { workspaceId: "ws_1", path: "../secret.html" },
    {
      resolveRoot: async () => "/tmp/ws",
      fileExists: async () => true
    }
  )
  assert.deepEqual(escape, { code: "PREVIEW_NOT_ALLOWED" })
  const ts = await planWorkspacePreviewHref(
    { workspaceId: "ws_1", path: "src/auth/login.ts" },
    {
      resolveRoot: async () => "/tmp/ws",
      fileExists: async () => true
    }
  )
  assert.deepEqual(ts, { code: "PREVIEW_NOT_ALLOWED" })
})

test("远程 URL 拒绝；本机 URL 才交给 openExternal", async () => {
  const opened: string[] = []
  const remote = await openWorkspacePreviewWith(
    { workspaceId: "ws_1", url: "https://example.com" },
    {
      resolveRoot: async () => "/tmp/ws",
      fileExists: async () => false,
      openExternal: async (href) => {
        opened.push(href)
      }
    }
  )
  assert.deepEqual(remote, { ok: false, code: "PREVIEW_NOT_ALLOWED" })
  const local = await openWorkspacePreviewWith(
    { workspaceId: "ws_1", url: "http://127.0.0.1:5173/" },
    {
      resolveRoot: async () => "/tmp/ws",
      fileExists: async () => false,
      openExternal: async (href) => {
        opened.push(href)
      }
    }
  )
  assert.deepEqual(local, { ok: true })
  assert.deepEqual(opened, ["http://127.0.0.1:5173/"])
})
