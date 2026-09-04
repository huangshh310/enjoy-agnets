/**
 * git log 线性解析单测：不造分支图、不回落 main。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { parseGitLogStdout } from "./workspace-git-log.ts"

const SEP = "\x1f"

test("parseGitLogStdout 解析提交头与 shortstat", () => {
  const stdout = [
    ["abc", "abc1234", "feat: audit", "Ada", "ada@x", "2 hours ago", "2026-01-02"].join(SEP),
    " 2 files changed, 10 insertions(+), 3 deletions(-)",
    ["def", "def5678", "fix: nits", "Bob", "bob@x", "yesterday", "2026-01-01"].join(SEP),
    " 1 file changed, 1 insertion(+)"
  ].join("\n")

  const commits = parseGitLogStdout(stdout)
  assert.equal(commits.length, 2)
  assert.equal(commits[0]?.message, "feat: audit")
  assert.equal(commits[0]?.filesChanged, 2)
  assert.equal(commits[0]?.additions, 10)
  assert.equal(commits[0]?.deletions, 3)
  assert.equal(commits[1]?.filesChanged, 1)
  assert.equal(commits[1]?.additions, 1)
  assert.equal(commits[1]?.deletions, 0)
})

test("parseGitLogStdout 空输出得到空列表", () => {
  assert.deepEqual(parseGitLogStdout(""), [])
  assert.deepEqual(parseGitLogStdout("\n"), [])
})
