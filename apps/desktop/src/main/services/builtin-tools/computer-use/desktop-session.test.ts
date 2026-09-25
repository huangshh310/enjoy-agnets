import assert from "node:assert/strict"
import test from "node:test"
import { createDesktopSession, type ActInput } from "./desktop-session.ts"
import { ExecutorFailure, type ExecutorHandle } from "./executor-client.ts"

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

test("过期或用过的观察不会把 act 送给执行器", async () => {
  const methods: string[] = []
  const session = createDesktopSession(() =>
    fakeHandle((method, params) => {
      methods.push(method)
      if (method === "snapshot") return { observation: sampleObservation() }
      return { delivery: "background", echoed: params.elementId }
    })
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  const first = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(first.success, true)
  const second = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(second.success, false)
  assert.equal(second.code, "stale_observation")
  assert.deepEqual(methods.filter((name) => name === "act"), ["act"])
})

test("needs_foreground 把观察还回去，允许前台后再点", async () => {
  const session = createDesktopSession(() =>
    fakeHandle((method, params) => {
      if (method === "snapshot") return { observation: sampleObservation() }
      if (params.allowForeground) return { delivery: "foreground" }
      throw new ExecutorFailure("needs_foreground", "Wayland")
    })
  )
  const snap = await session.snapshot(42)
  const id = String(snap.observationId)
  const blocked = await session.act({ observationId: id, action: "click", elementId: "0.1" })
  assert.equal(blocked.code, "needs_foreground")
  const retry: ActInput = { observationId: id, action: "click", elementId: "0.1", allowForeground: true }
  const again = await session.act(retry)
  assert.equal(again.success, true)
  assert.equal(again.delivery, "foreground")
  assert.equal(typeof again.observationId, "string")
  assert.notEqual(again.observationId, id)
})

test("成功动作后签发新观察，并把账本里的控件名交给执行器", async () => {
  let seenName = ""
  const session = createDesktopSession(() =>
    fakeHandle((method, params) => {
      if (method === "snapshot") return { observation: sampleObservation() }
      seenName = String(params.elementName ?? "")
      return { delivery: "background" }
    })
  )
  const snap = await session.snapshot(42)
  const acted = await session.act({
    observationId: String(snap.observationId),
    action: "click",
    elementId: "0.1",
    elementName: "模型瞎写"
  })
  assert.equal(seenName, "等于")
  assert.equal(acted.success, true)
  assert.equal(typeof acted.observationId, "string")
  assert.notEqual(acted.observationId, snap.observationId)
})

test("deliverAct 无论成败都成对调用 onAct / onActEnd", async () => {
  const marks: string[] = []
  const session = createDesktopSession(
    () =>
      fakeHandle((method) => {
        if (method === "snapshot") return { observation: sampleObservation() }
        throw new ExecutorFailure("permission_denied", "AX")
      }),
    {
      onAct: () => marks.push("begin"),
      onActEnd: () => marks.push("end")
    }
  )
  const snap = await session.snapshot(42)
  const acted = await session.act({
    observationId: String(snap.observationId),
    action: "click",
    elementId: "0.1"
  })
  assert.equal(acted.success, false)
  assert.deepEqual(marks, ["begin", "end"])
})
