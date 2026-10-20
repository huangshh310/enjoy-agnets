import assert from "node:assert/strict"
import { test } from "node:test"
import { acpListRemoteArgs, acpListSpawnOverride, acpListSpawnPlan } from "./acp-session-import-override.ts"
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

const customRecord = {
  command: "/opt/bin/acp-agent",
  args: ["--stdio"],
  env: { FAKE_TOKEN: "t" },
  modelId: "m1",
  enabled: true
}

test("luna -71：自定义助手列本机会话读它自己入库的 command / args / env / cwd，不读预置覆盖", () => {
  const plan = acpListSpawnPlan({
    runtimeId: "custom:my-acp",
    isCustom: true,
    presetOverride: { binaryPath: "/wrong/preset" },
    custom: customRecord,
    customCwd: "/custom/cwd",
    workspaceRoot: "/ws",
    workspaceIsSsh: false
  })
  assert.deepEqual(plan, {
    kind: "spawn",
    cwd: "/custom/cwd",
    override: { binaryPath: "/opt/bin/acp-agent", extraArgs: ["--stdio"], modelId: "m1" },
    env: { FAKE_TOKEN: "t" }
  })
})

test("自定义助手：没设工作目录用工作区根；停用 / 找不到不列；远程工作区给人话", () => {
  const base = { runtimeId: "custom:x", isCustom: true, workspaceRoot: "/ws", workspaceIsSsh: false }
  const plan = acpListSpawnPlan({ ...base, custom: { ...customRecord, modelId: undefined } })
  assert.equal(plan.kind === "spawn" && plan.cwd, "/ws")
  assert.deepEqual(plan.kind === "spawn" && plan.override, { binaryPath: "/opt/bin/acp-agent", extraArgs: ["--stdio"] })
  assert.deepEqual(acpListSpawnPlan({ ...base, custom: { ...customRecord, enabled: false } }), { kind: "unsupported" })
  assert.deepEqual(acpListSpawnPlan({ ...base, custom: undefined }), { kind: "unsupported" })
  assert.deepEqual(acpListSpawnPlan({ ...base, custom: customRecord, workspaceIsSsh: true }), {
    kind: "unsupported",
    error: "自定义助手暂不支持远程工作区"
  })
})

test("预置引擎照旧读引擎覆盖、工作区根", () => {
  assert.deepEqual(
    acpListSpawnPlan({
      runtimeId: "amp",
      isCustom: false,
      presetOverride: { binaryPath: "/usr/local/bin/amp", extraArgs: ["-x"] },
      workspaceRoot: "/ws",
      workspaceIsSsh: false
    }),
    { kind: "spawn", cwd: "/ws", override: { binaryPath: "/usr/local/bin/amp", extraArgs: ["-x"], modelId: undefined } }
  )
})

// 接线：listImportableAcpSessions 加载 agent-harness（node:test strip-only 载不动），只能读源码断言它按 runtimeId 取自定义助手。
// 行为由 e2e acp-import-isolation.spec.ts 覆盖（自定义假助手真列出会话并导入）。
test("接线：listImportableAcpSessions 走 acpListSpawnPlan，自定义助手取 getCustomAgent + resolveCustomCwd，env 传给 spawn", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./acp-session-import.ts", import.meta.url), "utf8")
  assert.match(src, /isCustom \? getCustomAgent\(runtimeId\)/)
  assert.match(src, /resolveCustomCwd\(custom, workspace\.rootPath\)/)
  assert.match(src, /acpListSpawnPlan\(\{/)
  assert.match(src, /listAcpRemoteSessions\(acpListRemoteArgs\(runtimeId, plan\)\)/)
})

test("leo #160：自定义助手 spawn 计划 → listAcpRemoteSessions 入参：env / cwd / command / args 原样带上", () => {
  const plan = acpListSpawnPlan({
    runtimeId: "custom:fake",
    isCustom: true,
    custom: customRecord,
    customCwd: "/custom/cwd",
    workspaceRoot: "/ws",
    workspaceIsSsh: false
  })
  assert.equal(plan.kind, "spawn")
  if (plan.kind !== "spawn") return
  assert.deepEqual(acpListRemoteArgs("custom:fake", plan), {
    id: "custom:fake",
    cwd: "/custom/cwd",
    override: { binaryPath: customRecord.command, extraArgs: customRecord.args, ...(customRecord.modelId ? { modelId: customRecord.modelId } : {}) },
    env: { FAKE_TOKEN: "t" }
  })
})

test("leo #160：预置引擎 / 空 env 不带 env 键；cwd 是工作区根", () => {
  const preset = acpListSpawnPlan({ runtimeId: "amp", isCustom: false, workspaceRoot: "/ws", workspaceIsSsh: false })
  assert.equal(preset.kind, "spawn")
  if (preset.kind !== "spawn") return
  const args = acpListRemoteArgs("amp", preset)
  assert.equal(args.cwd, "/ws")
  assert.equal(args.id, "amp")
  assert.ok(!("env" in args))
  const empty = acpListSpawnPlan({ runtimeId: "custom:fake", isCustom: true, custom: { ...customRecord, env: {} }, workspaceRoot: "/ws", workspaceIsSsh: false })
  if (empty.kind !== "spawn") return assert.fail("应能起进程")
  assert.ok(!("env" in acpListRemoteArgs("custom:fake", empty)))
})
