/**
 * 信任卡不变量：四态诚实、quota 门闩、失败短因、无假条。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"
import {
  formatDoctorRelative,
  formatResetDate,
  resolveTrustHealth,
  resolveTrustUsage,
  shortDoctorReason
} from "./drawer-trust-copy.ts"
import { clearLastDoctor, readLastDoctor, writeLastDoctor } from "./last-doctor.ts"

const tools = zhSettings.agentTools

function t(path: string, vars?: Record<string, string | number>): string {
  const key = path.replace("settings.agentTools.", "") as keyof typeof tools
  const template = tools[key]
  if (typeof template !== "string") return path
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? ""))
}

const failResult = {
  id: "cursor" as const,
  ok: false,
  message: "Not found. Install the CLI and ensure it is on PATH.",
  version: null,
  path: null
}

const passResult = {
  id: "cursor" as const,
  ok: true,
  message: "1.4.0 ACP initialize ok.",
  version: "1.4.0",
  path: "/usr/bin/agent"
}

test("尚未体检不是绿灯，也不写通过", () => {
  const view = resolveTrustHealth({
    checking: false,
    result: null,
    ranAt: null,
    now: 1_000,
    t
  })
  assert.equal(view.kind, "idle")
  assert.equal(view.label, "尚未体检")
  assert.ok(!view.dotClass.includes("success"))
  assert.equal(view.ctaDisabled, false)
})

test("检测中无绿灯、不写通过，CTA 禁用", () => {
  const view = resolveTrustHealth({
    checking: true,
    result: passResult,
    ranAt: 1,
    now: 2,
    t
  })
  assert.equal(view.kind, "checking")
  assert.equal(view.label, "检测中…")
  assert.ok(!view.dotClass.includes("success"))
  assert.ok(view.dotClass.includes("animate-pulse"))
  assert.equal(view.ctaDisabled, true)
})

test("通过行是体检通过 · 相对时间", () => {
  const now = 10 * 60_000
  const view = resolveTrustHealth({
    checking: false,
    result: passResult,
    ranAt: now - 3 * 60_000,
    now,
    t
  })
  assert.equal(view.kind, "pass")
  assert.equal(view.label, "体检通过 · 3 分钟前")
  assert.ok(view.dotClass.includes("success"))
})

test("失败行截成短因，不摊 PATH 原文 / 堆栈", () => {
  const view = resolveTrustHealth({
    checking: false,
    result: {
      ...failResult,
      message: "Handshake timeout\n    at afterConnect\nNot found. ensure it is on PATH."
    },
    ranAt: 1,
    now: 2,
    t
  })
  assert.equal(view.kind, "fail")
  assert.equal(view.label, "体检失败 · 握手超时，PATH 上找不到二进制")
  assert.ok(!view.label.includes("afterConnect"))
  assert.ok(!view.label.includes("ensure it is on PATH"))
  assert.ok(view.dotClass.includes("error"))
})

test("quota=false 不写本月用量，也不给详情", () => {
  const view = resolveTrustUsage({
    quota: false,
    quotaInfo: { hasQuota: true, usedPercent: 53 },
    t
  })
  assert.equal(view.kind, "empty")
  assert.equal(view.label, "该助手无公开额度")
  assert.equal(view.showDetail, false)
  assert.ok(!view.label.includes("本月用量"))
})

test("quota=true 且官方数字才写本月用量 · 重置", () => {
  const resetAt = new Date(2026, 8, 30).getTime()
  const view = resolveTrustUsage({
    quota: true,
    quotaInfo: {
      hasQuota: true,
      usedPercent: 53.4,
      windows: [
        {
          id: "month",
          name: "monthly",
          displayName: "Monthly",
          usedPercent: 53.4,
          windowType: "monthly",
          resetAt
        }
      ]
    },
    t
  })
  assert.equal(view.kind, "monthly")
  assert.equal(formatResetDate(resetAt), "9/30")
  assert.equal(view.label, "本月用量 53% · 重置 9/30")
  assert.equal(view.showDetail, true)
})

test("quota=true 但无数则诚实空态，不回落 0%", () => {
  const view = resolveTrustUsage({
    quota: true,
    quotaInfo: { hasQuota: true, windowType: "Included" },
    t
  })
  assert.equal(view.kind, "empty")
  assert.equal(view.label, "该助手无公开额度")
  assert.equal(view.showDetail, false)
})

test("相对时间分档", () => {
  const now = 10 * DAY_MS()
  assert.equal(formatDoctorRelative(now - 20_000, now, t), "刚刚")
  assert.equal(formatDoctorRelative(now - 3 * 60_000, now, t), "3 分钟前")
  assert.equal(formatDoctorRelative(now - 2 * 60 * 60_000, now, t), "2 小时前")
})

test("失败短因不回环境异常 / doctor 原文", () => {
  assert.equal(shortDoctorReason("Unknown agent tool.", t), "体检未通过")
  assert.ok(!shortDoctorReason("ACP initialize failed: boom", t).includes("ACP"))
})

test("本会话体检缓存按 id 读写，可清空", () => {
  clearLastDoctor()
  writeLastDoctor("cursor", passResult, 42)
  assert.deepEqual(readLastDoctor("cursor"), { result: passResult, ranAt: 42 })
  assert.equal(readLastDoctor("claude"), null)
  clearLastDoctor("cursor")
  assert.equal(readLastDoctor("cursor"), null)
})

function DAY_MS(): number {
  return 24 * 60 * 60_000
}
