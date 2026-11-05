/**
 * P2 快捷键统一派发 soft · 源码不变式（leo Must×5 tip 自核）
 * Review j/k 迁入登记表；侧栏搜索徽章跟解析表；tinykeys 可选不上；零扩张。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

test("Must1 · Review 命令已登记；hotkeys 不再自比 j/k；catalog 人话挂 views", () => {
  const contract = read("packages/ipc-contract/src/keybindings.ts")
  assert.match(contract, /"review\.file\.next"/)
  assert.match(contract, /"review\.file\.prev"/)
  assert.match(contract, /key:\s*"j",\s*command:\s*"review\.file\.next"/)
  assert.match(contract, /key:\s*"k",\s*command:\s*"review\.file\.prev"/)

  const hotkeys = read(
    "apps/desktop/src/renderer/src/components/ai-chat/right-pane/views/review/use-review-hotkeys.ts"
  )
  assert.match(hotkeys, /useKeybindingCommand\("review\.file\.next"/)
  assert.match(hotkeys, /useKeybindingCommand\("review\.file\.prev"/)
  assert.doesNotMatch(hotkeys, /event\.key\s*!==\s*"j"/)
  assert.doesNotMatch(hotkeys, /addEventListener\("keydown"/)
  assert.doesNotMatch(hotkeys, /window\.addEventListener/)

  const catalog = read(
    "apps/desktop/src/renderer/src/components/settings/keybindings/keybinding-catalog.ts"
  )
  assert.match(
    catalog,
    /command:\s*"review\.file\.next"[\s\S]*?category:\s*"views"/
  )
  assert.match(
    catalog,
    /command:\s*"review\.file\.prev"[\s\S]*?category:\s*"views"/
  )
  assert.match(catalog, /settings\.shortcuts\.reviewFileNext/)
  assert.match(catalog, /settings\.shortcuts\.reviewFilePrev/)
})

test("Must1b · 侧栏搜索徽章跟 resolveKeybindings(search.quick)，无硬编码 mod+l", () => {
  const sidebar = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-sidebar.tsx")
  assert.match(sidebar, /resolveKeybindings/)
  assert.match(sidebar, /search\.quick/)
  assert.doesNotMatch(sidebar, /QUICK_SEARCH_CHORD/)
  assert.doesNotMatch(sidebar, /"mod\+l"/)
})

test("Must2 · permission-cycle / Queue·Steer 语义路径未被本刀改写", () => {
  const cycle = read(
    "apps/desktop/src/renderer/src/components/ai-chat/use-permission-cycle-hotkey.ts"
  )
  assert.match(cycle, /useKeybindingCommand\("chat\.permission\.cycle"/)
  assert.doesNotMatch(cycle, /review\.file\./)

  const composer = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/mentions/composer-input.tsx"
  )
  // Enter→queue / ⌘·Ctrl+Enter→steer 仍在 Composer 局部（本刀明确不迁）
  assert.match(composer, /onKeyDown/)
  assert.doesNotMatch(composer, /review\.file\./)
})

test("Must3 · tinykeys 未上库（可选引擎-only · 不上亦 ACCEPT）；设置 IA 三组不动", () => {
  const pkg = read("apps/desktop/package.json")
  const rootPkg = read("package.json")
  assert.doesNotMatch(pkg, /"tinykeys"/)
  assert.doesNotMatch(rootPkg, /"tinykeys"/)

  const shortcuts = read(
    "apps/desktop/src/renderer/src/components/settings/settings-shortcuts.tsx"
  )
  assert.match(shortcuts, /\(\["global", "views", "chat"\] as const\)/)
  assert.match(shortcuts, /sessionApplyHint/)
  assert.match(shortcuts, /settings\.shortcuts\.fixedHint/)
  assert.doesNotMatch(shortcuts, /tinykeys/)
  assert.doesNotMatch(shortcuts, /全面/)
})

test("Must4/5 · 零扩张诚实文案；禁营销空成功；hub 主句未改", () => {
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/settings.ts")
  assert.match(zh, /reviewFileNext:\s*"审查：下一个文件"/)
  assert.match(zh, /reviewFilePrev:\s*"审查：上一个文件"/)
  assert.match(zh, /sessionApplyHint:\s*"在这里改过的快捷键，回到会话会马上生效。"/)
  assert.match(zh, /hubTitle:\s*"键盘快捷键目录"/)
  assert.match(
    zh,
    /hubDesc:\s*"搜索、录制、加一条或删掉。对话里的快捷键表和快速搜索读的是同一份结果。"/
  )
  assert.match(zh, /fixedHint:\s*"发送、换行和粘贴仍由输入框处理，不在这张表里。"/)
  assert.doesNotMatch(zh, /全面 tinykeys|快捷键大重构|性能大升级|快捷键系统重构/)

  const dispatcher = read(
    "apps/desktop/src/renderer/src/components/settings/keybindings/use-keybinding-dispatcher.ts"
  )
  assert.match(dispatcher, /chordFromKeyboardEvent/)
  assert.doesNotMatch(dispatcher, /tinykeys/)
})
