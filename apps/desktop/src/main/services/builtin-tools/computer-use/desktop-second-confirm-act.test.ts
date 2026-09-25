/**
 * 二次确认 act 路径：确认后只点新观察；缺图诚实失败。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { sessionAllowsDesktopAct } from "@enjoy-agents/agent-core/computer-use"
import { createDesktopSession } from "./desktop-session.ts"
import { clearSecondConfirmMemory } from "./desktop-second-confirm.ts"
import type { ExecutorHandle } from "./executor-client.ts"

beforeEach(() => {
  clearSecondConfirmMemory()
})

function sampleObservation(overrides: Record<string, unknown> = {}) {
  return {
    id: "obs_local",
    pid: 42,
    windowId: "42",
    appName: "Calculator",
    elements: [{ id: "0.1", role: "AXButton", name: "等于", clickable: true }],
    createdAt: 0,
    platform: "darwin",
    ...overrides
  }
}

function fakeHandle(onCall: (method: string, params: Record<string, unknown>) => unknown): ExecutorHandle {
  return {
    request: async (method, params) => onCall(method, params),
    dispose() {},
    cancelInFlight() {}
  }
}

function clickTarget(observationId: string, elementId: string, elementName: string) {
  return {
    observationId,
    action: "click" as const,
    elementId,
    elementName,
    elementRole: "AXButton",
    appName: "Calculator",
    pid: 42
  }
}

test("二次确认后只点新观察，不点旧号", async () => {
  let now = 1_000
  let trees = 0
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method, params) => {
        methods.push(method)
        if (method === "list_apps") return { apps: [{ pid: 42, name: "Calculator" }] }
        if (method === "snapshot") {
          trees += 1
          const name = trees === 1 ? "等于" : "清除"
          const id = trees === 1 ? "0.1" : "0.9"
          const thumbnailPath = trees === 1 ? "/thumbs/at-allow.png" : "/thumbs/after-resnap.png"
          return {
            observation: sampleObservation({
              elements: [{ id, role: "AXButton", name, clickable: true }],
              thumbnailPath
            })
          }
        }
        return { delivery: "background", clicked: params.elementId }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  const oldId = String(snap.observationId)
  now = 1_080
  const confirm = await session.act(clickTarget(oldId, "0.1", "等于"))
  assert.equal(confirm.code, "needs_second_confirm")
  const replayOld = await session.act(clickTarget(oldId, "0.1", "等于"))
  assert.equal(replayOld.success, false)
  assert.equal(replayOld.code, "needs_second_confirm")
  assert.equal(methods.includes("act"), false)
  const acted = await session.act(clickTarget(String(confirm.observationId), "0.9", "清除"))
  assert.equal(acted.success, true)
  assert.notEqual(acted.observationId, oldId)
  assert.equal(methods.includes("act"), true)
})

test("二次确认缺缩略图则诚实失败，不静默点", async () => {
  let now = 1_000
  let trees = 0
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method) => {
        methods.push(method)
        if (method === "list_apps") return { apps: [{ pid: 42, name: "Calculator" }] }
        if (method === "snapshot") {
          trees += 1
          const name = trees === 1 ? "等于" : "清除"
          return {
            observation: sampleObservation({
              elements: [{ id: trees === 1 ? "0.1" : "0.9", role: "AXButton", name, clickable: true }]
            })
          }
        }
        return { delivery: "background" }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  now = 1_080
  const confirm = await session.act(clickTarget(String(snap.observationId), "0.1", "等于"))
  assert.equal(confirm.code, "needs_second_confirm")
  const refused = await session.act(clickTarget(String(confirm.observationId), "0.9", "清除"))
  assert.equal(refused.success, false)
  assert.equal(refused.code, "screenshot_unavailable")
  assert.equal(methods.includes("act"), false)
})

test("会话已允许 appKey 时二次确认仍停车，禁止直接 act", async () => {
  let now = 1_000
  let trees = 0
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method, params) => {
        methods.push(method)
        if (method === "list_apps") return { apps: [{ pid: 42, name: "Calculator" }] }
        if (method === "snapshot") {
          trees += 1
          const name = trees === 1 ? "等于" : "清除"
          const id = trees === 1 ? "0.1" : "0.9"
          return {
            observation: sampleObservation({
              elements: [{ id, role: "AXButton", name, clickable: true }],
              thumbnailPath: trees === 1 ? "/thumbs/at-allow.png" : "/thumbs/after-resnap.png"
            })
          }
        }
        return { delivery: "background", clicked: params.elementId }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  now = 1_080
  const confirm = await session.act(clickTarget(String(snap.observationId), "0.1", "等于"))
  assert.equal(confirm.code, "needs_second_confirm")
  assert.equal(methods.includes("act"), false)

  const nextInput = {
    ...clickTarget(String(confirm.observationId), "0.9", "清除"),
    appKey: "com.apple.calculator"
  }
  const allowed = {
    requireWriteApproval: true,
    requireBashApproval: true,
    requireCommitApproval: true,
    sessionApprovedTools: new Set(["desktop_act:com.apple.calculator", "desktop_act:*"])
  }
  assert.equal(sessionAllowsDesktopAct(nextInput, allowed), false)
  assert.equal(methods.includes("act"), false)
})
