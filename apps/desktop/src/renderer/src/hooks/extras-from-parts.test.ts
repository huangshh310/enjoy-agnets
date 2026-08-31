import assert from "node:assert/strict"
import { test } from "node:test"
import { extrasFromParts } from "./extras-from-parts.ts"

test("从 parts 恢复来源与结构化", () => {
  const extras = extrasFromParts([
    { type: "source", sourceId: "s1", title: "a", path: "a.ts", startLine: 4, snippet: "fn" },
    { type: "file", assetId: "ast_1", mediaType: "image/png", name: "shot.png" },
    { type: "structured", value: { ok: true } },
    { type: "component", componentId: "card", props: { value: { ok: true } } },
    { type: "component", componentId: "evil-script", props: {} }
  ])
  assert.equal(extras.sources[0]?.path, "a.ts")
  assert.equal(extras.assets[0]?.name, "shot.png")
  assert.deepEqual(extras.structured, { ok: true })
  assert.equal(extras.components.length, 1)
  assert.equal(extras.components[0]?.componentId, "card")
})
