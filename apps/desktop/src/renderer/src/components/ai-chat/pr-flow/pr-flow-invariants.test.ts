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
