import assert from "node:assert/strict"
import { test } from "node:test"
import { mapBindError, unwrapIpcError } from "./map-agent-tool-error.ts"

test("剥掉 Electron upsert 包装和 CatalogError 前缀", () => {
  assert.equal(
    unwrapIpcError(
      new Error(
        "Error invoking remote method 'agentTools.upsert': CatalogError: api.deepseek.com is DeepSeek's API, not Anthropic Messages."
      )
    ),
    "api.deepseek.com is DeepSeek's API, not Anthropic Messages."
  )
})

test("协议对不上用人话，不要 IPC 原文", () => {
  const t = (path: string) => path
  assert.equal(
    mapBindError("This provider protocol cannot bind to this CLI.", t),
    "settings.agentTools.bindProtocolDenied"
  )
})
