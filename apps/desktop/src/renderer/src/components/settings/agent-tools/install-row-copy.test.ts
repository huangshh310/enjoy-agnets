/**
 * 安装失败只给人话短因，不回 npm 原文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { formatInstallFailLine, installRowPhase, mapInstallFailReason } from "./install-row-copy.ts"

function t(path: string, vars?: Record<string, string | number>): string {
  if (path === "settings.agentTools.installFailPrefix") return `未装上：${vars?.reason ?? ""}`
  if (path === "settings.agentTools.installFailTimeout") return "网络超时，可重试或复制命令手动装"
  if (path === "settings.agentTools.installFailPermission") return "权限不足，请在终端用复制的命令安装"
  if (path === "settings.agentTools.installFailManager") return "本机没有 npm 或 brew"
  if (path === "settings.agentTools.installFailGeneric") return "安装未完成，可重试或复制命令手动装"
  if (path === "settings.agentTools.installFailUnsupported") return "命令不在白名单，请改用支持的助手程序"
  return path
}

test("安装中优先于失败缓存", () => {
  assert.equal(installRowPhase({ ready: false, busy: "install", installError: "Exit 1" }), "installing")
  assert.equal(installRowPhase({ ready: false, busy: null, installError: "Exit 1" }), "failed")
  assert.equal(installRowPhase({ ready: true, busy: null, installError: "Exit 1" }), "idle")
})

test("超时 / 权限 / 缺包管理器收成短因", () => {
  assert.equal(mapInstallFailReason("Timed out.", t), "网络超时，可重试或复制命令手动装")
  assert.equal(mapInstallFailReason("npm ERR! code EACCES", t), "权限不足，请在终端用复制的命令安装")
  assert.equal(mapInstallFailReason("Need npm or brew on PATH, or run: npm i -g x", t), "本机没有 npm 或 brew")
})

test("失败行是一行人话，不含堆栈", () => {
  const line = formatInstallFailLine("npm ERR! code ETIMEDOUT\n    at afterConnect", t)
  assert.equal(line, "未装上：网络超时，可重试或复制命令手动装")
  assert.ok(!line.includes("at afterConnect"))
  assert.ok(!line.includes("ETIMEDOUT"))
})

test("白名单拒绝收成短因，不摊 Basename / spawn", () => {
  const line = formatInstallFailLine("Refusing to spawn 'bash'. Basename must be a known ACP CLI.", t)
  assert.equal(line, "未装上：命令不在白名单，请改用支持的助手程序")
  assert.doesNotMatch(line, /Basename|spawn|bash/i)
})
