import assert from "node:assert/strict"
import { test } from "node:test"
import { createRealtimeSession } from "./realtime-session.ts"

test("断线后排队，重连后 flush", () => {
  const sent: string[] = []
  const session = createRealtimeSession({ maxRetries: 2 })
  session.attach({ send: (chunk) => sent.push(chunk), close: () => undefined })
  assert.equal(session.transportClosed(), "reconnecting")
  session.sendAudio("abc")
  assert.equal(session.queued, 1)
  session.attach({ send: (chunk) => sent.push(chunk), close: () => undefined })
  assert.equal(session.status, "open")
  assert.deepEqual(sent, ["abc"])
})

test("超过重试次数进入 error", () => {
  const session = createRealtimeSession({ maxRetries: 1 })
  session.attach({ send: () => undefined, close: () => undefined })
  assert.equal(session.transportClosed(), "reconnecting")
  assert.equal(session.transportClosed(), "error")
  assert.equal(session.status, "error")
})
