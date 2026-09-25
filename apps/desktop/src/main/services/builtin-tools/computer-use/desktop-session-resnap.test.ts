import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { createDesktopSession } from "./desktop-session.ts"
import { clearSecondConfirmMemory, mergeSecondConfirmApprovalArgs } from "./desktop-second-confirm.ts"
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
    dispose() {}
  }
}

test("冻结后墙钟超过 TTL，Allow 仍可点原观察", async () => {
  let now = 1_000
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method, params) => {
        methods.push(method)
        if (method === "snapshot") return { observation: sampleObservation() }
        return { delivery: "background", echoed: params.elementId }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  assert.equal(session.freeze(id), true)
  now = 1_200
  const acted = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(acted.success, true)
  assert.deepEqual(methods.filter((name) => name === "act"), ["act"])
})

test("空账本但审批 args 带目标时走同一条重拍路", async () => {
  const methods: string[] = []
  const session = createDesktopSession(() =>
    fakeHandle((method, params) => {
      methods.push(method)
      if (method === "list_apps") return { apps: [{ pid: 42, name: "Calculator" }] }
      if (method === "snapshot") return { observation: sampleObservation() }
      return { delivery: "background", clicked: params.elementId }
    })
  )
  const resumed = await session.act({
    observationId: "obs_dead",
    action: "click",
    elementId: "0.1",
    elementName: "等于",
    elementRole: "AXButton",
    appName: "Calculator",
    appKey: "calculator",
    pid: 42
  })
  assert.equal(resumed.success, true)
  assert.equal(typeof resumed.observationId, "string")
  assert.notEqual(resumed.observationId, "obs_dead")
  assert.equal(methods.includes("act"), true)
})

test("空账本 resume 显式 stale，不报 success，也不静默点", async () => {
  const methods: string[] = []
  const session = createDesktopSession(() =>
    fakeHandle((method) => {
      methods.push(method)
      if (method === "list_apps") return { apps: [] }
      throw new Error("should not snapshot without a target pid")
    })
  )
  const resumed = await session.act({
    observationId: "obs_dead",
    action: "click",
    elementId: "0.1",
    appName: "Calculator"
  })
  assert.equal(resumed.success, false)
  assert.equal(resumed.code, "stale_observation")
  assert.equal(methods.includes("act"), false)
})

test("stale 后重拍匹配同一 appKey+控件则点新观察", async () => {
  let now = 1_000
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method, params) => {
        methods.push(method)
        if (method === "list_apps") return { apps: [{ pid: 42, name: "Calculator" }] }
        if (method === "snapshot") return { observation: sampleObservation() }
        return { delivery: "background", clicked: params.elementId }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  now = 1_080
  const acted = await session.act({
    observationId: id,
    action: "click",
    elementId: "0.1",
    elementName: "等于",
    elementRole: "AXButton",
    appName: "Calculator",
    appKey: "calculator",
    pid: 42
  })
  assert.equal(acted.success, true)
  assert.notEqual(acted.observationId, id)
  assert.ok(methods.filter((name) => name === "snapshot").length >= 2)
  assert.equal(methods.includes("act"), true)
})

test("重拍控件对不上则二次确认，绝不静默点", async () => {
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
          const id = trees === 1 ? "0.1" : "0.9"
          const thumbnailPath = trees === 1 ? "/thumbs/at-allow.png" : "/thumbs/after-resnap.png"
          return {
            observation: sampleObservation({
              elements: [{ id, role: "AXButton", name, clickable: true }],
              thumbnailPath
            })
          }
        }
        return { delivery: "background" }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  now = 1_080
  const result = await session.act({
    observationId: id,
    action: "click",
    elementId: "0.1",
    elementName: "等于",
    elementRole: "AXButton",
    appName: "Calculator",
    pid: 42
  })
  assert.equal(result.success, false)
  assert.equal(result.code, "needs_second_confirm")
  assert.equal(typeof result.observationId, "string")
  assert.notEqual(result.observationId, id)
  assert.equal(result.previousObservationId, id)
  assert.equal(result.previousThumbnailPath, "/thumbs/at-allow.png")
  assert.equal(result.thumbnailPath, "/thumbs/after-resnap.png")
  assert.equal(methods.includes("act"), false)
  const nextArgs = mergeSecondConfirmApprovalArgs({
    observationId: String(result.observationId),
    action: "click",
    thumbnailPath: result.thumbnailPath
  })
  assert.equal(nextArgs.needsSecondConfirm, true)
  assert.equal(nextArgs.previousThumbnailPath, "/thumbs/at-allow.png")
})

test("同路径 elementId 但名称变了则二次确认，绝不自动点", async () => {
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
          return { observation: sampleObservation({ elements: [{ id: "0.1", role: "AXButton", name, clickable: true }] }) }
        }
        return { delivery: "background" }
      }),
    { now: () => now, ttlMs: 50 }
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  now = 1_080
  const result = await session.act({
    observationId: id,
    action: "click",
    elementId: "0.1",
    elementName: "等于",
    elementRole: "AXButton",
    appName: "Calculator",
    pid: 42
  })
  assert.equal(result.success, false)
  assert.equal(result.code, "needs_second_confirm")
  assert.equal(methods.includes("act"), false)
})
