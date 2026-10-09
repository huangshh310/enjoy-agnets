/**
 * luna #120 must-fix：审批时对话 ≥200px，改动条让位，空截图不占位，菜单锚在行上。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const renderer = join(dir, "../..")

function read(rel: string) {
  return readFileSync(join(renderer, rel), "utf8")
}

test("审批时对话列保底 200px，不再用 min(240px,40%)", () => {
  const stage = read("app-shell/chat/chat-stage.tsx")
  assert.match(stage, /data-testid="chat-conversation"/)
  assert.match(stage, /pendingApproval && "min-h-52"/)
  assert.doesNotMatch(stage, /min\(240px,40%\)/)
  assert.match(stage, /pendingApproval \? "min-h-0 overflow-y-auto" : "shrink-0"/)
})

test("Dock 不再限高内滚，空截图不占位，改动条在审批时让位", () => {
  const dock = read("ai-chat/attention/permission-dock.tsx")
  const thumb = read("ai-chat/thread/approval/desktop-approval-card.tsx")
  const frame = read("ai-chat/composer/stacked-rail/composer-activity-frame.tsx")
  const plan = read("ai-chat/thread/approval/approval-plan-body.tsx")
  assert.match(dock, /data-testid="permission-dock"/)
  assert.doesNotMatch(dock, /max-h-\[min\(60%/)
  assert.match(thumb, /if \(!src \|\| !frame\.show\) return null/)
  assert.match(frame, /pendingApproval \? null : <ComposerLiveChanges/)
  assert.match(plan, /useState\(false\)/)
})

test("会话行菜单保持占位并锚到触发钮，文案是加星标", () => {
  const menu = read("ai-chat/sidebar/session-row-menu.tsx")
  const zh = read("../i18n/catalogs/zh/chat.ts")
  const en = read("../i18n/catalogs/en/chat.ts")
  assert.match(menu, /data-testid="session-row-menu"/)
  assert.match(menu, /data-testid="session-row-menu-content"/)
  assert.doesNotMatch(menu, /hidden size-5\.5/)
  assert.match(menu, /opacity-0 group-hover\/session:opacity-100/)
  assert.match(menu, /collisionPadding=\{\{ top: 44/)
  assert.match(zh, /flagSession: "加星标"/)
  assert.match(en, /flagSession: "Star"/)
})

test("任务栏标题走 displaySessionTitle，选中应用仍画操作提示", () => {
  const title = read("app-shell/chat/use-taskbar-title.ts")
  const bias = read("ai-chat/composer/mentions/desktop/composer-desktop-bias-bar.tsx")
  const schedule = read("automations/components/schedule-fields.tsx")
  const meter = read("ai-chat/usage/session-meter.tsx")
  const chip = read("ai-chat/attention/attention-chip.tsx")
  assert.match(title, /displaySessionTitle\(sessionTitle, t\("chat\.newAgent"\)\)/)
  assert.match(bias, /t\("chat\.desktopBiasHostHint"\)/)
  assert.doesNotMatch(bias, /execute && !caption \? null/)
  assert.match(schedule, /parsed\.preset === preset/)
  assert.doesNotMatch(schedule, /!advanced && parsed\.preset === preset/)
  assert.match(meter, /formatTokens\(stats\.usedTokens\)/)
  assert.doesNotMatch(meter, /chat\.tokenUnit/)
  assert.match(chip, /min-w-32/)
  assert.match(chip, /attention\.kind\.\$\{item\.kind\}/)
})
