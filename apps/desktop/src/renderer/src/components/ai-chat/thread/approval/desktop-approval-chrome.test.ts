/**
 * CU-P1-P 审批铬：默认本会话、去掉始终允许 featured、敏感警示不是「已拦截」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))

test("始终允许不再 featured：无加粗、无蓝环默认", () => {
  const choices = readFileSync(join(ROOT, "desktop-approval-choices.tsx"), "utf8")
  const choice = readFileSync(join(ROOT, "desktop-approval-choice.ts"), "utf8")
  assert.doesNotMatch(choices, /featured/)
  assert.doesNotMatch(choices, /font-semibold/)
  assert.doesNotMatch(choices, /ring-accent/)
  assert.match(choice, /allow_session/)
  assert.doesNotMatch(choice, /allow_always" \? "allow_always"/)
})

test("敏感警示钉 SoT 文案，不是已拦截", () => {
  const card = readFileSync(join(ROOT, "desktop-approval-card.tsx"), "utf8")
  const args = readFileSync(join(ROOT, "desktop-approval-args.ts"), "utf8")
  assert.match(card, /desktop-approval-sensitive/)
  assert.match(card, /desktopSensitiveWarn/)
  assert.match(args, /flag !== false/)
  assert.doesNotMatch(args, /row\.sensitive === true/)
  assert.equal(zhChat.desktopSensitiveWarn, "这是敏感应用，每次都会问你")
  assert.doesNotMatch(zhChat.desktopSensitiveWarn, /已拦截/)
  assert.doesNotMatch(enChat.desktopSensitiveWarn, /blocked|intercepted|已拦截/i)
  assert.match(enChat.desktopSensitiveWarn, /sensitive/i)
})

test("testid 仍挂在四选一选项上", () => {
  const choices = readFileSync(join(ROOT, "desktop-approval-choices.tsx"), "utf8")
  const choice = readFileSync(join(ROOT, "desktop-approval-choice.ts"), "utf8")
  assert.match(choice, /approval-allow/)
  assert.match(choice, /approval-session/)
  assert.match(choice, /approval-always-app/)
  assert.match(choice, /approval-deny/)
  assert.match(choices, /desktopApprovalChoiceTestId/)
  assert.match(choices, /desktopApprovalStruckTestId/)
  assert.match(choice, /-struck/)
})
