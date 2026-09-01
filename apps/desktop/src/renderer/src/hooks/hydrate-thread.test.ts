import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAssistantThreadMessage } from "./hydrate-thread-map.ts"

test("hydrate 映射恢复生图 runKind，不看当前 picker", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_1", content: "", createdAt: 1 },
    {
      v: 1,
      content: "",
      runKind: "image",
      assets: [{ assetId: "ast_1", mediaType: "image/png", name: "shot.png" }]
    },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.runKind, "image")
  assert.equal(message.assets?.[0]?.assetId, "ast_1")
})

test("无 stamp 的旧信封 runKind 为空", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_2", content: "ok", createdAt: 1 },
    { v: 1, content: "ok" },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.runKind, undefined)
  assert.equal(message.content, "ok")
})
