import assert from "node:assert/strict"
import { test } from "node:test"
import { composerCanSend } from "./composer-can-send.ts"

test("composerCanSend：正文 / 附件 / Chip 任一即可发；全空才不能发", () => {
  assert.equal(composerCanSend({ text: "hi" }), true)
  assert.equal(composerCanSend({ text: "", assetCount: 1 }), true)
  assert.equal(composerCanSend({ text: "  \n", assetCount: 2 }), true)
  assert.equal(composerCanSend({ text: "", hasChips: true }), true)
  assert.equal(composerCanSend({ text: "   " }), false)
  assert.equal(composerCanSend({ text: "", assetCount: 0, hasChips: false }), false)
})

test("接线：按钮（hasDraft）、取稿、排队首发、运行中排队、编辑重发都走同一判定", async () => {
  const { readFileSync } = await import("node:fs")
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")
  for (const rel of [
    "./use-composer-has-draft.ts",
    "./resolve-send-payload.ts",
    "./send-composer-run.ts",
    "../queue-composer-send.ts",
    "../send-composer.ts",
    "../regenerate-turn.ts",
    "../../components/ai-chat/thread/turns/user-turn.tsx"
  ]) {
    assert.match(read(rel), /composerCanSend\(/, rel)
  }
  assert.doesNotMatch(read("./resolve-send-payload.ts"), /if \(!raw\.trim\(\)\) return null/)
})
