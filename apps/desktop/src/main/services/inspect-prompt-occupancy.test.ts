/**
 * C：Inspect Prompt 可携带可选 repoMapOccupancy（无新 StreamEvent）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearInspectPromptSnapshots,
  getInspectPromptSnapshot,
  rememberInspectPrompt
} from "./inspect-prompt-snapshot.ts"

test("rememberInspectPrompt 可写入可选 repoMapOccupancy", () => {
  clearInspectPromptSnapshots()
  rememberInspectPrompt({
    source: "last-run",
    capturedAt: 1,
    sessionId: "ses_occ",
    modelId: "m",
    mode: "agent",
    runtime: "local",
    instructions: "sys",
    messages: [{ role: "user", content: "hi" }],
    toolNames: ["repo_outline"],
    repoMapOccupancy: {
      mode: "directory",
      chars: 120,
      approxTokens: 30,
      tokenBudget: 1000,
      note: "符号地图不可用 · 目录模式"
    }
  })
  const snap = getInspectPromptSnapshot("ses_occ")
  assert.equal(snap?.repoMapOccupancy?.mode, "directory")
  assert.equal(snap?.repoMapOccupancy?.approxTokens, 30)
  assert.equal(snap?.repoMapOccupancy?.tokenBudget, 1000)
  assert.match(snap?.repoMapOccupancy?.note ?? "", /目录模式/)
})

test("无 occupancy 时字段可省略（向后兼容）", () => {
  clearInspectPromptSnapshots()
  rememberInspectPrompt({
    source: "preview",
    capturedAt: 2,
    sessionId: "ses_plain",
    modelId: "m",
    mode: "agent",
    runtime: "local",
    instructions: "sys",
    messages: [],
    toolNames: []
  })
  assert.equal(getInspectPromptSnapshot("ses_plain")?.repoMapOccupancy, undefined)
})
