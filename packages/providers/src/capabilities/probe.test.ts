import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearProbedCapabilities,
  effectiveCapabilities,
  probedCapabilitiesFor,
  rememberProbedModels
} from "./probe.ts"

test("未探测时只用静态目录", () => {
  clearProbedCapabilities()
  const record = probedCapabilitiesFor("gpt-4o", "openai")
  assert.deepEqual(record.probedCaps, [])
  assert.ok(record.staticCaps.includes("vision"))
  assert.ok(effectiveCapabilities("gpt-4o", "openai").includes("vision"))
})

test("probe 成功后写入 probedCaps", () => {
  clearProbedCapabilities()
  rememberProbedModels("openai", ["whisper-1"], 1)
  const record = probedCapabilitiesFor("whisper-1", "openai")
  assert.ok(record.probedCaps.includes("transcription"))
  assert.equal(record.probedAt, 1)
  assert.ok(effectiveCapabilities("whisper-1", "openai").includes("transcription"))
})
