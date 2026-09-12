/**
 * P0-E 视觉锁：过旧 / 不兼容永不绿灯就绪。真源 p0-e-cli-outdated.html。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-e-cli-outdated.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("p0-e-cli-outdated.html 必须在仓内（PR #31 / 4d33f07）")
}

const preview = readPreviewHtml()
const files = {
  assistant: readFileSync(join(dir, "../agent-tool-row-assistant.tsx"), "utf8"),
  actions: readFileSync(join(dir, "../agent-tool-row-actions.tsx"), "utf8"),
  row: readFileSync(join(dir, "../agent-tool-row.tsx"), "utf8"),
  secondary: readFileSync(join(dir, "../list-secondary.ts"), "utf8"),
  power: readFileSync(join(dir, "../power-source/power-source-capsule.tsx"), "utf8"),
  strip: readFileSync(join(dir, "../drawer-trust/drawer-trust-strip.tsx"), "utf8"),
  readiness: readFileSync(join(dir, "../../../ai-chat/agent-picker/engine-readiness.ts"), "utf8"),
  guard: readFileSync(join(dir, "../../../../hooks/runtime-interact/send-composer-guard.ts"), "utf8")
}

test("预览真源仍在仓内，且过旧四锁在", () => {
  assert.ok(preview.includes("【视觉真源】P0-E"))
  assert.ok(preview.includes("需更新 · v1.2（要 ≥1.5）"))
  assert.ok(preview.includes("官方登录 · 已登录"))
  assert.ok(preview.includes("版本过旧 · 当前 v1.2 · 需要 ≥1.5"))
  assert.ok(preview.includes("查看更新说明"))
  assert.ok(preview.includes("复制更新命令"))
  assert.ok(preview.includes("请先更新本机助手"))
  assert.ok(preview.includes("设为主引擎"))
  assert.ok(preview.includes("grid-cols-[1.2fr_1.4fr_8.75rem]"))
  assert.ok(preview.includes("不用"))
  assert.ok(preview.includes("立即升级 / 自动强制"))
  assert.ok(!preview.includes("progressbar"))
})

test("中文词表与预览同文，不用协议行话", () => {
  const tools = zhSettings.agentTools
  assert.equal(tools.listOutdatedStatus, "需更新")
  assert.equal(tools.listOutdatedBadge, "需更新")
  assert.equal(tools.listOutdatedSecondary, "需更新 · {current}（要 ≥{required}）")
  assert.equal(tools.trustOutdated, "版本过旧 · 当前 {current} · 需要 ≥{required}")
  assert.equal(tools.trustViewUpdateDocs, "查看更新说明")
  assert.equal(tools.trustCopyUpdateCmd, "复制更新命令")
  assert.equal(zhChat.needCliOutdatedTitle, "请先更新本机助手")
  assert.equal(zhChat.needCliOutdatedHint, "当前 {current}，需要 ≥{required}。更新后再发送。")
  assert.doesNotMatch(tools.trustOutdated, /ACP|stdio|RPC|handshake/i)
  assert.doesNotMatch(zhChat.needCliOutdatedTitle, /ACP|stdio|RPC/i)
})

test("英文词表不用 protocol / force upgrade", () => {
  const tools = enSettings.agentTools
  assert.equal(tools.listOutdatedStatus, "Needs update")
  assert.equal(tools.trustViewUpdateDocs, "View update notes")
  assert.equal(tools.trustCopyUpdateCmd, "Copy update command")
  assert.equal(enChat.needCliOutdatedTitle, "Update this local assistant first")
  assert.doesNotMatch(tools.trustOutdated, /ACP|stdio|RPC/i)
  assert.doesNotMatch(enChat.needCliOutdatedHint, /force|ACP/i)
})

test("密表过旧：警告点 + 次行例外 + 旁标 + 主槽禁用", () => {
  assert.ok(files.assistant.includes("outdatedAssistantStatus"))
  assert.ok(files.assistant.includes("isCliOutdated"))
  assert.ok(files.secondary.includes("formatOutdatedSecondary"))
  assert.ok(files.actions.includes("isCliOutdated"))
  assert.ok(files.actions.includes("makeActive"))
  assert.ok(files.actions.includes("disabled"))
  assert.ok(files.power.includes("listOutdatedBadge"))
  assert.ok(files.row.includes("outdated={isCliOutdated(tool)}"))
  assert.ok(!files.assistant.includes("role=\"progressbar\""))
})

test("过旧 ≠ ready：发送闸与 bind 都拦", () => {
  assert.ok(files.readiness.includes('"outdated"'))
  assert.ok(files.readiness.includes("compat === \"outdated\""))
  assert.ok(files.guard.includes("NEED_CLI_OUTDATED"))
  assert.ok(files.guard.includes('kind === "outdated"'))
})

test("抽屉过旧 CTA 是说明 / 复制，不自动强制升级", () => {
  assert.ok(files.strip.includes("trustViewUpdateDocs"))
  assert.ok(files.strip.includes("trustCopyUpdateCmd"))
  assert.ok(files.strip.includes("openDocs"))
  assert.ok(files.strip.includes("copyInstallCmd"))
  assert.ok(!files.strip.includes("立即升级"))
  assert.ok(!files.strip.includes("forceUpgrade"))
})
