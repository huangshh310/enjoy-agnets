/**
 * OMP 登录计划：空回车 → 抽 URL → Credentials saved 才 done。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { decideOmpLogin, planOmpLogin, resultForOpen } from "./omp-login-plan.ts"

const GITHUB_PROMPT = "GitHub Enterprise URL/domain (blank for github.com) (company.ghe.com): "

test("GitHub 先问 Enterprise 域名：必须空回车，不能当失败或 TUI", () => {
  assert.deepEqual(planOmpLogin(GITHUB_PROMPT), { action: "answer_empty" })
})

test("GitHub 设备流：打开 verification_uri 并带上用户码", () => {
  const plan = planOmpLogin(`
${GITHUB_PROMPT}

Open this URL in your browser:
https://github.com/login/device
Enter code: AB12-CD34
`)
  assert.equal(plan.action, "open")
  if (plan.action !== "open") return
  assert.equal(plan.url, "https://github.com/login/device")
  assert.equal(plan.userCode, "AB12-CD34")
  assert.equal(plan.needsPaste, false)
  assert.deepEqual(resultForOpen(plan), { ok: true, message: "device:AB12-CD34" })
})

test("Fireworks 会先打仪表盘 URL，仍要粘贴密钥", () => {
  const plan = planOmpLogin(`
Open this URL in your browser:
https://app.fireworks.ai/settings/users/api-keys
Create or copy your Fireworks API key
`)
  assert.equal(plan.action, "open")
  if (plan.action !== "open") return
  assert.equal(plan.needsPaste, true)
  assert.deepEqual(resultForOpen(plan), { ok: false, message: "needs_tui" })
})

test("Gemini 环回 OAuth：打开 https 授权页，不要误开 localhost shortcut", () => {
  const plan = planOmpLogin(`
Open this URL in your browser:
https://accounts.google.com/o/oauth2/v2/auth?client_id=x&response_type=code
Local shortcut (this machine only): http://127.0.0.1:8085/launch
Waiting for browser authentication...
`)
  assert.equal(plan.action, "open")
  if (plan.action !== "open") return
  assert.equal(plan.url.startsWith("https://accounts.google.com/"), true)
  assert.equal(plan.needsPaste, false)
  assert.deepEqual(resultForOpen(plan), { ok: true, message: "browser_opened" })
})

test("GitLab 打开授权页后仍要粘贴 vscode 回调", () => {
  const plan = planOmpLogin(`
Open this URL in your browser:
https://gitlab.com/oauth/authorize?client_id=x&response_type=code
Waiting for pasted authorization code...
`)
  assert.equal(plan.action, "open")
  if (plan.action !== "open") return
  assert.equal(plan.needsPaste, true)
})

test("stdin 被丢掉时 GitHub 根本打不出 URL", () => {
  assert.equal(
    planOmpLogin("error: readline was closed\n code: \"ERR_USE_AFTER_CLOSE\"\n").action,
    "wait"
  )
})

test("只有 device URL、还没有 Enter code 时也先 open", () => {
  const plan = planOmpLogin("Open this URL in your browser:\nhttps://github.com/login/device\n")
  assert.equal(plan.action, "open")
  if (plan.action !== "open") return
  assert.equal(plan.userCode, undefined)
})

const GEMINI_OAUTH = `
Open this URL in your browser:
https://accounts.google.com/o/oauth2/v2/auth?client_id=x&response_type=code
Local shortcut (this machine only): http://127.0.0.1:8085/launch
Waiting for browser authentication...
`

test("环回 OAuth 打开授权页不能当成登录完成，否则 Enjoy 不会等 callback", () => {
  const plan = planOmpLogin(GEMINI_OAUTH)
  const decision = decideOmpLogin(plan, { answered: false, opened: false })
  assert.equal(decision.settle, undefined)
  assert.deepEqual(decision.notice, { ok: true, message: "browser_opened" })
  assert.match(decision.openUrl ?? "", /^https:\/\/accounts\.google\.com\//)
})

test("Credentials saved 才 settle logged_in", () => {
  assert.deepEqual(decideOmpLogin({ action: "done" }, { answered: true, opened: true }), {
    settle: { ok: true, message: "logged_in" }
  })
})

test("粘贴密钥打开页后立刻 settle，不能挂着等 callback", () => {
  const plan = planOmpLogin(`
Open this URL in your browser:
https://app.fireworks.ai/settings/users/api-keys
Create or copy your Fireworks API key
`)
  const decision = decideOmpLogin(plan, { answered: false, opened: false })
  assert.deepEqual(decision.settle, { ok: false, message: "needs_tui" })
})

test("GitHub 只有 device URL 时先打开页面，等 Enter code 再 notice", () => {
  const plan = planOmpLogin("Open this URL in your browser:\nhttps://github.com/login/device\n")
  const decision = decideOmpLogin(plan, { answered: true, opened: false })
  assert.equal(decision.waitDeviceCode, true)
  assert.equal(decision.notice, undefined)
  assert.equal(decision.settle, undefined)
  assert.equal(decision.openUrl, "https://github.com/login/device")
})
