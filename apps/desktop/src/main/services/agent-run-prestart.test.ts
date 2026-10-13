/**
 * 前台发送开跑前缺模型 / 会话不在库：折成稳定码，不 throw 英文。续跑 / 自动化 / 心跳仍 throw。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  isInteractiveComposerRun,
  preStartModelCode,
  preStartSessionCode
} from "./agent-run-prestart.ts"

test("只有前台发送算 interactive", () => {
  assert.equal(isInteractiveComposerRun({ isResume: false, isHeartbeat: false }), true)
  assert.equal(isInteractiveComposerRun({ isResume: true, isHeartbeat: false }), false)
  assert.equal(isInteractiveComposerRun({ isResume: false, isHeartbeat: true }), false)
  assert.equal(
    isInteractiveComposerRun({ isResume: false, isHeartbeat: false, automationSource: { automationId: "a" } }),
    false
  )
})

test("缺模型：前台回 NEED_MODEL，非前台不折", () => {
  assert.equal(preStartModelCode({ interactive: true, needsModel: true }), "NEED_MODEL")
  assert.equal(preStartModelCode({ interactive: true, needsModel: false }), null)
  assert.equal(preStartModelCode({ interactive: false, needsModel: true }), null)
})

test("会话不在库：前台回 SESSION_NOT_READY，非前台不折", () => {
  assert.equal(preStartSessionCode({ interactive: true, sessionExists: false }), "SESSION_NOT_READY")
  assert.equal(preStartSessionCode({ interactive: true, sessionExists: true }), null)
  assert.equal(preStartSessionCode({ interactive: false, sessionExists: false }), null)
})

test("beginAgentRun 接线：先折码再保留旧 throw", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "agent-run-start.ts"), "utf8")
  const modelAt = src.indexOf("if (modelCode) return { ok: false, code: modelCode }")
  const modelThrowAt = src.indexOf('throw new Error("Choose a model')
  const sessionAt = src.indexOf("if (sessionCode) return { ok: false, code: sessionCode }")
  const sessionThrowAt = src.indexOf('throw new Error("Unknown session for this workspace.")')
  assert.ok(modelAt > 0 && modelAt < modelThrowAt)
  assert.ok(sessionAt > 0 && sessionAt < sessionThrowAt)
})
