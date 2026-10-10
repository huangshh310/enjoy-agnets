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
  assert.match(stage, /pendingApproval\s*\?\s*"min-h-0 overflow-y-auto"\s*:\s*"shrink-0"/)
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
  assert.match(plan, /data-testid="approval-diff"/)
  assert.match(plan, /min-h-40/)
})

test("会话行菜单保持占位并锚到触发钮，文案是加星标", () => {
  const menu = read("ai-chat/sidebar/session-row-menu.tsx")
  const zh = read("../i18n/catalogs/zh/chat.ts")
  const en = read("../i18n/catalogs/en/chat.ts")
  assert.match(menu, /data-testid="session-row-menu"/)
  assert.match(menu, /data-testid="session-row-menu-content"/)
  assert.doesNotMatch(menu, /hidden size-5\.5/)
  assert.match(menu, /opacity-0 group-hover\/session:opacity-100/)
  assert.match(menu, /collisionPadding=\{SESSION_MENU_COLLISION\}/)
  assert.match(menu, /focus-visible:ring-2 focus-visible:ring-border-focus-ring/)
  assert.match(menu, /data-\[pointer-return\]:focus-visible:ring-0/)
  assert.match(menu, /onCloseAutoFocus/)
  assert.match(menu, /applySessionMenuCloseFocus/)
  assert.match(menu, /event\.key !== "Enter" && event\.key !== " "/)
  assert.match(zh, /flagSession: "加星标"/)
  assert.match(en, /flagSession: "Star"/)
  assert.doesNotMatch(menu, /session-row-menu-archive[\s\S]*text-text-secondary/)
  const action = read("ai-chat/sidebar/sidebar-action.tsx")
  assert.match(action, /focus-visible:ring-2 focus-visible:ring-border-focus-ring/)
  assert.match(action, /data-\[pointer-return\]:focus-visible:ring-0/)
  assert.match(action, /dataset\.pointerReturn/)
  const row = read("ai-chat/sidebar/sidebar-session-row.tsx")
  assert.match(row, /title=\{label\}/)
  const policy = read("ai-chat/approval-policy-toggle.tsx")
  assert.match(policy, /chipHintForPolicy\(kind\)/)
  assert.match(policy, /titleCase\(kind, t\)/)
  const header = read("ai-chat/right-pane/views/review/header/review-header.tsx")
  const scope = read("ai-chat/right-pane/views/review/header/review-scope-dropdown.tsx")
  assert.match(header, /whitespace-nowrap/)
  assert.match(header, /shrink-0/)
  assert.match(scope, /whitespace-nowrap/)
  assert.doesNotMatch(scope, /min-w-0 truncate/)
  const drawer = read("settings/settings-side-drawer.tsx")
  assert.match(drawer, /top-9/)
  assert.doesNotMatch(drawer, /fixed inset-0 /)
})

test("审批标题与正文同列对齐，改动条与 Composer 同宽", () => {
  const chrome = read("ai-chat/thread/approval/approval-chrome.tsx")
  const stacked = read("ai-chat/composer/stacked-rail/composer-stacked-styles.ts")
  assert.match(chrome, /flex min-h-0 min-w-0 flex-1 flex-col gap-1\.5 overflow-y-auto/)
  assert.match(chrome, /leading-6 text-text-primary/)
  assert.match(stacked, /flex w-full min-w-0 flex-col/)
  assert.match(stacked, /mb-2/)
  assert.doesNotMatch(stacked, /-mb-px/)
  assert.doesNotMatch(stacked, /border-b-0/)
  assert.doesNotMatch(stacked, /calc\(100%-1\.25rem\)/)
})

test("审查提交底栏类型芯片与推送分行，不共挤一行", () => {
  const dock = read("ai-chat/right-pane/views/review/pr-hero/review-commit-dock.tsx")
  assert.match(dock, /flex min-w-0 flex-col gap-1/)
  assert.match(dock, /CONVENTIONAL_PREFIXES\.map/)
  assert.match(dock, /chat\.reviewPushAction/)
  assert.match(dock, /justify-end gap-1/)
  const chips = dock.indexOf("CONVENTIONAL_PREFIXES.map")
  const actions = dock.indexOf("justify-end gap-1")
  const push = dock.indexOf("chat.reviewPushAction")
  assert.ok(chips >= 0 && actions > chips && push > actions)
})

test("个人资料里程碑标题可折行，不截成省略号", () => {
  const bento = read("account/cards/profile-ecosystem-bento.tsx")
  assert.match(bento, /活跃先锋/)
  assert.match(bento, /百万吞吐/)
  const block = bento.slice(bento.indexOf("活跃先锋") - 120, bento.indexOf("全能调度") + 160)
  assert.match(block, /text-pretty/)
  assert.doesNotMatch(block, /truncate/)
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
