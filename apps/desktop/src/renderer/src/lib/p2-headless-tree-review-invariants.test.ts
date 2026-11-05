/**
 * P2 Review 文件树 headless-tree soft · 源码不变式（leo Must×5 tip 自核）
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

const fileTreeDir =
  "apps/desktop/src/renderer/src/components/ai-chat/right-pane/views/review/file-tree"

test("Must1 · Review file-tree 壳走 @headless-tree/react；props 契约保留", () => {
  const tree = read(fileTreeDir, "review-file-tree.tsx")
  const item = read(fileTreeDir, "file-tree-item.tsx")
  assert.match(tree, /from "@headless-tree\/react"/)
  assert.match(tree, /useTree/)
  assert.match(tree, /from "@headless-tree\/core"/)
  assert.match(tree, /syncDataLoaderFeature/)
  assert.match(tree, /hotkeysCoreFeature/)
  assert.match(tree, /changes:\s*ChangedFileRow\[\]/)
  assert.match(tree, /selectedFilePath:\s*string\s*\|\s*null/)
  assert.match(tree, /onSelectFile:\s*\(path:\s*string\)\s*=>\s*void/)
  assert.match(tree, /onStage\?/)
  assert.match(tree, /buildFileTree/)
  assert.match(tree, /listedStagePaths/)
  assert.match(tree, /reviewFilterFiles/)
  assert.match(tree, /reviewNoMatchingFiles/)
  assert.match(tree, /review-file-list-empty/)
  assert.match(item, /ItemInstance/)
  assert.match(item, /STATUS_CONFIG/)
  assert.match(item, /StageToggle|StageMark/)
  assert.match(item, /ring-2 ring-inset ring-accent\/35/)

  const pkg = read("apps/desktop/package.json")
  assert.match(pkg, /"@headless-tree\/react":\s*"catalog:"/)
  assert.match(pkg, /"@headless-tree\/core":\s*"catalog:"/)
  const ws = read("pnpm-workspace.yaml")
  assert.match(ws, /"@headless-tree\/react":\s*1\.8\.0/)
  assert.match(ws, /"@headless-tree\/core":\s*1\.8\.0/)
})

test("Must2 · 键盘可感且不砸 #219：树内不绑 j/k；登记表默认 j/k 仍在", () => {
  const tree = read(fileTreeDir, "review-file-tree.tsx")
  assert.match(tree, /hotkeysCoreFeature/)
  assert.match(tree, /customActivateEnter/)
  assert.match(tree, /customActivateSpace/)
  assert.match(tree, /hotkey:\s*"Enter"/)
  assert.match(tree, /hotkey:\s*"Space"/)
  // 树源不得自比 / 自绑 j/k
  assert.doesNotMatch(tree, /hotkey:\s*"KeyJ"|hotkey:\s*"KeyK"|hotkey:\s*"j"|hotkey:\s*"k"/)
  assert.doesNotMatch(tree, /event\.key\s*===\s*["']j["']|event\.key\s*===\s*["']k["']/)
  assert.doesNotMatch(itemHasJkBind(), /./) // placeholder no-op via helper below

  const contract = read("packages/ipc-contract/src/keybindings.ts")
  assert.match(contract, /key:\s*"j",\s*command:\s*"review\.file\.next"/)
  assert.match(contract, /key:\s*"k",\s*command:\s*"review\.file\.prev"/)
  assert.match(contract, /when:\s*"!inputFocus"/)

  const hotkeys = read(
    "apps/desktop/src/renderer/src/components/ai-chat/right-pane/views/review/use-review-hotkeys.ts"
  )
  assert.match(hotkeys, /useKeybindingCommand\("review\.file\.next"/)
  assert.match(hotkeys, /useKeybindingCommand\("review\.file\.prev"/)
})

function itemHasJkBind(): string {
  const item = read(fileTreeDir, "file-tree-item.tsx")
  assert.doesNotMatch(item, /hotkey:\s*"KeyJ"|KeyK|event\.key\s*===\s*["']j["']/)
  return ""
}

test("Must3 · 选中 ↔ Diff：仍经 onSelectFile；高亮跟 selectedFilePath / sameReviewPath", () => {
  const tree = read(fileTreeDir, "review-file-tree.tsx")
  const item = read(fileTreeDir, "file-tree-item.tsx")
  assert.match(tree, /onPrimaryAction/)
  assert.match(tree, /onSelectFile\(node\.path\)/)
  assert.match(item, /sameReviewPath\(node\.path,\s*selectedFilePath\)/)
  assert.match(item, /bg-accent-500\/12/)
  // 禁另起选中状态机：不引入 selectionFeature 作真源
  assert.doesNotMatch(tree, /selectionFeature/)
  assert.doesNotMatch(tree, /setSelectedItems/)
})

test("Must4 · 零扩张：不碰 Files 树 / Diff pierre / 第二 virtua / 事件批", () => {
  const tree = read(fileTreeDir, "review-file-tree.tsx")
  const item = read(fileTreeDir, "file-tree-item.tsx")
  assert.doesNotMatch(tree, /files-tree|from ".*views\/files/)
  assert.doesNotMatch(item, /files-tree/)
  assert.doesNotMatch(tree, /@pierre\/diffs|pierre-diff/)
  assert.doesNotMatch(tree, /\bvirtua\b|VList|Virtualizer/)
  assert.doesNotMatch(item, /\bvirtua\b/)
  assert.doesNotMatch(tree, /event.?batch|applyStreamEvent/i)
  assert.doesNotMatch(tree, /\bI3\b|ink\/|tunnel/)

  // Files 工作区树文件仍存在且本刀未改（路径存在即可；行为 diff 由 tip 对照）
  const filesTree = read(
    "apps/desktop/src/renderer/src/components/ai-chat/right-pane/views/files-tree.tsx"
  )
  assert.ok(filesTree.length > 100)
  assert.doesNotMatch(filesTree, /@headless-tree/)

  const pkg = read("apps/desktop/package.json")
  // 禁第二树库
  assert.doesNotMatch(pkg, /react-arborist|react-complex-tree|@tanstack\/react-virtual/)
})

test("Must5 · 诚实文案：禁全面 headless-tree / 树系统重构 / 性能大升级", () => {
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/chat.ts")
  assert.match(zh, /reviewFilterFiles:\s*"筛选文件…"/)
  assert.match(zh, /reviewNoMatchingFiles:\s*"没有匹配的文件"/)
  assert.doesNotMatch(zh, /全面 headless-tree|树系统重构|性能大升级/)

  const tree = read(fileTreeDir, "review-file-tree.tsx")
  assert.doesNotMatch(tree, /全面 headless-tree|树系统重构|性能大升级/)
})
