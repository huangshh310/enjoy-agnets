/**
 * 闸判断前并入账本身份：任意桌面 / 持久簿不得放行 Terminal、系统设置。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { createSubagentApproval } from "../agents/subagent-approval.ts"
import { resolveToolApproval, type ApprovalPolicy } from "../tool-approval.ts"
import { createObservationLedger, type Observation } from "./observation-ledger.ts"
import { DESKTOP_ACT_ANY_SESSION_KEY } from "./desktop-act-app-key.ts"
import { bindObservationIdentityToDesktopActInput } from "./desktop-act-observation-gate.ts"
import { persistentAlwaysAllowsDesktopAct } from "./desktop-act-policy.ts"

const EDITS: ApprovalPolicy = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const RAW_CLICK = { action: "click", observationId: "obs_term", elementId: "e1" }

function sample(partial: Partial<Observation> & Pick<Observation, "id" | "appName">): Observation {
  return {
    pid: 10,
    windowId: "w",
    elements: [{ id: "e1", role: "AXButton", name: "OK", clickable: true }],
    createdAt: 1_000,
    platform: "darwin",
    ...partial
  }
}

function policyWith(ledger: ReturnType<typeof createObservationLedger>, extra?: Partial<ApprovalPolicy>): ApprovalPolicy {
  return {
    ...EDITS,
    lookupDesktopObservation: (id) => ledger.peek(id),
    ...extra
  }
}

function decide(args: unknown, policy: ApprovalPolicy) {
  return resolveToolApproval("desktop_act", "agent", policy, args)
}

test("任意桌面开着：只给 observationId 的 Terminal 点击仍要 Dock", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_term", appName: "终端", appKey: "com.apple.Terminal" }))
  const policy = policyWith(ledger, { anyDesktopSession: true })
  assert.equal(decide(RAW_CLICK, policy), "user-approval")
})

test("任意桌面开着：系统设置 / 钥匙串观察同样不得跳过 Dock", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_settings", appName: "系统设置", appKey: "com.apple.systempreferences" }))
  ledger.put(sample({ id: "obs_keychain", appName: "钥匙串访问", bundleId: "com.apple.keychainaccess" }))
  const policy = policyWith(ledger, {
    sessionApprovedTools: new Set([DESKTOP_ACT_ANY_SESSION_KEY])
  })
  assert.equal(decide({ action: "click", observationId: "obs_settings", elementId: "e1" }, policy), "user-approval")
  assert.equal(decide({ action: "click", observationId: "obs_keychain", elementId: "e1" }, policy), "user-approval")
})

test("持久簿有 Terminal / 系统设置键：只给观察号仍要 Dock", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_term", appName: "Terminal", bundleId: "com.apple.Terminal" }))
  ledger.put(sample({ id: "obs_settings", appName: "系统设置", appKey: "com.apple.systempreferences" }))
  const policy = policyWith(ledger, {
    desktopAlwaysAllowAppKeys: ["com.apple.Terminal", "com.apple.systempreferences"]
  })
  const termClick = { action: "click", observationId: "obs_term", elementId: "e1" }
  const settingsClick = { action: "click", observationId: "obs_settings", elementId: "e1" }
  assert.equal(decide(termClick, policy), "user-approval")
  assert.equal(decide(settingsClick, policy), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(termClick, policy.desktopAlwaysAllowAppKeys ?? []), false)
})

test("观察身份覆盖模型自报：备忘录字段不能把 Terminal 降级", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  const term = sample({ id: "obs_term", appName: "终端", appKey: "com.apple.Terminal" })
  ledger.put(term)
  const spoofed = {
    action: "click",
    observationId: "obs_term",
    elementId: "e1",
    appName: "备忘录",
    appKey: "com.apple.notes"
  }
  const bound = bindObservationIdentityToDesktopActInput(spoofed, term)
  assert.equal(bound.appName, "终端")
  assert.equal(bound.appKey, "com.apple.Terminal")
  const policy = policyWith(ledger, { anyDesktopSession: true })
  assert.equal(decide(spoofed, policy), "user-approval")
})

test("未知或过期观察号：任意桌面不得当已放行，交给 stale 路径", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample({ id: "obs_old", appName: "终端", appKey: "com.apple.Terminal" }))
  now = 1_100
  const policy = policyWith(ledger, { anyDesktopSession: true })
  assert.equal(decide({ action: "click", observationId: "obs_gone", elementId: "e1" }, policy), "user-approval")
  assert.equal(decide({ action: "click", observationId: "obs_old", elementId: "e1" }, policy), "user-approval")
})

test("非敏感观察 + 任意桌面：只给观察号仍可会话放行", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_notes", appName: "备忘录", appKey: "com.apple.notes" }))
  const policy = policyWith(ledger, { anyDesktopSession: true })
  assert.equal(decide({ action: "click", observationId: "obs_notes", elementId: "e1" }, policy), "approved")
})

test("子 Agent 走同一条闸：Terminal 观察不得因任意桌面自动放行", async () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_term", appName: "终端", appKey: "com.apple.Terminal" }))
  let asked = 0
  const decideSub = createSubagentApproval({
    mode: "agent",
    policy: policyWith(ledger, { anyDesktopSession: true }),
    waitForApproval: async () => {
      asked += 1
      return "deny"
    }
  })
  const decision = await decideSub({
    toolName: "desktop_act",
    toolCallId: "t1",
    input: RAW_CLICK
  })
  assert.equal(asked, 1)
  assert.deepEqual(decision, { type: "denied", reason: "user denied subagent tool." })
})
