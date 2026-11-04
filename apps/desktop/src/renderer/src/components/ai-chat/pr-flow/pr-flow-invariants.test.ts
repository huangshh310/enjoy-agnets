/**
 * P2 切片① UI 不变量：次级钮、确认卡、连接卡诚实路径。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("Must#6：ReviewCommitDock 挂 OpenPrActions，不改 gitCommit/gitPush 语义", () => {
  const dock = readFileSync(
    join(dir, "../right-pane/views/review/pr-hero/review-commit-dock.tsx"),
    "utf8"
  )
  assert.match(dock, /OpenPrActions/)
  assert.match(dock, /onCommit/)
  assert.match(dock, /onPush/)
  assert.match(dock, /review-push/)
})

test("tip A：连接卡复制 gh auth login，不做应用内 PAT/OAuth", () => {
  const card = readFileSync(join(dir, "connect-github-card.tsx"), "utf8")
  assert.match(card, /gh auth login/)
  assert.match(card, /GH_AUTH_CMD/)
  // 禁应用内令牌输入框 / OAuth device 流控件
  assert.doesNotMatch(card, /type=["']password["']|client_secret|device_code|oauth\/authorize/i)
})

test("Must#2：确认卡主钮才触发 onConfirm，无静默 create", () => {
  const dlg = readFileSync(join(dir, "open-pr-confirm-dialog.tsx"), "utf8")
  assert.match(dlg, /open-pr-confirm/)
  assert.match(dlg, /onConfirm/)
  // 确认卡本身不调 IPC；create 只在 OpenPrActions 确认回调里
  assert.doesNotMatch(dlg, /getIde\(\)|workspace\.prCreate/)
})

test("Must#1/#4：盯检查只走 main 只读 IPC；禁 renderer gh/token/setInterval", () => {
  const chip = readFileSync(join(dir, "attached-pr-chip.tsx"), "utf8")
  const hook = readFileSync(join(dir, "use-pr-babysit.ts"), "utf8")
  assert.match(hook, /prBabysitStart|prBabysitStatus/)
  assert.doesNotMatch(chip, /\bgh\b|setInterval|Authorization|github_pat|octokit/i)
  assert.doesNotMatch(hook, /setInterval|Authorization|github_pat|octokit/i)
  assert.doesNotMatch(hook, /prCreate|prMerge|gitPush/)
})

test("Must#2：开/停盯须确认卡；禁静默开盯", () => {
  const dlg = readFileSync(join(dir, "babysit-confirm-dialog.tsx"), "utf8")
  const chip = readFileSync(join(dir, "attached-pr-chip.tsx"), "utf8")
  assert.match(dlg, /babysit-start-confirm/)
  assert.match(dlg, /babysit-stop-confirm/)
  assert.match(dlg, /prBabysitStartAction/)
  assert.match(dlg, /prBabysitStopAction/)
  assert.match(chip, /BabysitStartConfirmDialog/)
  assert.match(chip, /BabysitStopConfirmDialog/)
  // 开盯只在确认回调 onConfirmStart；菜单第一下只 setStartOpen
  assert.match(chip, /async function onConfirmStart/)
  assert.match(chip, /setStartOpen\(true\)/)
  assert.doesNotMatch(chip, /onClick=\{[\s\S]*?await start\(/)
})

test("Must#6：主芯片仍开 URL；⋯开菜单；同簇「盯着中」pill；禁 +N 塞盯", () => {
  const chip = readFileSync(join(dir, "attached-pr-chip.tsx"), "utf8")
  assert.match(chip, /requestOpenExternalQuiet/)
  assert.match(chip, /attached-pr-overflow/)
  assert.match(chip, /attached-pr-watching-pill/)
  assert.match(chip, /prBabysitWatching/)
  // +N 面板无盯动作
  const extrasBlock = chip.slice(chip.indexOf("attached-pr-extras"))
  assert.doesNotMatch(extrasBlock, /prBabysitStart|startBabysit|帮我盯/)
})

test("Must#7：用户面禁 babysit / watch_pull_request 主标签", () => {
  const zh = readFileSync(
    join(dir, "../../../i18n/catalogs/zh/chat.ts"),
    "utf8"
  )
  // 人话键值
  assert.match(zh, /帮我盯这个 PR/)
  assert.match(zh, /盯着中/)
  assert.match(zh, /停止盯/)
  assert.doesNotMatch(zh, /["']babysit["']|["']watch_pull_request["']|["']forge["']/)
})
