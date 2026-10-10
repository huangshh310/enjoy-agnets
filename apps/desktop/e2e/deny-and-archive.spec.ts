/**
 * P0：待审批会话「拒绝并归档」必须落库，侧栏与胶囊清掉。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const evidence = "/opt/cursor/artifacts/p0-deny-archive-db.txt"

test("拒绝并归档：审批 deny、会话 archived_at、胶囊与已归档", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-deny-arch-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-deny-arch-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 900 })
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()

    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-deny"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.getByText("需处理")).toBeVisible({ timeout: 12_000 })
    await snap(window, "p0_pending_approval_before_archive")

    const row = window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').first()
    await expect(row).toBeVisible({ timeout: 8_000 })
    const sessionName = (await row.getAttribute("data-session-name")) ?? ""
    expect(sessionName.length).toBeGreaterThan(0)
    await row.hover()
    await row.locator('[data-testid="session-row-menu"]').click()
    const archive = window.locator('[data-testid="session-row-menu-archive"]')
    await archive.waitFor({ timeout: 8_000 })
    await archive.click()
    await expect(window.getByText("拒绝并归档")).toBeVisible({ timeout: 8_000 })
    await snap(window, "p0_deny_archive_confirm")
    await window.locator('[data-testid="confirm-dialog-confirm"]').click()

    await expect(window.locator('[data-testid="session-archived-toast"]')).toBeVisible({ timeout: 12_000 })
    await expect(sessionRow(window, sessionName)).toHaveCount(0, { timeout: 8_000 })
    await expect(window.locator('[data-testid="attention-needs-bar"]')).toHaveCount(0)
    const inbox = window.getByRole("button", { name: /^消息/ })
    await expect(inbox).toHaveAttribute("aria-label", "消息")
    await snap(window, "p0_after_deny_archive")

    const dbPath = join(userData, "app.db")
    await expect.poll(() => existsSync(dbPath), { timeout: 8_000 }).toBeTruthy()
    const dump = queryArchiveDb(dbPath)
    writeFileSync(evidence, dump, "utf8")
    expect(dump, dump).toMatch(/decision\s*=\s*deny/)
    expect(dump, dump).toMatch(/archived_at\s*=\s*\d+/)
    expect(dump, dump).not.toMatch(/decision\s*=\s*NULL/)

    await window.evaluate(() => {
      window.location.hash = "#/settings/archived"
    })
    await expect(window.getByText("已归档的聊天").first()).toBeVisible({ timeout: 8_000 })
    await expect(window.getByText(sessionName)).toBeVisible({ timeout: 8_000 })
    await snap(window, "p0_archived_list")
    await window.locator('[data-testid="archived-row-restore"]').click()
    await window.evaluate(() => {
      window.location.hash = "#/"
    })
    await expect(sessionRow(window, sessionName)).toHaveCount(1, { timeout: 8_000 })
    await sessionRow(window, sessionName).click()
    await expect(window.getByText("已拒绝，本次未执行")).toBeVisible({ timeout: 12_000 })
    await expect(window.getByText("写入 e2e-stub.txt")).toBeVisible()
    await snap(window, "p0_denied_after_restore")
  } finally {
    await closeApp(app)
  }
})

function queryArchiveDb(dbPath: string): string {
  const db = new DatabaseSync(dbPath)
  try {
    const approvals = db
      .prepare("SELECT id, decision FROM approvals ORDER BY created_at")
      .all() as Array<{ id: string; decision: string | null }>
    const sessions = db
      .prepare("SELECT id, title, archived_at FROM sessions ORDER BY created_at")
      .all() as Array<{ id: string; title: string; archived_at: number | null }>
    const lines = [
      `-- ${dbPath}`,
      "approvals:",
      ...approvals.map((row) => `  ${row.id} decision=${row.decision ?? "NULL"}`),
      "sessions:",
      ...sessions.map((row) => `  ${row.id} title=${row.title} archived_at=${row.archived_at ?? "NULL"}`)
    ]
    return `${lines.join("\n")}\n`
  } finally {
    db.close()
  }
}

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  return window
}

function sessionRow(window: Page, title: string) {
  return window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').filter({
    hasText: title
  })
}

async function snap(page: Page, name: string) {
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}

async function closeApp(app: ElectronApplication) {
  const proc = app.process()
  await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
