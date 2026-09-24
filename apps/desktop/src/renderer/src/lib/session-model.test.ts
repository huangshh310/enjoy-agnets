/**
 * 有效模型解析与会话换模作用域。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { planComposerSwitch } from "../components/ai-chat/agent-picker/handoff/plan-composer-switch.ts"
import {
  composerModelPatch,
  getEffectiveModel,
  nextPreferredModelId,
  planSessionModelWrite,
  shouldShowModelSwitchBadge
} from "./session-model.ts"

test("有效模型：会话覆盖 > 引擎默认 > 档案 models[0]", () => {
  assert.equal(
    getEffectiveModel({
      sessionId: "s1",
      sessionModels: { s1: "opus" },
      engineDefault: "sonnet",
      catalogFirst: "haiku"
    }),
    "opus"
  )
  assert.equal(
    getEffectiveModel({
      sessionId: "s1",
      sessionModels: {},
      engineDefault: "sonnet",
      catalogFirst: "haiku"
    }),
    "sonnet"
  )
  assert.equal(
    getEffectiveModel({
      sessionId: "s1",
      sessionModels: {},
      engineDefault: null,
      catalogFirst: "haiku"
    }),
    "haiku"
  )
})

test("新会话 composer 模型不吃上一会话 store.modelId", () => {
  const patch = composerModelPatch({
    sessionId: "s2",
    sessionModels: { s1: "opus" },
    preferredModelId: "sonnet",
    models: [
      { id: "haiku", label: "Haiku" },
      { id: "sonnet", label: "Sonnet" },
      { id: "opus", label: "Opus" }
    ]
  })
  assert.equal(patch.modelId, "sonnet")
  assert.equal(patch.modelLabel, "Sonnet")
  assert.equal(
    nextPreferredModelId({
      writePreferenceDefault: false,
      nextModelId: "opus",
      previousPreferred: "sonnet"
    }),
    "sonnet"
  )
  assert.equal(
    nextPreferredModelId({
      writePreferenceDefault: true,
      nextModelId: "opus",
      previousPreferred: "sonnet"
    }),
    "opus"
  )
})

test("新 sessionId 读不到上一会话中途模型", () => {
  const overlay = { s1: "opus" }
  assert.equal(
    getEffectiveModel({
      sessionId: "s2",
      sessionModels: overlay,
      engineDefault: "sonnet",
      catalogFirst: "haiku"
    }),
    "sonnet"
  )
})

test("有用户轮只写会话覆盖，空会话可写偏好默认", () => {
  assert.deepEqual(planSessionModelWrite({ hasUserTurns: true }), {
    writeSession: true,
    writePreferenceDefault: false
  })
  assert.deepEqual(planSessionModelWrite({ hasUserTurns: false }), {
    writeSession: true,
    writePreferenceDefault: true
  })
})

test("同 runtimeId 换模不是 handoff", () => {
  assert.equal(
    planComposerSwitch({
      from: "claude",
      to: "claude",
      hasUserTurns: true,
      hasPendingApproval: false
    }).kind,
    "noop"
  )
})

test("跨引擎仍 handoff", () => {
  assert.equal(
    planComposerSwitch({
      from: "claude",
      to: "cursor",
      hasUserTurns: true,
      hasPendingApproval: false
    }).kind,
    "handoff"
  )
})

test("有用户轮且覆盖不同于引擎默认才出已切换角标", () => {
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "opus" },
      engineDefault: "sonnet",
      hasUserTurns: true
    }),
    true
  )
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "sonnet" },
      engineDefault: "sonnet",
      hasUserTurns: true
    }),
    false
  )
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "opus" },
      engineDefault: "sonnet",
      hasUserTurns: false
    }),
    false
  )
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "deepseek-flash" },
      engineDefault: "claude-sonnet-4-5",
      hasUserTurns: true,
      engineModelIds: ["claude-sonnet-4-5"]
    }),
    false
  )
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "deepseek-flash" },
      engineDefault: "claude-sonnet-4-5",
      hasUserTurns: true,
      engineModelIds: []
    }),
    false
  )
  assert.equal(
    shouldShowModelSwitchBadge({
      sessionId: "s1",
      sessionModels: { s1: "deepseek-v4-flash" },
      engineDefault: null,
      hasUserTurns: true
    }),
    false
  )
})
