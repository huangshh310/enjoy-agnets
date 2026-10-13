import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import {
  collectLastTurnPreviewUrl,
  collectSessionPreviewUrl,
  pickPreviewTarget,
  pickStandalonePreviewTarget,
  previewTargetLabel
} from "./pick-preview-target.ts"

const viteTool = (id: string) => ({
  id,
  name: "bash",
  state: "output-available" as const,
  result: { stdout: "➜  Local:   http://localhost:5173/\nNetwork: http://192.168.0.4:5173/" }
})

test("改动条 html 优先；没有 html 才用本机 URL；都没有就不出入口", () => {
  assert.deepEqual(
    pickPreviewTarget({ files: [{ path: "docs/other.html" }], sessionUrl: "http://127.0.0.1:5173/" }),
    { kind: "html", path: "docs/other.html" }
  )
  assert.deepEqual(
    pickPreviewTarget({ files: [{ path: "src/auth/login.ts" }], sessionUrl: "http://127.0.0.1:5173/" }),
    { kind: "url", url: "http://127.0.0.1:5173/" }
  )
  assert.equal(pickPreviewTarget({ files: [{ path: "e2e-stub.txt" }] }), null)
})

test("入参不再有 selectedPath：「文件」里选中的 .html 串不进来（luna 3cf0）", () => {
  const stale = { files: [{ path: "e2e-stub.txt" }], selectedPath: "landing.html" } as Parameters<
    typeof pickPreviewTarget
  >[0]
  assert.equal(pickPreviewTarget(stale), null)
  assert.equal(pickStandalonePreviewTarget(stale), null)
})

test("独立条不读改动条 html，避免 Keep 后复现", () => {
  assert.equal(pickStandalonePreviewTarget({ files: [{ path: "preview/index.html" }] }), null)
})

test("从本轮工具输出抽出 Vite 本机 URL，忽略远程", () => {
  const messages: ThreadMessage[] = [
    { id: "u1", role: "user", content: "start", createdAt: 1 },
    { id: "a1", role: "assistant", content: "ready", createdAt: 2, tools: [viteTool("t1")] }
  ]
  assert.equal(collectSessionPreviewUrl(messages), "http://localhost:5173/")
  assert.equal(collectLastTurnPreviewUrl(messages), "http://localhost:5173/")
  assert.equal(previewTargetLabel({ kind: "url", url: "http://localhost:5173/" }), "http://localhost:5173/")
})

test("URL 只在历史轮里：本轮改 .txt 不出「在浏览器打开」（leo #151）", () => {
  const messages: ThreadMessage[] = [
    { id: "u1", role: "user", content: "start dev", createdAt: 1 },
    { id: "a1", role: "assistant", content: "ready", createdAt: 2, tools: [viteTool("t1")] },
    { id: "u2", role: "user", content: "please write a note", createdAt: 3 },
    {
      id: "a2",
      role: "assistant",
      content: "done",
      createdAt: 4,
      tools: [{ id: "t2", name: "write_file", state: "output-available", args: { path: "e2e-stub.txt" } }]
    }
  ]
  const sessionUrl = collectLastTurnPreviewUrl(messages)
  assert.equal(sessionUrl, null)
  assert.equal(pickPreviewTarget({ files: [{ path: "e2e-stub.txt" }], sessionUrl }), null)
  assert.equal(pickStandalonePreviewTarget({ sessionUrl }), null)
})
