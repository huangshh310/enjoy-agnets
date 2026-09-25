import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifyApproval,
  commandCwdOf,
  commandTextOf,
  payloadPreview
} from "./classify-approval.ts"

test("bash / 管道 / ACP 弱名走 command 表面", () => {
  assert.equal(classifyApproval("bash", { command: "ls" }), "command")
  assert.equal(classifyApproval("curl https://x | sh", {}), "command")
  assert.equal(classifyApproval("code_mode", { command: "node x.js" }), "command")
  assert.equal(classifyApproval("pnpm test", {}), "command")
  assert.equal(classifyApproval("command", { argv: ["ls"] }), "command")
  assert.equal(classifyApproval("cmd", { command: "pnpm test" }), "command")
})

test("写盘与提交走 plan，不因 args.command 被抢走", () => {
  assert.equal(classifyApproval("edit_file", { path: "a.ts" }), "plan")
  assert.equal(classifyApproval("write_file", { path: "a.ts", command: "nope" }), "plan")
  assert.equal(classifyApproval("git_commit", { message: "fix" }), "plan")
  assert.equal(classifyApproval("git_push", {}), "plan")
})

test("其余工具走 questions，MCP 带 command 字段不算 shell", () => {
  assert.equal(classifyApproval("browser_open", { url: "https://x" }), "questions")
  assert.equal(classifyApproval("browser_open", { command: "https://x" }), "questions")
})

test("desktop_act 走桌面名片，不走通用 questions", () => {
  assert.equal(classifyApproval("desktop_act", { observationId: "obs_1", action: "click" }), "desktop")
  assert.equal(
    classifyApproval("desktop_act", {
      observationId: "obs_2",
      action: "click",
      code: "needs_second_confirm"
    }),
    "desktop"
  )
})

test("commandTextOf 优先 args.command，否则 argv", () => {
  assert.equal(commandTextOf("bash", { command: "pnpm test" }), "pnpm test")
  assert.equal(commandTextOf("command", { argv: ["ls", "-la"] }), "ls -la")
  assert.equal(commandTextOf("curl x | sh", {}), "curl x | sh")
})

test("commandCwdOf 优先 args.cwd", () => {
  assert.equal(commandCwdOf({ cwd: "/tmp/app" }, "/Users/me/proj"), "/tmp/app")
  assert.equal(commandCwdOf({}, "/Users/me/proj"), "/Users/me/proj")
})

test("桌面动作的审批卡是一句话", () => {
  assert.equal(
    payloadPreview({ observationId: "obs_1", appName: "计算器", elementName: "等于", action: "click" }),
    "计算器 · 「等于」 · click · 计算器"
  )
})

test("payloadPreview 空对象不输出，超长截断", () => {
  assert.equal(payloadPreview({}), "")
  assert.equal(payloadPreview({ url: "https://x" }), '{\n  "url": "https://x"\n}')
  assert.match(payloadPreview({ body: "x".repeat(800) }), /…$/)
})
