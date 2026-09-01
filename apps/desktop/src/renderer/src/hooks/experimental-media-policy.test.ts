import assert from "node:assert/strict"
import { test } from "node:test"
import { videoRunNeedsExperimental } from "./experimental-media-policy.ts"

test("未开实验开关时视频模型要确认，聊天模型不要", () => {
  assert.equal(videoRunNeedsExperimental("grok-imagine-video", ["video"], false), true)
  assert.equal(videoRunNeedsExperimental("grok-imagine-video", ["video"], true), false)
  assert.equal(videoRunNeedsExperimental("grok-4.6", ["text", "tools"], false), false)
})
