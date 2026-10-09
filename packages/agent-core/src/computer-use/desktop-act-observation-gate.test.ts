/**
 * 闸判断前并入账本身份：任意桌面 / 持久簿不得放行 Terminal、系统设置。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { createSubagentApproval } from "../agents/subagent-approval.ts"
import { resolveToolApproval, type ApprovalPolicy } from "../tool-approval.ts"
import { createObservationLedger, type Observation } from "./observation-ledger.ts"
import { DESKTOP_ACT_ANY_SESSION_KEY } from "./desktop-act-app-key.ts"
import { persistentAlwaysAllowsDesktopAct, sessionAllowsDesktopAct } from "./desktop-act-policy.ts"
import {
  clearAllConversationDesktopAllows,
  snapshotConversationDesktopAllow,
  writeThroughDesktopActSessionAllow
} from "./conversation-desktop-allow.ts"
import {
  bindObservationIdentityToDesktopActInput,
  desktopGrantShouldPersist,
  prepareDesktopActGateInput
} from "./desktop-act-observation-gate.ts"

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

test("任意桌面开着：未知 observationId 直接 Dock", () => {
  const ledger = createObservationLedger({ now: () => 1_000 })
  const unknown = { action: "click", observationId: "obs_unknown", elementId: "e1" }
  const anyDesktop = policyWith(ledger, { anyDesktopSession: true })
  const book = policyWith(ledger, { desktopAlwaysAllowAppKeys: ["com.apple.notes"] })
  assert.equal(decide(unknown, anyDesktop), "user-approval")
  assert.equal(decide(unknown, book), "user-approval")
  const prepared = prepareDesktopActGateInput(unknown, (id) => ledger.peek(id))
  assert.equal(sessionAllowsDesktopAct(prepared, anyDesktop), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(prepared, ["com.apple.notes"]), false)
  assert.equal(desktopGrantShouldPersist(unknown, (id) => ledger.peek(id)), false)
})

test("任意桌面开着：过期 observationId 同样直接 Dock", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample({ id: "obs_old", appName: "终端", appKey: "com.apple.Terminal" }))
  now = 1_100
  const policy = policyWith(ledger, { anyDesktopSession: true })
  const expired = { action: "click", observationId: "obs_old", elementId: "e1" }
  assert.equal(decide(expired, policy), "user-approval")
  const prepared = prepareDesktopActGateInput(expired, (id) => ledger.peek(id))
  assert.equal(sessionAllowsDesktopAct(prepared, policy), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(prepared, ["com.apple.Terminal"]), false)
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

test("allow_session / allow_always 敏感 act 只当一次允许，会话表与簿都不写", () => {
  clearAllConversationDesktopAllows()
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_term", appName: "终端", appKey: "com.apple.Terminal" }))
  ledger.put(sample({ id: "obs_settings", appName: "系统设置", appKey: "com.apple.systempreferences" }))
  const lookup = (id: string) => ledger.peek(id)
  const rawTerm = { action: "click", observationId: "obs_term", elementId: "e1" }
  const rawSettings = { action: "click", observationId: "obs_settings", elementId: "e1" }
  assert.equal(desktopGrantShouldPersist(rawTerm, lookup), false)
  assert.equal(desktopGrantShouldPersist(rawSettings, lookup), false)

  const sessionTools = new Set<string>()
  if (desktopGrantShouldPersist(rawTerm, lookup)) {
    writeThroughDesktopActSessionAllow("sess_a", sessionTools, rawTerm)
  }
  if (desktopGrantShouldPersist(rawSettings, lookup)) {
    writeThroughDesktopActSessionAllow("sess_a", sessionTools, rawSettings)
  }
  assert.equal(sessionTools.size, 0)
  assert.equal(snapshotConversationDesktopAllow("sess_a").size, 0)
  assert.equal(persistentAlwaysAllowsDesktopAct(prepareForBook(rawTerm, lookup), ["com.apple.Terminal"]), false)
})

test("allow_session 普通观察仍可写会话表", () => {
  clearAllConversationDesktopAllows()
  const ledger = createObservationLedger({ now: () => 1_000 })
  ledger.put(sample({ id: "obs_notes", appName: "备忘录", appKey: "com.apple.notes" }))
  const lookup = (id: string) => ledger.peek(id)
  const raw = { action: "click", observationId: "obs_notes", elementId: "e1" }
  assert.equal(desktopGrantShouldPersist(raw, lookup), true)
  const sessionTools = new Set<string>()
  writeThroughDesktopActSessionAllow("sess_a", sessionTools, prepareForBook(raw, lookup))
  assert.equal(sessionTools.has("desktop_act:com.apple.notes"), true)
  assert.equal(snapshotConversationDesktopAllow("sess_a").has("desktop_act:com.apple.notes"), true)
})

function prepareForBook(
  args: Record<string, unknown>,
  lookup: (id: string) => Observation | null
) {
  return prepareDesktopActGateInput(args, lookup)
}
