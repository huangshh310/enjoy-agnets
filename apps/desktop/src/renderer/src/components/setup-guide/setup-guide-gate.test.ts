/**
 * 旧安装不能被启动引导挡住。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  nextSetupGuideStep,
  previousSetupGuideStep,
  resolveSetupGuideGate,
  SETUP_GUIDE_STEPS
} from "./setup-guide-gate.ts"

const settled = {
  settingsSettled: true,
  workspacesSettled: true,
  settingsFailed: false,
  workspacesFailed: false
}

test("名单还没到时先等", () => {
  assert.equal(
    resolveSetupGuideGate({ ...settled, settingsSettled: false, completedAt: null, workspaceCount: 0 }),
    "pending"
  )
})

test("没有工作区且没完成过才弹出", () => {
  assert.equal(
    resolveSetupGuideGate({ ...settled, completedAt: null, workspaceCount: 0 }),
    "show"
  )
})

test("已有工作区只补记，不弹出", () => {
  assert.equal(
    resolveSetupGuideGate({ ...settled, completedAt: null, workspaceCount: 2 }),
    "exempt"
  )
})

test("记过完成时间或查询失败就保持关闭", () => {
  assert.equal(
    resolveSetupGuideGate({ ...settled, completedAt: "2026-09-24T00:00:00.000Z", workspaceCount: 0 }),
    "hidden"
  )
  assert.equal(
    resolveSetupGuideGate({ ...settled, settingsFailed: true, completedAt: null, workspaceCount: 0 }),
    "hidden"
  )
})

test("步骤前后走，停在两端", () => {
  assert.equal(nextSetupGuideStep("intro"), "capabilities")
  assert.equal(previousSetupGuideStep("intro"), "intro")
  assert.equal(nextSetupGuideStep("engines"), "connect-model")
  assert.equal(nextSetupGuideStep("connect-model"), "appearance")
  assert.equal(previousSetupGuideStep("appearance"), "connect-model")
  assert.equal(nextSetupGuideStep("ready"), "ready")
  assert.equal(SETUP_GUIDE_STEPS.length, 7)
  assert.equal(SETUP_GUIDE_STEPS[3], "connect-model")
})
