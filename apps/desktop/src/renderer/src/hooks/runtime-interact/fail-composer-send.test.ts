import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "send-composer-run.ts"), "utf8")
const fail = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fail-composer-send.ts"), "utf8")

test("发送失败走 failComposerSend：还文、notice、清停车、空会话可删", () => {
  assert.match(src, /failComposerSend/)
  assert.match(src, /SEND_FAILED_RESTORE/)
  assert.match(fail, /takePark/)
  assert.match(fail, /discardCreatedSession/)
  assert.match(fail, /dropMatchingOptimisticUser/)
})
