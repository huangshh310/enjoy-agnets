import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifyOfficialLoginReason,
  formatOfficialLoginFailLine
} from "./official-login-reason.ts"

const t = (key: string, vars?: Record<string, string | number>) => {
  const copy: Record<string, string> = {
    "settings.agentTools.loginFailPrefix": "未登录上：{reason}",
    "settings.agentTools.loginFailTimeout": "授权超时，可重试或换浏览器完成",
    "settings.agentTools.loginFailMissing": "本机没有这个 CLI",
    "settings.agentTools.loginFailGeneric": "没能完成官方登录，可重试"
  }
  let text = copy[key] ?? key
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

test("超时 / 未安装 / 泛化收成一行人话", () => {
  assert.equal(classifyOfficialLoginReason("callback_timeout"), "timeout")
  assert.equal(classifyOfficialLoginReason("Install cursor first."), "missing")
  assert.equal(classifyOfficialLoginReason("failed"), "generic")
  assert.equal(
    formatOfficialLoginFailLine("callback_timeout", t),
    "未登录上：授权超时，可重试或换浏览器完成"
  )
})

test("禁止把 Oh My Pi / 堆栈当失败原因", () => {
  const line = formatOfficialLoginFailLine("Error: ENOENT\n    at spawn", t)
  assert.equal(line.startsWith("未登录上："), true)
  assert.ok(!line.includes("Oh My Pi"))
  assert.ok(!line.includes("ENOENT"))
  assert.ok(!line.includes("at spawn"))
})
