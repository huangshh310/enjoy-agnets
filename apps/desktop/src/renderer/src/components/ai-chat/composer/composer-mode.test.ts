import assert from "node:assert/strict"
import { test } from "node:test"
import {
  coerceComposerMode,
  modeForLoadedSession,
  modeForNewSession,
  readRememberedDefaultMode,
  rememberDefaultMode,
  runModeForComposer,
  sessionModeAfterSettingsRefresh,
  takeComposerSlash
} from "./composer-mode.ts"

test("设置 refetch 不得把 plan 打回 agent", () => {
  assert.equal(sessionModeAfterSettingsRefresh("plan", "agent"), "plan")
  assert.equal(sessionModeAfterSettingsRefresh("ask", "debug"), "ask")
})

test("新建会话读默认项，隐藏模式收成 agent", () => {
  assert.equal(modeForNewSession("plan"), "plan")
  assert.equal(modeForNewSession("ask"), "ask")
  assert.equal(modeForNewSession("workflow"), "agent")
  assert.equal(modeForNewSession(), "agent")
})

test("记住的默认项给新建会话用，不打 settings.get", () => {
  rememberDefaultMode("ask")
  assert.equal(modeForNewSession(readRememberedDefaultMode()), "ask")
  rememberDefaultMode("workflow")
  assert.equal(modeForNewSession(readRememberedDefaultMode()), "agent")
  rememberDefaultMode("agent")
})

test("隐藏模式收成 agent", () => {
  assert.equal(coerceComposerMode("workflow"), "agent")
  assert.equal(coerceComposerMode("tdd"), "agent")
  assert.equal(coerceComposerMode("code_mode"), "agent")
  assert.equal(coerceComposerMode("plan"), "plan")
  assert.equal(coerceComposerMode("debug"), "debug")
})

test("已有会话不用设置默认项，缺记录回落 agent", () => {
  assert.equal(modeForLoadedSession("plan"), "plan")
  assert.equal(modeForLoadedSession(), "agent")
})

test("ACP 发送强制 agent", () => {
  assert.equal(runModeForComposer("cursor", "ask"), "agent")
  assert.equal(runModeForComposer("enjoy-local", "ask"), "ask")
})

test("句首斜杠切模式并剥掉命令", () => {
  assert.deepEqual(takeComposerSlash("/plan 先画蓝图"), { mode: "plan", text: "先画蓝图" })
  assert.deepEqual(takeComposerSlash("/ask"), { mode: "ask", text: "" })
  assert.deepEqual(takeComposerSlash("普通句子"), { text: "普通句子" })
  assert.deepEqual(takeComposerSlash("/web 搜索"), { text: "/web 搜索" })
})
