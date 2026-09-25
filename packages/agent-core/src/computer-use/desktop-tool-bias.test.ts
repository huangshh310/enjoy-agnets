/**
 * B1–B4：工具序偏置、Explore 不偏、无稳 key 不写簿、闸不变。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { resolveToolApproval, type ApprovalPolicy } from "../tool-approval.ts"
import {
  applyDesktopToolOrder,
  formatDesktopBiasInstruction,
  sanitizeDesktopMentionBias
} from "./desktop-tool-bias.ts"

const TOOLS = {
  read_file: 1,
  bash: 2,
  desktop_list_apps: 3,
  desktop_act: 4
}

const EDITS: ApprovalPolicy = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

test("B1 Execute + @桌面：desktop_* 提前；首次 act 仍要审批", () => {
  const ordered = applyDesktopToolOrder(TOOLS, { kind: "host" }, "agent")
  assert.deepEqual(Object.keys(ordered), ["desktop_list_apps", "desktop_act", "read_file", "bash"])
  assert.equal(formatDesktopBiasInstruction({ kind: "host" }, "agent"), HOST_LINE())
  assert.ok(formatDesktopBiasInstruction({ kind: "host" }, "agent").length < 120)
  assert.equal(
    resolveToolApproval("desktop_act", "agent", EDITS, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator"
    }),
    "user-approval"
  )
})

test("B2 Execute + 稳 appKey：指令点名该键；点别的 app 仍再批", () => {
  const bias = {
    kind: "app" as const,
    displayName: "计算器",
    appKey: "com.apple.calculator",
    stable: true
  }
  assert.match(formatDesktopBiasInstruction(bias, "agent"), /com\.apple\.calculator/)
  const session = {
    ...EDITS,
    sessionApprovedTools: new Set(["desktop_act:com.apple.calculator"])
  }
  assert.equal(
    resolveToolApproval("desktop_act", "agent", session, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator"
    }),
    "approved"
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", session, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.Notes"
    }),
    "user-approval"
  )
})

test("B3 Explore + mention：不重排、不写偏置句", () => {
  assert.deepEqual(Object.keys(applyDesktopToolOrder(TOOLS, { kind: "host" }, "plan")), Object.keys(TOOLS))
  assert.deepEqual(Object.keys(applyDesktopToolOrder(TOOLS, { kind: "host" }, "ask")), Object.keys(TOOLS))
  assert.equal(formatDesktopBiasInstruction({ kind: "host" }, "plan"), "")
  assert.equal(formatDesktopBiasInstruction({ kind: "host" }, "ask"), "")
})

test("B4 无稳 key / pid 不当 Always-allow 键", () => {
  assert.deepEqual(
    sanitizeDesktopMentionBias({
      kind: "app",
      displayName: "未识别窗口",
      appKey: "18422",
      stable: true
    }),
    { kind: "app", displayName: "未识别窗口", appKey: "", stable: false }
  )
  assert.deepEqual(
    sanitizeDesktopMentionBias({
      kind: "app",
      displayName: "未识别窗口",
      appKey: "",
      stable: false
    }),
    { kind: "app", displayName: "未识别窗口", appKey: "", stable: false }
  )
  assert.equal(
    formatDesktopBiasInstruction(
      { kind: "app", displayName: "未识别窗口", appKey: "18422", stable: true },
      "agent"
    ),
    HOST_LINE()
  )
})

test("无 desktop_* 时不改工具表；无 bias 不重排", () => {
  const coding = { read_file: 1, bash: 2 }
  assert.equal(applyDesktopToolOrder(coding, { kind: "host" }, "agent"), coding)
  assert.equal(applyDesktopToolOrder(TOOLS, undefined, "agent"), TOOLS)
})

test("偏置模块不写会话表 / 持久簿", () => {
  const src = readFileSync(fileURLToPath(new URL("./desktop-tool-bias.ts", import.meta.url)), "utf8")
  assert.doesNotMatch(src, /rememberDesktopAlwaysAllow/)
  assert.doesNotMatch(src, /desktopAlwaysAllowAppKeys/)
  assert.doesNotMatch(src, /grantConversationDesktopAllow/)
  assert.match(src, /Mentions do not skip approval/)
})

test("createCodingAgent 接线：工具序 + 一行指令，不改 toolApproval", () => {
  const src = readFileSync(fileURLToPath(new URL("../agent.ts", import.meta.url)), "utf8")
  assert.match(src, /applyDesktopToolOrder\(tools, options\.desktopBias, mode\)/)
  assert.match(src, /formatDesktopBiasInstruction\(options\.desktopBias, mode\)/)
  assert.match(src, /resolveToolApproval\(toolCall\.toolName, mode, policy, toolCall\.input\)/)
})

function HOST_LINE(): string {
  return "Prefer desktop_* tools this turn. Mentions do not skip approval."
}
