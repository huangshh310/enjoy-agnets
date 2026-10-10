import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { acpListSpawnOverride } from "./acp-session-import-override.ts"
import { projectListedAcpSessions } from "./acp-session-import-project.ts"
import { acpSessionListFailedCopy } from "../../renderer/src/components/ai-chat/agent-picker/acp-session-import-copy.ts"
import { zhChat } from "../../renderer/src/i18n/catalogs/zh/chat.ts"
import { enChat } from "../../renderer/src/i18n/catalogs/en/chat.ts"

function listCopy(locale: "zh" | "en"): string {
  return acpSessionListFailedCopy(() =>
    locale === "en" ? enChat.importAcpListFailed : zhChat.importAcpListFailed
  )
}

test("未广告 list 不带 error", () => {
  assert.deepEqual(
    projectListedAcpSessions({
      supported: false,
      sessions: [{ sessionId: "a", cwd: "/ws" }],
      imported: new Set(),
      cwd: "/ws"
    }),
    { supported: false, sessions: [] }
  )
})

test("只投影本工作区，并标已导入", () => {
  const result = projectListedAcpSessions({
    supported: true,
    sessions: [
      { sessionId: "a", title: "hi", cwd: "/ws" },
      { sessionId: "b", title: "other", cwd: "/other" }
    ],
    imported: new Set(["a"]),
    cwd: "/ws"
  })
  assert.equal(result.supported, true)
  assert.deepEqual(result.sessions, [{ sessionId: "a", title: "hi", updatedAt: undefined, imported: true }])
})

test("spawn 失败仍 supported，带 error", () => {
  const result = projectListedAcpSessions({
    supported: true,
    sessions: [],
    imported: new Set(),
    cwd: "/ws",
    error: "spawn grok failed"
  })
  assert.deepEqual(result, { supported: true, sessions: [], error: "spawn grok failed" })
})

test("没写过覆盖时不读 modelId；缺字段会话不崩，界面走人话", () => {
  assert.deepEqual(acpListSpawnOverride(undefined), {
    extraArgs: undefined,
    modelId: undefined
  })
  const listed = projectListedAcpSessions({
    supported: true,
    sessions: [
      undefined,
      { title: "orphan" },
      { sessionId: "no-cwd", cwd: undefined },
      { sessionId: "ok", title: "kept", cwd: "/ws" }
    ],
    imported: new Set(),
    cwd: "/ws",
    error: "Cannot read properties of undefined (reading 'modelId')"
  })
  assert.deepEqual(listed.sessions, [
    { sessionId: "ok", title: "kept", updatedAt: undefined, imported: false }
  ])
  const zh = listCopy("zh")
  const en = listCopy("en")
  assert.equal(zh, "暂时读不到这个引擎的本机会话")
  assert.equal(en, "Can't read this engine's local sessions right now.")
  assert.doesNotMatch(zh, /Cannot read|TypeError|modelId|undefined/)
  assert.doesNotMatch(en, /Cannot read|TypeError|modelId|undefined/)
})

test("列会话失败把原文打到 main 日志，不进界面", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "acp-session-import.ts"), "utf8")
  assert.match(src, /console\.warn\("agentTools\.listAcpSessions failed"/)
})
