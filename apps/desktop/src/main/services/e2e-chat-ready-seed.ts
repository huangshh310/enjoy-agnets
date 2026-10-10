/**
 * CHAT_READY=key / engine：写入真能发的 stub 路线。打包态 / 非隔离目录不写。
 * 只种一次，避免每次 ready 重算都 activate:true。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { setSetting } from "./database"
import {
  E2E_CHAT_READY_ENGINE_ID,
  E2E_CHAT_READY_KEY_PROFILE_ID,
  E2E_CHAT_READY_MODEL_ID,
  applyE2eStubEngine,
  e2eChatReadyKind,
  e2eChatReadySeedAllowed,
  e2eStubEngineInspect,
  e2eStubEngineInspectValue
} from "./e2e-chat-readiness"
import { writeInspectCache } from "./agent-tools-account/inspect-store"
import { e2eCredentialFixture } from "./credential-check-run.ts"
import { writeCredentialCheck } from "./credential-check-store.ts"
import { isE2eStub } from "./e2e-stub"
import { upsertProfile } from "./secrets"

export { applyE2eStubEngine, e2eStubEngineInspect }

let seededKind: string | undefined

export function e2eChatReadySeededKind(): string | undefined {
  return seededKind
}

export async function seedE2eChatReadyRoute(input: {
  packaged?: boolean
  userData?: string
} = {}): Promise<boolean> {
  if (seededKind) return false
  if (!isE2eStub() || !e2eChatReadySeedAllowed(input)) return false
  const kind = e2eChatReadyKind()
  if (kind === "key") {
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
    writeCredentialCheck(
      E2E_CHAT_READY_KEY_PROFILE_ID,
      e2eCredentialFixture() ?? { state: "ok" }
    )
    seededKind = "key"
    return true
  }
  if (kind === "engine") {
    writeInspectCache(E2E_CHAT_READY_ENGINE_ID as AgentToolId, e2eStubEngineInspectValue())
    seededKind = "engine"
    return true
  }
  return false
}
