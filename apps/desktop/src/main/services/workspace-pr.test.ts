/**
 * P2 切片①：同仓校验 + create 只走 main gh（源码不变量）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { prUrlMatchesRepo } from "./workspace-pr.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, "../../../../..")

test("prUrlMatchesRepo 认 github.com / owner/repo / .git 后缀", () => {
  assert.equal(prUrlMatchesRepo("https://github.com/acme/widgets/pull/12", "acme", "widgets"), true)
  assert.equal(prUrlMatchesRepo("https://github.com/acme/widgets.git/pull/12", "acme", "widgets"), true)
  assert.equal(prUrlMatchesRepo("https://github.com/acme/other/pull/12", "acme", "widgets"), false)
  assert.equal(prUrlMatchesRepo("https://gitlab.com/acme/widgets/pull/12", "acme", "widgets"), false)
  assert.equal(prUrlMatchesRepo("not-a-url", "acme", "widgets"), false)
})

test("Must#1：renderer 不直接 spawn gh / 不持 token 开 PR", () => {
  const openPr = readFileSync(
    join(root, "apps/desktop/src/renderer/src/components/ai-chat/pr-flow/open-pr-actions.tsx"),
    "utf8"
  )
  assert.match(openPr, /workspace\.prCreate/)
  assert.doesNotMatch(openPr, /\bgh pr create\b/)
  assert.doesNotMatch(openPr, /Octokit|GITHUB_TOKEN|ghp_/)
})

test("Must#4：挂 PR 对话框只调 list + attach，不调 create", () => {
  const attach = readFileSync(
    join(root, "apps/desktop/src/renderer/src/components/ai-chat/pr-flow/attach-pr-dialog.tsx"),
    "utf8"
  )
  assert.match(attach, /workspace\.prList/)
  assert.match(attach, /attach\(/)
  assert.doesNotMatch(attach, /prCreate|gh pr create/)
})

test("Must#3/C：旁表 migration v21 含 session_attached_prs 列，非 JSON 糊弄", () => {
  const mig = readFileSync(
    join(root, "packages/db/src/migrations/session-attached-prs.ts"),
    "utf8"
  )
  assert.match(mig, /version:\s*21/)
  assert.match(mig, /session_attached_prs/)
  assert.match(mig, /is_primary/)
  assert.doesNotMatch(mig, /json_extract|attached_prs_json/)
})
