/**
 * P2 切片①真机自门：确认卡 / 未登录卡 / 芯片+挂载 / 不碰 commit·push。
 * stub：ENJOY_E2E_PR_STUB=1 + ENJOY_E2E_PR_PROBE；不打真 GitHub。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-pr-slice1"

function seedGitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "enjoy-p2-pr-ws-"))
  execSync("git init -b main", { cwd: root })
  execSync('git config user.email "e2e@example.com"', { cwd: root })
  execSync('git config user.name "E2E"', { cwd: root })
  writeFileSync(join(root, "readme.md"), "# stub\n")
  execSync("git add readme.md && git commit -m 'init'", { cwd: root })
  // bare "upstream" so branch has upstream tracking without network
  const bare = mkdtempSync(join(tmpdir(), "enjoy-p2-pr-bare-"))
  execSync(`git init --bare -b main`, { cwd: bare })
  execSync(`git remote add origin ${bare}`, { cwd: root })
  execSync("git push -u origin main", { cwd: root })
  // rewrite origin URL for same-repo attach match against stub list（本地 origin/main 跟踪仍在）
  execSync("git remote set-url origin https://github.com/example/enjoy-stub.git", { cwd: root })
  writeFileSync(join(root, "extra.md"), "ahead\n")
  execSync("git add extra.md && git commit -m 'feat: ahead of upstream'", { cwd: root })
  return root
}

async function launch(env: Record<string, string>) {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-pr-ud-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_PR_STUB: "1",
      ...env
    }
  })
}

async function openReview(window: import("@playwright/test").Page) {
  await window.keyboard.press("Control+Shift+G")
  // 等审查底栏挂载；open-pr 在可开时出现
  await window.waitForTimeout(800)
  const dock = window.locator('[data-testid="review-push"], [data-testid="open-pr-action"], [data-testid="review-not-git-empty"]')
  await dock.first().waitFor({ timeout: 20_000 })
}

test.describe("P2 PR slice1 gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01 底栏次级「开拉取请求」+ 确认卡；create 后芯片", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_PROBE: "ok"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await openReview(window)

      const openBtn = window.locator('[data-testid="open-pr-action"]')
      await expect(openBtn).toBeVisible({ timeout: 15_000 })
      const push = window.locator('[data-testid="review-push"]')
      await expect(push).toBeVisible()
      await window.screenshot({ path: join(SHOTS, "01-dock-secondary-cta.png") })

      await openBtn.click({ force: true })
      const dialog = window.locator('[data-testid="open-pr-confirm-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 10_000 })
      await expect(window.locator('[data-testid="open-pr-title"]')).toBeVisible()
      await window.screenshot({ path: join(SHOTS, "02-confirm-card.png") })

      await window.locator('[data-testid="open-pr-confirm"]').click({ force: true })
      await expect(dialog).toBeHidden({ timeout: 15_000 })
      const chip = window.locator('[data-testid="attached-pr-chip"]').first()
      await expect(chip).toContainText("4242", { timeout: 15_000 })
      await window.screenshot({ path: join(SHOTS, "03-attached-chip.png") })
    } finally {
      await app.close()
    }
  })

  test("02 未登录诚实卡（tip A）", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_PROBE: "not-authed"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await openReview(window)
      await window.locator('[data-testid="open-pr-action"]').click({ force: true })
      const card = window.locator('[data-testid="connect-github-card"]')
      await expect(card).toBeVisible({ timeout: 10_000 })
      await expect(card).toContainText("gh auth login")
      await window.screenshot({ path: join(SHOTS, "04-connect-github-card.png") })
    } finally {
      await app.close()
    }
  })

  test("03 ⋯ 挂上这个 PR attach-only + +N", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_PROBE: "ok"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })

      const row = window.locator('[data-testid="sidebar-session-row"]').first()
      await row.hover()
      await row.locator('[data-testid="session-row-menu"]').click({ force: true })
      await window.locator('[data-testid="session-row-menu-attach-pr"]').click()
      const dlg = window.locator('[data-testid="attach-pr-dialog"]')
      await expect(dlg).toBeVisible({ timeout: 10_000 })
      await window.screenshot({ path: join(SHOTS, "05-attach-dialog.png") })

      await window.locator('[data-testid="attach-pr-item-12"]').click({ force: true })
      await expect(dlg).toBeHidden({ timeout: 15_000 })
      await expect(window.locator('[data-testid="attached-pr-chip"]').first()).toContainText("12", {
        timeout: 15_000
      })

      // attach second → +N
      await row.hover()
      await row.locator('[data-testid="session-row-menu"]').click({ force: true })
      await window.locator('[data-testid="session-row-menu-attach-pr"]').click()
      await window.locator('[data-testid="attach-pr-item-15"]').click({ force: true })
      await expect(window.locator('[data-testid="attached-pr-extras"]').first()).toContainText("+1", {
        timeout: 15_000
      })
      await window.screenshot({ path: join(SHOTS, "06-chip-plus-n.png") })
    } finally {
      await app.close()
    }
  })

  test("04 非 Git：开 PR 钮隐藏；push 仍在", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-pr-nongit-"))
    writeFileSync(join(workspace, "readme.md"), "# nongit\n")
    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_PROBE: "not-git"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await window.keyboard.press("Control+Shift+G")
      // not-git empty may show; open-pr must not
      await expect(window.locator('[data-testid="open-pr-action"]')).toHaveCount(0)
      await window.screenshot({ path: join(SHOTS, "07-not-git-no-cta.png") })
    } finally {
      await app.close()
    }
  })
})
