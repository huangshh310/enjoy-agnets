/**
 * ready ⇒ 闸放行：穷尽 576 组，防止两套谓词再分叉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildChatReadiness,
  chatRouteAllowsSend,
  isVerifiedLocalModel,
  type ChatApiKeyRoute,
  type ChatEngineRoute,
  type ChatLocalModelRoute
} from "./chat-readiness.ts"

const KEY: ChatApiKeyRoute = { kind: "api_key", providerId: "prov_1", presetId: "openai" }
const CLAUDE: ChatEngineRoute = { kind: "engine", runtimeId: "claude", name: "Claude Code" }
const LOCAL_OK: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: true }
const REMOTE: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: false }

const SECRET = [true, false, undefined] as const
const LOCALS: ChatLocalModelRoute[][] = [[], [LOCAL_OK], [REMOTE]]
const KEYS = [false, true] as const
const ENGINES = [false, true] as const
const PREFERRED = [undefined, "claude"] as const
const EXPLICIT = [false, true] as const
const ACTIVE = [undefined, null, "prov_1", "other"] as const

test("穷尽 576 组：ready 为真时闸必须放行", () => {
  let count = 0
  for (const hasEnjoySecret of SECRET) {
    for (const localModels of LOCALS) {
      for (const hasKey of KEYS) {
        for (const hasCli of ENGINES) {
          for (const preferredRuntimeId of PREFERRED) {
            for (const explicit of EXPLICIT) {
              for (const activeKeyProfileId of ACTIVE) {
                count += 1
                const snap = buildChatReadiness({
                  engines: hasCli ? [CLAUDE] : [],
                  localModels,
                  apiKeys: hasKey ? [KEY] : [],
                  engineCount: 1,
                  hasEnjoySecret,
                  preferredRuntimeId,
                  explicit,
                  activeKeyProfileId
                })
                const allows = chatRouteAllowsSend({
                  runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
                  hasEnjoySecret: snap.hasEnjoySecret ?? false,
                  verifiedLocal: localModels.some(isVerifiedLocalModel)
                })
                assert.ok(
                  !snap.ready || allows,
                  `ready=${snap.ready} gate=${allows} secret=${String(hasEnjoySecret)} locals=${localModels.length} key=${hasKey} cli=${hasCli} pref=${String(preferredRuntimeId)} explicit=${explicit} active=${String(activeKeyProfileId)}`
                )
              }
            }
          }
        }
      }
    }
  }
  assert.equal(count, 576)
})
