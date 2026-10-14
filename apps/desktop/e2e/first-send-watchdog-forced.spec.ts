/**
 * luna（#145 后续 D）：ENJOY_E2E_SEND_WATCHDOG=1 让 stub 下的发送故意卡过看门狗——
 * 复现「这次没发出去」红卡，以及框里已有后打的字时「两条拼回」提示。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/post145-watchdog")
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


test("强制看门狗：发出前超时 → 红卡「这次没发出去」、原文还回、不入库", async () => {
  test.setTimeout(180_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv({ ENJOY_E2E_SEND_WATCHDOG: "1" })
  const { app, window } = await launch(boot.env)
  try {
    await waitSendReady(window)
    const composer = window.locator('[data-testid="composer-input"]')
    const rowsBefore = await window.locator('[data-testid="sidebar-session-row"]').count()
    await composer.click()
    const a = "看门狗A"
    await window.keyboard.type(a, { delay: 20 })
    await composer.press("Enter")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toContainText("这次没发出去", { timeout: 10_000 })
    // jojo：正文不复述标题。
    await expect(banner).not.toContainText("这次没发出去这次没发出去")
    await expect(banner).toContainText("内容已放回输入框")
    await expect(composer).toHaveValue(a)
    await window.waitForTimeout(2_000)
    expect(userMessages(boot.userData).filter((m) => m.includes(a))).toEqual([])
    // jojo P3：失败后侧栏不多出空会话。
    await expect
      .poll(() => window.locator('[data-testid="sidebar-session-row"]').count(), { timeout: 10_000 })
      .toBeLessThanOrEqual(rowsBefore)
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "watchdog-red-card.png") })
  } finally {
    await shutdown(app)
  }
})

test("强制看门狗：等待中改打了 B → 两条拼回（B 在前）并提示接在后面；再发时红卡收掉", async () => {
  test.setTimeout(180_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv({ ENJOY_E2E_SEND_WATCHDOG: "1" })
  const { app, window } = await launch(boot.env)
  try {
    await waitSendReady(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.click()
    const a = "先发的A"
    const b = "后打的B"
    await window.keyboard.type(a, { delay: 20 })
    await composer.press("Enter")
    await composer.press("ControlOrMeta+a")
    await window.keyboard.type(b, { delay: 20 })
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toContainText("这条没发出去，已接在输入框末尾，改好再发。", { timeout: 10_000 })
    await expect(composer).toHaveValue(`${b}\n${a}`)
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "watchdog-merged-hint.png") })
    // jojo：下一发一开始红卡就收掉，不与「思考中」同屏。
    await composer.press("Enter")
    await expect(banner).toBeHidden({ timeout: 1_500 })
    await window.screenshot({ path: join(shots, "watchdog-next-send-no-card.png") })
  } finally {
    await shutdown(app)
  }
})
