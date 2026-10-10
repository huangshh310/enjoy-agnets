/**
 * 玻璃外壳 ::after 不得盖住空态正文。#122 去掉右栏启动页黄环；
 * 审查空态与其它 frost 面必须同样守住，禁止 z-index 再抬回 2。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

function readFirst(paths: string[]): string {
  const hit = paths.find((path) => existsSync(path))
  assert.ok(hit, `missing ${paths.join(" | ")}`)
  return readFileSync(hit, "utf8")
}

test("玻璃 ::after 棱镜描边 z-index 必须是 0，禁止再盖正文", () => {
  const glass = readFirst([
    join(dir, "../../../../../packages/ui/styles/skins/glass.css"),
    join(dir, "../../../../../../packages/ui/styles/skins/glass.css")
  ])
  const afterBlocks = [...glass.matchAll(/::after\s*\{([^}]+)\}/g)].map((match) => match[1] ?? "")
  assert.ok(afterBlocks.length >= 1, "glass.css 必须有 ::after")
  for (const block of afterBlocks) {
    if (!block.includes("mask-composite") && !block.includes("skin-liquid-glass")) continue
    assert.match(block, /z-index:\s*0/, "棱镜描边必须 z-index: 0")
    assert.doesNotMatch(block, /z-index:\s*[1-9]/, "棱镜描边禁止 z-index > 0")
  }
  assert.doesNotMatch(glass, /::after[^{]*\{[^}]*z-index:\s*2/, "禁止把 ::after 抬回 z-index: 2")
})

test("右栏启动页不挂 frost；审查空态自己抬到 z-10 且不透明", () => {
  const pane = readFirst([
    join(dir, "../components/ai-chat/right-pane/right-pane.tsx")
  ])
  const picker = readFirst([
    join(dir, "../components/ai-chat/right-pane/picker-list.tsx")
  ])
  const reviewEmpty = readFirst([
    join(dir, "../components/ai-chat/right-pane/views/review/diff-stream/review-diff-pane.tsx")
  ])
  const changesEmpty = readFirst([
    join(dir, "../components/ai-chat/right-pane/views/review/changes-list.tsx")
  ])
  assert.match(pane, /reviewEmpty = activeTab\?\.kind === "review" && changes\.length === 0/)
  assert.match(pane, /data-frost=\{empty \|\| reviewEmpty \? undefined : "shell"\}/)
  assert.match(picker, /relative z-10/)
  assert.match(picker, /bg-background-primary-default/)
  assert.match(reviewEmpty, /relative z-10/)
  assert.match(reviewEmpty, /overflow-hidden/)
  assert.match(reviewEmpty, /bg-background-primary-default/)
  assert.match(reviewEmpty, /chat\.treeClean/)
  assert.match(changesEmpty, /relative z-10/)
  assert.match(changesEmpty, /bg-background-primary-default/)
})
