/**
 * 自定义 ACP 保存：结构化钥匙串失败与抛错都回 writeCode，不把英文交给 UI。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { submitCustomAgentWrite } from "./custom-acp-agent-submit.ts"

const input = {
  label: "demo",
  command: "claude",
  args: [],
  env: { API_KEY: "sk-keep" },
  cwdMode: "workspace" as const
}

test("upsertCustom 回 ok:false 映射 writeCode", async () => {
  const ide = {
    agentTools: {
      upsertCustom: async () => ({ ok: false, code: "KEYCHAIN_UNAVAILABLE" })
    }
  }
  ;(globalThis as { window?: { ide: unknown } }).window = { ide }
  const result = await submitCustomAgentWrite(input, (path) => path, "claude")
  assert.deepEqual(result, { ok: false, writeCode: "KEYCHAIN_UNAVAILABLE" })
})

test("钥匙串抛错回 writeCode，白名单拒绝仍走人话", async () => {
  const ide = {
    agentTools: {
      upsertCustom: async () => {
        throw new Error("OS keychain encryption is not available on this machine.")
      }
    }
  }
  ;(globalThis as { window?: { ide: unknown } }).window = { ide }
  const thrown = await submitCustomAgentWrite(input, (path) => path, "claude")
  assert.deepEqual(thrown, { ok: false, writeCode: "KEYCHAIN_UNAVAILABLE" })

  ide.agentTools.upsertCustom = async () => {
    throw new Error("Refusing to spawn 'bash'. Basename must be a known ACP CLI.")
  }
  const refused = await submitCustomAgentWrite(input, (path, vars) => `${path}:${vars?.command ?? ""}`, "bash")
  assert.deepEqual(refused, { ok: false, error: "settings.registry.customCommandRefused:bash" })
})
