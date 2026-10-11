/**
 * 有密钥没模型：Composer 必须留空，才能露出 NEED_MODEL。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyComposerModelFromSettings } from "./apply-settings-composer-model.ts"
import { settingsShouldLeaveModelEmpty } from "./composer-leave-model-empty.ts"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

test("当前档案有密钥、路线没模型、也没有偏好/会话覆盖才留空", () => {
  assert.equal(
    settingsShouldLeaveModelEmpty({
      hasEnjoySecret: true,
      profileId: "e2e",
      routeModelId: "",
      defaultModelId: "",
      preferredModelId: "",
      sessionModelId: ""
    }),
    true
  )
  assert.equal(
    settingsShouldLeaveModelEmpty({
      hasEnjoySecret: true,
      profileId: "e2e",
      routeModelId: "stub-e2e"
    }),
    false
  )
  assert.equal(
    settingsShouldLeaveModelEmpty({
      hasEnjoySecret: true,
      profileId: "e2e",
      sessionModelId: "stub-e2e"
    }),
    false
  )
  assert.equal(
    settingsShouldLeaveModelEmpty({
      hasEnjoySecret: false,
      profileId: "e2e"
    }),
    false
  )
})

test("设置快照有密钥没模型时不拿目录第一项顶上", () => {
  let modelId = "keep"
  applyComposerModelFromSettings({
    sessionId: "s1",
    sessionModels: {},
    preferredModelId: "",
    defaultModelId: "",
    readySnap: buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }],
      engineCount: 1,
      hasEnjoySecret: true
    }),
    models: [{ id: "stub-e2e", label: "E2E Stub" }],
    setModel: (id) => {
      modelId = id
    }
  })
  assert.equal(modelId, "")
})
