/**
 * 非 Git / 未探测：审查空态必须 ReviewNotGitEmpty，禁止 treeClean。
 * treeClean 只允许在确认 gitRepo === true 且无改动时出现。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))
const NL = /\r?\n/

function read(rel: string): string {
  return readFileSync(join(dir, rel), "utf8")
}

test("review-view：非 true 早退 ReviewNotGitEmpty，不进 scope 面板", () => {
  const src = read("../review-view.tsx")
  assert.match(src, /if \(gitRepo !== true\) return <ReviewNotGitEmpty \/>/)
  assert.doesNotMatch(src, /if \(gitRepo === false\) return <ReviewNotGitEmpty \/>/)
})

test("changes-list：treeClean 仅 gitRepo === true；否则 ReviewNotGitEmpty", () => {
  const src = read("changes-list.tsx")
  assert.match(src, /if \(gitRepo !== true\) return <ReviewNotGitEmpty \/>/)
  const cleanIdx = src.search(/chat\.treeClean/)
  assert.ok(cleanIdx > 0)
  const before = src.slice(0, cleanIdx)
  assert.match(before, /changes\.length === 0/)
  // 到达 treeClean 前必须已经拦掉非 true
  assert.match(before, /gitRepo !== true/)
})

test("review-diff-pane：非 true 出 ReviewNotGitEmpty；自动选文件也只在确认 git 时", () => {
  const src = read("diff-stream/review-diff-pane.tsx")
  assert.match(src, /if \(gitRepo !== true\) return/)
  assert.match(src, /if \(gitRepo !== true\) return <ReviewNotGitEmpty \/>/)
  assert.match(src, /chat\.treeClean/)
  assert.doesNotMatch(src, /if \(gitRepo === false\) return <ReviewNotGitEmpty \/>/)
})

test("use-review-view-model：inGit 只认 gitRepo === true", () => {
  const src = read("use-review-view-model.ts")
  assert.match(src, /const inGit = gitRepo === true/)
  assert.doesNotMatch(src, /const inGit = gitRepo !== false/)
})

test("ReviewNotGitEmpty 文案键是 reviewNotGit，不是 treeClean", () => {
  const src = read("review-not-git-empty.tsx")
  assert.match(src, /chat\.reviewNotGit/)
  assert.doesNotMatch(src, /chat\.treeClean/)
  assert.match(src, /data-testid="review-not-git-empty"/)
  // source-regex：组件边界用 \r?\n 切开仍能命中空态壳
  const lines = src.split(NL)
  assert.ok(lines.some((line) => line.includes('data-testid="review-not-git-empty"')))
})
