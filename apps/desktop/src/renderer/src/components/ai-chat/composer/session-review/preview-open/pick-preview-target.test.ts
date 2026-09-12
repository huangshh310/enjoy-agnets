import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import {
  collectSessionPreviewUrl,
  pickPreviewTarget,
  pickStandalonePreviewTarget,
  previewTargetLabel
} from "./pick-preview-target.ts"

test("选中 html 优先于改动条与会话 URL", () => {
  const target = pickPreviewTarget({
    selectedPath: "preview/index.html",
    files: [{ path: "docs/other.html" }],
    sessionUrl: "http://127.0.0.1:5173/"
  })
  assert.deepEqual(target, { kind: "html", path: "preview/index.html" })
})

test("未选 html 时用改动条 html；都没有才用本机 URL", () => {
  assert.deepEqual(
    pickPreviewTarget({
      selectedPath: "src/auth/login.ts",
      files: [{ path: "preview/index.html" }],
      sessionUrl: "http://127.0.0.1:5173/"
    }),
    { kind: "html", path: "preview/index.html" }
  )
  assert.deepEqual(
    pickPreviewTarget({
      selectedPath: "src/auth/login.ts",
      files: [{ path: "src/auth/login.ts" }],
      sessionUrl: "http://127.0.0.1:5173/"
    }),
    { kind: "url", url: "http://127.0.0.1:5173/" }
  )
  assert.equal(
    pickPreviewTarget({
      selectedPath: "src/auth/login.ts",
      files: [{ path: "src/auth/login.ts" }]
    }),
    null
  )
})

test("独立条不读改动条 html，避免 Keep 后复现", () => {
  assert.equal(
    pickStandalonePreviewTarget({
      files: [{ path: "preview/index.html" }]
    }),
    null
  )
  assert.deepEqual(
    pickStandalonePreviewTarget({
      selectedPath: "preview/index.html",
      files: [{ path: "docs/a.html" }]
    }),
    { kind: "html", path: "preview/index.html" }
  )
})

test("从本轮工具输出抽出 Vite 本机 URL，忽略远程", () => {
  const messages: ThreadMessage[] = [
    {
      id: "u1",
      role: "user",
      content: "start",
      createdAt: 1
    },
    {
      id: "a1",
      role: "assistant",
      content: "ready",
      createdAt: 2,
      tools: [
        {
          id: "t1",
          name: "bash",
          state: "output-available",
          result: {
            stdout: "➜  Local:   http://localhost:5173/\nNetwork: http://192.168.0.4:5173/"
          }
        }
      ]
    }
  ]
  assert.equal(collectSessionPreviewUrl(messages), "http://localhost:5173/")
  assert.equal(previewTargetLabel({ kind: "url", url: "http://localhost:5173/" }), "http://localhost:5173/")
})
