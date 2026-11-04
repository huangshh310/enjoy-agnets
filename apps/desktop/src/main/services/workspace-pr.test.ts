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

test("Must#1 切片②：只读检查走 checkWorkspacePrStatus / workspace.prCheck；禁写 IPC 冒充盯", () => {
  const babysit = readFileSync(join(dir, "workspace-pr-babysit.ts"), "utf8")
  const pr = readFileSync(join(dir, "workspace-pr.ts"), "utf8")
  const shell = readFileSync(join(dir, "../ipc-shell.ts"), "utf8")
  assert.match(pr, /export async function checkWorkspacePrStatus/)
  assert.match(pr, /gh[\s\S]*pr[\s\S]*view/)
  assert.match(babysit, /checkWorkspacePrStatus/)
  assert.match(shell, /workspace\.prCheck/)
  assert.doesNotMatch(babysit, /prCreate|gitPush|\bauto[- ]?merge\b|\bsquash\b/i)
  assert.doesNotMatch(babysit, /setInterval\s*\(/)
})

test("Must#3 tip A/C：SQLite SoT + 60s 退避 + 主挂切换停盯", () => {
  const mig = readFileSync(
    join(root, "packages/db/src/migrations/session-pr-babysit.ts"),
    "utf8"
  )
  const babysit = readFileSync(join(dir, "workspace-pr-babysit.ts"), "utf8")
  const sessionIpc = readFileSync(join(dir, "../ipc-session.ts"), "utf8")
  assert.match(mig, /version:\s*22/)
  assert.match(mig, /session_pr_babysit/)
  assert.match(babysit, /POLL_MS = 60_000/)
  assert.match(babysit, /BACKOFF_CAP_MS = 5 \* 60_000/)
  assert.match(babysit, /persistMessage/)
  assert.match(babysit, /stopPrBabysitForSession/)
  assert.match(sessionIpc, /stopPrBabysitForSession/)
})
