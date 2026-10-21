/**
 * 失败卡 P2（main 侧，真临时库 + 真 vault）：
 * - luna P2-1：run.error 带上这一轮实际走的引擎 / 档案（Enjoy 本地 = 开跑那份档案，免密钥 Ollama 也带；
 *   ACP 绑了档案带绑的那份、没绑只带引擎），渲染端失败卡跟它走，不再按默认路线猜。
 * - jojo #169 P3：结构化 401 → 「这份档案密钥被拒」先推给渲染端（缓存快照上改那一项），再发 run.error；
 *   卡一出现「能不能发」就已是被拒，不等整张快照重算。别的档案的 401 不改默认路线那份的校验态。
 */
import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

process.env.ENJOY_E2E_STUB = "1"
process.env.ENJOY_E2E_USERDATA ||= mkdtempSync(join(tmpdir(), "enjoy-failcard-"))

const L = await import("./failcard-p2.behavior.load.ts")
const electron = await import("electron")

type Sent = { channel: string; payload: Record<string, any> }
const sent: Sent[] = []
const win = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: (channel: string, payload: unknown) => void sent.push({ channel, payload: payload as Record<string, any> }) }
} as unknown as BrowserWindow
;(electron.BrowserWindow as unknown as { getAllWindows: () => unknown[] }).getAllWindows = () => [win]

const rejected = () => Object.assign(new Error("401"), { status: 401 })
const unreachable = () => Object.assign(new Error("connect ECONNREFUSED 127.0.0.1"), { code: "ECONNREFUSED" })

const db = L.getDatabase()
db.prepare("INSERT OR IGNORE INTO workspaces (id,name,root_path,created_at,updated_at) VALUES (?,?,?,?,?)").run("ws_fc", "ws", "/tmp", 1, 1)

const profile = (id: string, name: string, kind: string, apiKey: string, baseURL = "") =>
  ({ id, name, kind, apiKey, baseURL, modelId: "m", enabled: true }) as never
await L.writeVault({
  activeId: "prv_openai",
  profiles: [
    profile("prv_gw", "My Gateway", "custom", "sk-gw", "https://gw.example.net/v1"),
    profile("prv_openai", "Work key A", "openai", "sk-openai"),
    profile("prv_ollama", "E2E Stub", "ollama", "")
  ]
} as never)
const ids = (await L.readVault()).profiles.map((row) => row.id)
assert.deepEqual(ids, ["prv_gw", "prv_openai", "prv_ollama"])
const gateway = { id: "prv_gw" }
const openai = { id: "prv_openai" }
const ollama = { id: "prv_ollama" }

let n = 0
function hold(runtimeId: string, extra: Record<string, unknown> = {}) {
  n += 1
  const sid = `ses_fc_${n}`
  const runId = `run_fc_${n}`
  db.prepare("INSERT INTO sessions (id,workspace_id,title,created_at,updated_at,workflow_status) VALUES (?,?,?,?,?,?)").run(sid, "ws_fc", "t", 1, 1, "todo")
  L.insertRun(db, { id: runId, sessionId: sid, workspaceId: "ws_fc", kind: "agent", status: "running", modelId: "m", providerId: null, checkpoint: null, error: null })
  L.holdAgentRun({
    runId,
    window: win,
    input: { sessionId: sid, workspaceId: "ws_fc", messages: [{ role: "user", content: "q" }], runtimeId } as never,
    workspaceRoot: "/tmp",
    messages: [],
    ...extra
  } as never)
  const run = L.getActiveRun(runId)
  assert.ok(run)
  return { run, runId }
}
const runError = (runId: string) => sent.find((e) => e.channel === "agent.event" && e.payload.type === "run.error" && e.payload.runId === runId)?.payload

function cachedReadiness(profileId?: string) {
  return {
    ready: true,
    engineCount: 7,
    engines: [],
    localModels: [],
    apiKeys: [
      { kind: "api_key", providerId: gateway.id, presetId: "custom" },
      { kind: "api_key", providerId: openai.id, presetId: "openai" }
    ],
    defaultRoute: { runtimeId: "enjoy-local", modelId: "gpt", ...(profileId ? { profileId } : {}) },
    hasEnjoySecret: true,
    secretStorageAvailable: true,
    credentialCheck: { state: "ok" }
  } as never
}

test("P2-1：Enjoy 本地 OpenAI 那一轮 401 → run.error 带 runtimeId=enjoy-local、providerId=开跑那份（不是列表第一份 My Gateway）", async () => {
  const { run, runId } = hold("enjoy-local", { secret: { apiKey: "sk-openai" }, profileId: openai.id })
  sent.length = 0
  await L.failAgentPump(runId, run, rejected())
  const err = runError(runId)
  assert.ok(err)
  assert.equal(err.code, "credential_invalid")
  assert.equal(err.runtimeId, "enjoy-local")
  assert.equal(err.providerId, openai.id)
})

test("P2-1：免密钥 Ollama 那一轮（连不上）也带它的档案 id——渲染端才能说 Ollama、不给改密钥", async () => {
  const { run, runId } = hold("enjoy-local", { secret: { apiKey: "" }, profileId: ollama.id })
  sent.length = 0
  await L.failAgentPump(runId, run, unreachable())
  const err = runError(runId)
  assert.equal(err?.code, "provider_unreachable")
  assert.equal(err?.runtimeId, "enjoy-local")
  assert.equal(err?.providerId, ollama.id)
})

test("P2-1：Amp 绑了档案 → 带绑的那份；没绑 → 只带引擎，不带聊天档案", async () => {
  L.setSetting("agentTools.overrides", JSON.stringify({ amp: { useCustomProvider: true, providerId: gateway.id } }))
  const bound = hold("amp")
  sent.length = 0
  await L.failAgentPump(bound.runId, bound.run, rejected())
  assert.equal(runError(bound.runId)?.runtimeId, "amp")
  assert.equal(runError(bound.runId)?.providerId, gateway.id)
  L.setSetting("agentTools.overrides", JSON.stringify({ amp: { useCustomProvider: false, providerId: gateway.id } }))
  const loose = hold("amp")
  sent.length = 0
  await L.failAgentPump(loose.runId, loose.run, rejected())
  assert.equal(runError(loose.runId)?.runtimeId, "amp")
  assert.equal(runError(loose.runId)?.providerId, undefined)
  L.setSetting("agentTools.overrides", "{}")
})

test("jojo P3：401 后「密钥被拒」先推到渲染端（只改缓存快照那一项、ready 落 false），排在 run.error 之前", async () => {
  L.readiness.setCachedChatReadinessForTest?.(cachedReadiness(openai.id))
  const { run, runId } = hold("enjoy-local", { secret: { apiKey: "sk-openai" }, profileId: openai.id })
  sent.length = 0
  await L.failAgentPump(runId, run, rejected())
  const errAt = sent.findIndex((e) => e.channel === "agent.event" && e.payload.type === "run.error")
  const pushAt = sent.findIndex((e) => e.channel === "chat.readiness")
  assert.ok(errAt >= 0, "run.error 发了")
  assert.ok(pushAt >= 0 && pushAt < errAt, `「能不能发」先刷新再出卡（push=${pushAt} error=${errAt}）`)
  const push = sent[pushAt]!.payload
  assert.equal(push.credentialCheck.state, "invalid")
  assert.equal(push.ready, false)
  assert.equal(push.engineCount, 7, "缓存快照上改，不是重算出来的另一张")
  assert.equal(L.readiness.peekCachedChatReadiness()?.credentialCheck?.state, "invalid", "main 缓存同步改掉")
})

test("jojo P3 对照：别的档案（不是默认路线那份）401 不改默认路线的校验态", async () => {
  L.readiness.setCachedChatReadinessForTest?.(cachedReadiness(openai.id))
  const { run, runId } = hold("enjoy-local", { secret: { apiKey: "sk-gw" }, profileId: gateway.id })
  sent.length = 0
  await L.failAgentPump(runId, run, rejected())
  const errAt = sent.findIndex((e) => e.channel === "agent.event" && e.payload.type === "run.error")
  const before = sent.slice(0, errAt).filter((e) => e.channel === "chat.readiness")
  assert.deepEqual(before.map((e) => e.payload.credentialCheck?.state), [], "默认路线那份没被改成被拒")
  assert.equal(L.readiness.peekCachedChatReadiness()?.credentialCheck?.state, "ok")
})
