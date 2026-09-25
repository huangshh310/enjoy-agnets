/**
 * CU-P1-36 §3.6：执行面 S1 / S3 / S4。高级坐标默认关；失败不附新观察。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { DESKTOP_ACT_BARE_COORDS_DISABLED } from "@enjoy-agents/agent-core/computer-use"
import { createDesktopSession } from "./desktop-session.ts"
import type { ExecutorHandle } from "./executor-client.ts"

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

test("共享会话读 prefs.desktopAdvancedCoords，默认不当 true", () => {
  const src = readFileSync(new URL("./desktop-tools.ts", import.meta.url), "utf8")
  assert.match(src, /advancedCoords: \(\) => readPreferences\(\)\.desktopAdvancedCoords === true/)
})

test("S1 高级坐标 OFF：裸坐标 click 硬拒，执行器收不到 act", async () => {
  const methods: string[] = []
  const session = createDesktopSession(() =>
    fakeHandle((method) => {
      methods.push(method)
      if (method === "snapshot") return { observation: sampleObservation() }
      return { delivery: "background" }
    })
  )
  const snap = await session.snapshot(42)
  const refused = await session.act({
    observationId: String(snap.observationId),
    action: "click",
    x: 412,
    y: 218
  })
  assert.equal(refused.success, false)
  assert.equal(refused.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.equal(methods.includes("act"), false)
  const ok = await session.act({
    observationId: String(snap.observationId),
    action: "click",
    elementId: "0.1"
  })
  assert.equal(ok.success, true)
})

test("S2 高级坐标 ON：裸坐标会送到执行器（审批仍每次 Dock）", async () => {
  const methods: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method) => {
        methods.push(method)
        if (method === "snapshot") return { observation: sampleObservation() }
        return { delivery: "background" }
      }),
    { advancedCoords: () => true }
  )
  const snap = await session.snapshot(42)
  const acted = await session.act({
    observationId: String(snap.observationId),
    action: "click",
    x: 412,
    y: 218
  })
  assert.equal(acted.success, true)
  assert.equal(methods.includes("act"), true)
})

test("S3/S4 action_failed 不附新观察；再点必须重拍", async () => {
  let trees = 0
  let failOnce = true
  const session = createDesktopSession(() =>
    fakeHandle((method) => {
      if (method === "snapshot") {
        trees += 1
        return { observation: sampleObservation({ id: `obs_${trees}` }) }
      }
      if (failOnce) {
        failOnce = false
        return {
          success: false,
          code: "action_failed",
          observationId: "obs_fake_next",
          thumbnailPath: "/tmp/next.png",
          nextStep: "继续点这里"
        }
      }
      return { delivery: "background" }
    })
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  const failed = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(failed.success, false)
  assert.equal(failed.code, "action_failed")
  assert.equal(failed.observationId, undefined)
  assert.equal(failed.thumbnailPath, undefined)
  assert.equal(failed.nextStep, undefined)
  const replay = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(replay.success, false)
  assert.equal(replay.code, "stale_observation")
  const next = await session.snapshot(42)
  assert.notEqual(next.observationId, id)
  const again = await session.act({
    observationId: String(next.observationId),
    action: "click",
    elementId: "0.1"
  })
  assert.equal(again.success, true)
  assert.equal(typeof again.observationId, "string")
  assert.notEqual(again.observationId, next.observationId)
  assert.ok(trees >= 2)
})
