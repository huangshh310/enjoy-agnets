import assert from "node:assert/strict"
import { test } from "node:test"
import { pickArtifactCard } from "./pick-artifact-card.ts"

test("无 html / url 不造卡", () => {
  assert.equal(pickArtifactCard({ tools: [] }), null)
  assert.equal(
    pickArtifactCard({
      tools: [{ id: "t1", name: "write_file", state: "output-available", args: { path: "a.ts" }, result: { path: "a.ts" } }]
    }),
    null
  )
})

test("html 产物：写入中 writing=true，完成可打开", () => {
  const writing = pickArtifactCard({
    streaming: true,
    tools: [
      {
        id: "t1",
        name: "write_file",
        state: "input-streaming",
        args: { path: "preview/index.html" }
      }
    ]
  })
  assert.equal(writing?.kind, "web")
  assert.equal(writing?.writing, true)
  assert.equal(writing?.title, "index.html")

  const ready = pickArtifactCard({
    streaming: false,
    tools: [
      {
        id: "t1",
        name: "write_file",
        state: "output-available",
        args: { path: "preview/index.html" },
        result: { path: "preview/index.html" }
      }
    ]
  })
  assert.equal(ready?.writing, false)
  assert.equal(ready?.path, "preview/index.html")
})

test("sessionUrl 可开网页卡，不写第 N 版", () => {
  const card = pickArtifactCard({ tools: [], sessionUrl: "http://127.0.0.1:5173/" })
  assert.equal(card?.kind, "web")
  assert.equal(card?.url, "http://127.0.0.1:5173/")
  assert.doesNotMatch(card?.title ?? "", /第\s*\d+\s*版|v\d+/i)
})
