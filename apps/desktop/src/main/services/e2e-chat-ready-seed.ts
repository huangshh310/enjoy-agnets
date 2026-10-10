/**
 * CHAT_READY=key：写入一条真能发的 stub 档案。打包态不写。
 */
import { setSetting } from "./database"
import {
  E2E_CHAT_READY_KEY_PROFILE_ID,
  E2E_CHAT_READY_MODEL_ID,
  e2eChatReadyKind,
  e2eChatReadinessAllowed
} from "./e2e-chat-readiness"
import { isE2eStub } from "./e2e-stub"
import { upsertProfile } from "./secrets"

export async function seedE2eChatReadyRoute(packaged = false): Promise<boolean> {
  if (!isE2eStub() || !e2eChatReadinessAllowed(process.env, packaged)) return false
  if (e2eChatReadyKind() !== "key") return false
  await upsertProfile({
    id: E2E_CHAT_READY_KEY_PROFILE_ID,
    name: "E2E Stub Key",
    kind: "openai",
    apiKey: "sk-e2e-stub",
    modelId: E2E_CHAT_READY_MODEL_ID,
    models: [{ id: E2E_CHAT_READY_MODEL_ID, label: "E2E Stub" }],
    activate: true
  })
  setSetting("defaultModelId", E2E_CHAT_READY_MODEL_ID)
  return true
}
