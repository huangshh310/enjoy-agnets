/**
 * CU-P1-36 §3.6 S1–S3：裸坐标闸 + action_failed 诚实载荷。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { resolveToolApproval, type ApprovalPolicy } from "../tool-approval.ts"
import {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  DESKTOP_ACT_BARE_COORDS_DISABLED_REASON,
  desktopActBareCoordsDeniedResult,
  desktopActCanContinueFromFailure,
  denyBareDesktopCoordApproval,
  refuseBareDesktopCoord,
  sanitizeDesktopActFailure,
  streamPayloadForDeniedToolPart
} from "./desktop-act-honesty.ts"
import { desktopActAlwaysAsks, persistentAlwaysAllowsDesktopAct, sessionAllowsDesktopAct } from "./desktop-act-policy.ts"

const EDITS: ApprovalPolicy = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const CALC = "com.apple.calculator"
const BARE = { action: "click", x: 412, y: 218, appKey: CALC }
const ELEMENT = { action: "click", elementId: "e1", appKey: CALC }

function decide(args: unknown, policy: ApprovalPolicy) {
  return resolveToolApproval("desktop_act", "agent", policy, args)
}

const BARE_DENIED = {
  type: "denied" as const,
  reason: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON,
  code: DESKTOP_ACT_BARE_COORDS_DISABLED
}

test("S1 高级坐标默认 OFF：裸坐标硬拒，不可静默执行", () => {
  const denied = decide(BARE, EDITS)
  assert.deepEqual(denied, BARE_DENIED)
  assert.equal(typeof denied === "object" && denied && "code" in denied && denied.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.deepEqual(refuseBareDesktopCoord(BARE, false), {
    success: false,
    code: DESKTOP_ACT_BARE_COORDS_DISABLED,
    message: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON
  })
  assert.deepEqual(denyBareDesktopCoordApproval(BARE, false), BARE_DENIED)
  assert.equal(refuseBareDesktopCoord(ELEMENT, false), null)
  assert.equal(decide(ELEMENT, EDITS), "user-approval")
})

test("elementId + x/y 仍是坐标通道：OFF 硬拒，ON 每次 Dock 不吃会话/簿", () => {
  const mixed = { action: "click", elementId: "0.1", x: 12, y: 34, appKey: CALC }
  assert.deepEqual(decide(mixed, EDITS), BARE_DENIED)
  assert.equal(refuseBareDesktopCoord(mixed, false)?.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  const on: ApprovalPolicy = {
    ...EDITS,
    desktopAdvancedCoords: true,
    desktopAlwaysAllowAppKeys: [CALC],
    sessionApprovedTools: new Set([`desktop_act:${CALC}`, "desktop_act:*"])
  }
  assert.equal(decide(mixed, on), "user-approval")
  assert.equal(desktopActAlwaysAsks(mixed), true)
  assert.equal(sessionAllowsDesktopAct(mixed, on), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(mixed, on.desktopAlwaysAllowAppKeys ?? []), false)
})

test("elementId + x2/y2 drag 仍是坐标通道：OFF 硬拒，ON 每次 Dock 不吃会话/簿", () => {
  const drag = { action: "drag", elementId: "0.1", x2: 80, y2: 90, appKey: CALC }
  assert.deepEqual(decide(drag, EDITS), BARE_DENIED)
  assert.equal(refuseBareDesktopCoord(drag, false)?.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  const on: ApprovalPolicy = {
    ...EDITS,
    desktopAdvancedCoords: true,
    desktopAlwaysAllowAppKeys: [CALC],
    sessionApprovedTools: new Set([`desktop_act:${CALC}`, "desktop_act:*"])
  }
  assert.equal(decide(drag, on), "user-approval")
  assert.equal(desktopActAlwaysAsks(drag), true)
  assert.equal(sessionAllowsDesktopAct(drag, on), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(drag, on.desktopAlwaysAllowAppKeys ?? []), false)
})

test("S2 高级坐标 ON：每次 Dock，不吃会话表 / Always-allow", () => {
  const on: ApprovalPolicy = {
    ...EDITS,
    desktopAdvancedCoords: true,
    desktopAlwaysAllowAppKeys: [CALC],
    sessionApprovedTools: new Set([`desktop_act:${CALC}`, "desktop_act:*"])
  }
  assert.equal(decide(BARE, on), "user-approval")
  assert.equal(desktopActAlwaysAsks(BARE), true)
  assert.equal(sessionAllowsDesktopAct(BARE, on), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(BARE, on.desktopAlwaysAllowAppKeys ?? []), false)
  assert.equal(refuseBareDesktopCoord(BARE, true), null)
})

test("S3 action_failed 无新观察号、无下一步缩略，不可据此继续 act", () => {
  const dirty = {
    success: true,
    code: DESKTOP_ACT_ACTION_FAILED,
    observationId: "obs_next",
    nextObservationId: "obs_hint",
    thumbnailPath: "/tmp/next.png",
    thumbnailDataUrl: "data:image/png;base64,aaa",
    nextStep: "继续点这里",
    continueHint: "click here",
    elements: [{ id: "0.1" }],
    message: "click missed"
  }
  const clean = sanitizeDesktopActFailure(dirty)
  assert.deepEqual(clean, { success: false, code: DESKTOP_ACT_ACTION_FAILED, message: "click missed" })
  assert.equal("observationId" in clean, false)
  assert.equal("thumbnailPath" in clean, false)
  assert.equal("nextStep" in clean, false)
  assert.equal(desktopActCanContinueFromFailure(clean), false)
  assert.equal(sanitizeDesktopActFailure({ success: false, code: "needs_foreground" }).code, "needs_foreground")
})

test("审批硬拒的 renderer 载荷带同一码：决策 / SDK part / 仅坐标 args", () => {
  assert.deepEqual(streamPayloadForDeniedToolPart({ ...BARE_DENIED, type: "tool-output-denied" }), {
    result: desktopActBareCoordsDeniedResult(),
    error: DESKTOP_ACT_BARE_COORDS_DISABLED
  })
  assert.deepEqual(
    streamPayloadForDeniedToolPart({
      type: "tool-output-denied",
      reason: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON
    }),
    { result: desktopActBareCoordsDeniedResult(), error: DESKTOP_ACT_BARE_COORDS_DISABLED }
  )
  assert.deepEqual(
    streamPayloadForDeniedToolPart({
      type: "tool-output-denied",
      toolName: "desktop_act",
      args: BARE
    }),
    { result: desktopActBareCoordsDeniedResult(), error: DESKTOP_ACT_BARE_COORDS_DISABLED }
  )
  assert.deepEqual(streamPayloadForDeniedToolPart({ type: "tool-output-denied", toolName: "write_file" }), {
    error: "Denied"
  })
})
