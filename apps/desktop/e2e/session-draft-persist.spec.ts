/**
 * jojo / luna（#145 后续 C）：未发草稿按会话保存、重启还在；切会话 / 新对话不把旧稿抄过去。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/post145-drafts")
const launchArgs = [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]

type Boot = { workspace: string; userData: string; env: NodeJS.ProcessEnv }

function freshEnv(extra: Record<string, string> = {}): Boot {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-ffs-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-ffs-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return {
    workspace,
    userData,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ...extra
    }
  }
}

async function launch(env: NodeJS.ProcessEnv): Promise<{ app: ElectronApplication; window: Page }> {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) throw new Error("playwright electron launcher unavailable")
  const app = await electron.launch({ args: launchArgs, cwd: process.cwd(), timeout: 60_000, env })
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 30_000 })
  await window.setViewportSize({ width: 1440, height: 900 })
  await window
    .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 30_000 })
    .catch(() => undefined)
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
  return { app, window }
}

/** 首发后常有待审批，裸 close 会撞退出确认框；统一 forceQuit + 兜底 kill。 */
async function shutdown(app: ElectronApplication): Promise<void> {
  await closeForRelaunch(app)
}

async function waitSendReady(window: Page): Promise<void> {
  await window.waitForFunction(
    () => {
      const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
      return label === "Send" || label === "发送"
    },
    undefined,
    { timeout: 30_000 }
  )
}

async function typeSlow(window: Page, text: string): Promise<void> {
  for (const ch of text) {
    await window.keyboard.type(ch)
    await window.waitForTimeout(80 + Math.floor(Math.random() * 71))
  }
}

function userMessages(userData: string): string[] {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return []
  const db = new DatabaseSync(dbPath)
  try {
    const rows = db.prepare("SELECT content FROM messages WHERE role = 'user'").all() as Array<{ content?: string }>
    return rows.map((row) => row.content ?? "")
  } finally {
    db.close()
  }
}


/** 启动自带空会话会被「新对话」复用；先发一句把它用掉，后面点新对话才真走创建。 */
async function seedUsedSession(window: Page, userData: string, text = "seed used session"): Promise<void> {
  await waitSendReady(window)
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.click()
  await typeSlow(window, text)
  await composer.press("Enter")
  await expect.poll(() => userMessages(userData).includes(text), { timeout: 30_000 }).toBe(true)
  await expect(window.locator('[data-chat-stage="true"]').getByText("stub-ok").first()).toBeVisible({
    timeout: 30_000
  })
  await expect(composer).toHaveValue("")
}


function row(window: Page, sessionId: string) {
  return window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId}"]`).first()
}

function newestSessionId(userData: string): string {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    const row = db.prepare("SELECT id FROM sessions ORDER BY created_at DESC, rowid DESC LIMIT 1").get() as { id?: string } | undefined
    return row?.id ?? ""
  } finally {
    db.close()
  }
}

test("草稿按会话保存：新对话不带旧稿，切回还在，重启还在；发出后才清", async () => {
  test.setTimeout(300_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv()
  let first = await launch(boot.env)
  let s1 = ""
  let s2 = ""
  try {
    const { window } = first
    await seedUsedSession(window, boot.userData)
    s1 = newestSessionId(boot.userData)
    expect(s1).not.toBe("")
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.click()
    await window.keyboard.type("会话一的草稿", { delay: 20 })
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(composer).toHaveValue("", { timeout: 10_000 })
    await waitSendReady(window)
    await expect.poll(() => newestSessionId(boot.userData) !== s1, { timeout: 20_000 }).toBe(true)
    s2 = newestSessionId(boot.userData)
    await expect(composer).toHaveValue("")
    await composer.click()
    await window.keyboard.type("会话二的草稿", { delay: 20 })
    await row(window, s1).click()
    await expect(composer).toHaveValue("会话一的草稿", { timeout: 10_000 })
    await row(window, s2).click()
    await expect(composer).toHaveValue("会话二的草稿", { timeout: 10_000 })
    await window.waitForTimeout(500)
  } finally {
    await shutdown(first.app)
  }
  first = await launch(boot.env)
  try {
    const { window } = first
    const composer = window.locator('[data-testid="composer-input"]')
    await row(window, s1).click()
    await expect(composer).toHaveValue("会话一的草稿", { timeout: 15_000 })
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "draft-after-restart.png") })
    await waitSendReady(window)
    await composer.click()
    await composer.press("End")
    await composer.press("Enter")
    await expect.poll(() => userMessages(boot.userData).includes("会话一的草稿"), { timeout: 30_000 }).toBe(true)
    await expect(composer).toHaveValue("", { timeout: 10_000 })
    await row(window, s2).click()
    await expect(composer).toHaveValue("会话二的草稿", { timeout: 10_000 })
  } finally {
    await shutdown(first.app)
  }
  first = await launch(boot.env)
  try {
    const { window } = first
    await row(window, s1).click()
    await window.waitForTimeout(1_000)
    await expect(window.locator('[data-testid="composer-input"]')).toHaveValue("")
  } finally {
    await shutdown(first.app)
  }
})
