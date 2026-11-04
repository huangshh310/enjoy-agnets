/**
 * P2 切片②「盯 PR」真机自门 · 7 屏。
 * stub：ENJOY_E2E_PR_STUB=1；禁真 GitHub / 禁云 7×24 / 禁自动 merge。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-babysit"

function seedGitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "enjoy-p2-babysit-ws-"))
  execSync("git init -b main", { cwd: root })
  execSync('git config user.email "e2e@example.com"', { cwd: root })
  execSync('git config user.name "E2E"', { cwd: root })
  writeFileSync(join(root, "readme.md"), "# stub\n")
  execSync("git add readme.md && git commit -m 'init'", { cwd: root })
  const bare = mkdtempSync(join(tmpdir(), "enjoy-p2-babysit-bare-"))
  execSync(`git init --bare -b main`, { cwd: bare })
  execSync(`git remote add origin ${bare}`, { cwd: root })
  execSync("git push -u origin main", { cwd: root })
  execSync("git remote set-url origin https://github.com/example/enjoy-stub.git", { cwd: root })
  writeFileSync(join(root, "extra.md"), "ahead\n")
  execSync("git add extra.md && git commit -m 'feat: ahead of upstream'", { cwd: root })
  return root
}

async function launch(env: Record<string, string>) {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-babysit-ud-"))
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
      ENJOY_E2E_PR_PROBE: "ok",
      ...env
    }
  })
}

async function attachPrimary(
  window: import("@playwright/test").Page,
  number = 12
): Promise<void> {
  const row = window.locator('[data-testid="sidebar-session-row"]').first()
  await row.hover()
  await row.locator('[data-testid="session-row-menu"]').click({ force: true })
  await window.locator('[data-testid="session-row-menu-attach-pr"]').click()
  const dlg = window.locator('[data-testid="attach-pr-dialog"]')
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  await window.locator(`[data-testid="attach-pr-item-${number}"]`).click({ force: true })
  await expect(dlg).toBeHidden({ timeout: 15_000 })
  await expect(window.locator('[data-testid="attached-pr-chip"]').first()).toContainText(String(number), {
    timeout: 15_000
  })
}

test.describe("P2 babysit gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–03 入口⋯ / 确认卡 / 盯着中 pill", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({ ENJOY_E2E_WORKSPACE: workspace })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await attachPrimary(window, 12)

      const overflow = window.locator('[data-testid="attached-pr-overflow"]').first()
      await expect(overflow).toBeVisible({ timeout: 10_000 })
      await overflow.click({ force: true })
      const startItem = window.locator('[data-testid="attached-pr-menu-start"]')
      await expect(startItem).toBeVisible({ timeout: 5_000 })
      await expect(startItem).toContainText("帮我盯这个 PR")
      await window.screenshot({ path: join(SHOTS, "01-chip-overflow-entry.png") })

      await startItem.click({ force: true })
      const confirm = window.locator('[data-testid="babysit-start-confirm"]')
      await expect(confirm).toBeVisible({ timeout: 10_000 })
      await expect(confirm).toContainText("帮我盯这个 PR")
      await expect(confirm).toContainText("检查挂了")
      // 确认前未进入盯着中
      await expect(window.locator('[data-testid="attached-pr-watching-pill"]')).toHaveCount(0)
      await window.screenshot({ path: join(SHOTS, "02-start-confirm.png") })

      await window.locator('[data-testid="babysit-start-confirm-btn"]').click({ force: true })
      await expect(confirm).toBeHidden({ timeout: 15_000 })
      const pill = window.locator('[data-testid="attached-pr-watching-pill"]').first()
      await expect(pill).toBeVisible({ timeout: 10_000 })
      await expect(pill).toContainText("盯着中")
      await window.screenshot({ path: join(SHOTS, "03-watching-pill.png") })
    } finally {
      await app.close()
    }
  })

  test("04 检查挂了 → 线程短气泡叫醒", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_BABYSIT_WAKE: "checks-failed"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await attachPrimary(window, 12)
      await window.locator('[data-testid="attached-pr-overflow"]').first().click({ force: true })
      await window.locator('[data-testid="attached-pr-menu-start"]').click({ force: true })
      await window.locator('[data-testid="babysit-start-confirm-btn"]').click({ force: true })
      await expect(window.locator('[data-testid="attached-pr-watching-pill"]').first()).toBeVisible({
        timeout: 10_000
      })
      // tip B：persistMessage 助手短气泡
      await expect(window.getByText(/检查挂了 · PR #12/)).toBeVisible({ timeout: 20_000 })
      await window.screenshot({ path: join(SHOTS, "04-wake-checks-failed.png") })
    } finally {
      await app.close()
    }
  })

  test("05 未登录诚实卡 + 未挂无入口", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    // 先无挂：会话⋯无盯入口
    const appEmpty = await launch({ ENJOY_E2E_WORKSPACE: workspace })
    if (!appEmpty) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await appEmpty.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      const row = window.locator('[data-testid="sidebar-session-row"]').first()
      await row.hover()
      await row.locator('[data-testid="session-row-menu"]').click({ force: true })
      await expect(window.locator('[data-testid="session-row-menu-babysit"]')).toHaveCount(0)
      await expect(window.locator('[data-testid="attached-pr-overflow"]')).toHaveCount(0)
      await window.keyboard.press("Escape")
    } finally {
      await appEmpty.close()
    }

    const app = await launch({
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_PR_BABYSIT_AUTH: "not-authed"
    })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await attachPrimary(window, 12)
      await window.locator('[data-testid="attached-pr-overflow"]').first().click({ force: true })
      await window.locator('[data-testid="attached-pr-menu-start"]').click({ force: true })
      await window.locator('[data-testid="babysit-start-confirm-btn"]').click({ force: true })
      const card = window.locator('[data-testid="connect-github-card"]')
      await expect(card).toBeVisible({ timeout: 10_000 })
      await expect(card).toContainText("gh auth login")
      await expect(window.locator('[data-testid="attached-pr-watching-pill"]')).toHaveCount(0)
      await window.screenshot({ path: join(SHOTS, "05-connect-github-honesty.png") })
    } finally {
      await app.close()
    }
  })

  test("06 Automations 切割：无盯 PR 看板项", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({ ENJOY_E2E_WORKSPACE: workspace })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await window.evaluate(() => {
        location.hash = "#/automations"
      })
      await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
      const page = window.locator('[data-testid="page-automations"]')
      await expect(page.getByText("帮我盯这个 PR")).toHaveCount(0)
      await expect(page.getByText(/babysit|watch_pull_request/i)).toHaveCount(0)
      await expect(page.getByText(/盯 PR #/)).toHaveCount(0)
      await window.screenshot({ path: join(SHOTS, "06-automations-cut.png") })
    } finally {
      await app.close()
    }
  })

  test("07 停止盯 + soft 不挡 Dock/发送", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = seedGitRepo()
    const app = await launch({ ENJOY_E2E_WORKSPACE: workspace })
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
      await attachPrimary(window, 12)
      await window.locator('[data-testid="attached-pr-overflow"]').first().click({ force: true })
      await window.locator('[data-testid="attached-pr-menu-start"]').click({ force: true })
      await window.locator('[data-testid="babysit-start-confirm-btn"]').click({ force: true })
      await expect(window.locator('[data-testid="attached-pr-watching-pill"]').first()).toBeVisible({
        timeout: 10_000
      })

      // 次入口：会话⋯ →「停止盯」→ 同家族确认卡
      const row = window.locator('[data-testid="sidebar-session-row"]').first()
      await row.hover()
      await row.locator('[data-testid="session-row-menu"]').click({ force: true })
      await window.locator('[data-testid="session-row-menu-babysit"]').click({ force: true })
      const stop = window.locator('[data-testid="babysit-stop-confirm"]')
      await expect(stop).toBeVisible({ timeout: 10_000 })
      await expect(stop).toContainText("不再盯这个 PR")
      await window.locator('[data-testid="babysit-stop-confirm-btn"]').click({ force: true })
      await expect(stop).toBeHidden({ timeout: 10_000 })
      await expect(window.locator('[data-testid="attached-pr-watching-pill"]')).toHaveCount(0)

      // soft：发送 / composer 仍可用
      const composer = window.locator('[data-testid="composer-input"]')
      await expect(composer).toBeVisible()
      await expect(composer).toBeEnabled()
      await window.screenshot({ path: join(SHOTS, "07-stop-soft-dock.png") })
    } finally {
      await app.close()
    }
  })
})
