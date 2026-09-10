import assert from "node:assert/strict"
import { test } from "node:test"
import { assertHarnessReady } from "./ready.ts"

const base = {
  mode: "agent" as const,
  policy: {
    requireWriteApproval: true,
    requireBashApproval: true,
    requireCommitApproval: true
  },
  credentials: { providerApiKey: "" }
}

test("未接线的 DeepSeek 直接拒", () => {
  assert.throws(() => assertHarnessReady({ ...base, adapterId: "deepseek" }), /No Harness/)
})

test("Claude / Codex 缺 Providers key 会拒", () => {
  assert.throws(
    () => assertHarnessReady({ ...base, adapterId: "claude-code", credentials: { providerApiKey: "", vercelToken: "tok" } }),
    /anthropic/i
  )
  assert.throws(
    () => assertHarnessReady({ ...base, adapterId: "codex", credentials: { providerApiKey: "", vercelToken: "tok" } }),
    /openai/i
  )
})

test("桥接适配器缺隔离令牌会拒", () => {
  assert.throws(
    () =>
      assertHarnessReady({
        ...base,
        adapterId: "claude-code",
        credentials: { providerApiKey: "sk-ant" }
      }),
    /isolation token/
  )
})

test("Pi 不强制 key 或 Vercel", () => {
  const adapter = assertHarnessReady({ ...base, adapterId: "pi" })
  assert.equal(adapter.id, "pi")
  assert.equal(adapter.sandboxKind, "just-bash")
})
