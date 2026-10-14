/**
 * jojo P1（#145 gate5-11/12/13）：新对话「正在准备…」时发 A，0.5s 后再发 B。
 * A：Enter 即清输入框、只发一次；B（#155 gate2 jojo P1 改口径）：按下即取走（输入框清空）、不并进 A，
 * 排在 A 后面，A 跑完自动发 B，各发一次；不弹「没发出去 / 已放回」红卡、不把 A / B 还回输入框。
 *
 * （以下沿用 first-send-composer-clear 的启动助手）P1：新对话首发后输入框必须清空；创建窗内排队首发、重启后首发同理，且消息只入库一条。
 * 慢打（每键 80–150ms），不走 fill，贴近真人打字时序。
 * luna 的复现带了 @readme.md 引用 Chip：发出的 content 前面垫了引用，和输入框原文对不上，
 * clearSentComposerText 把 React 回写的旧字当成「还没发」塞回 store（#128 回归）。
 * 被拦的发送必须出 notice 并留草稿，不能静默。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/first-send-preparing-ab")
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

test("新对话正在准备时发 A、0.5s 后发 B：A 清稿只发一次，B 取走排队、A 后自动发，不合并不重复", async () => {
  test.setTimeout(240_000)
  // leo soft：CI 里缺构建产物必须挂，不能静默跳过（e2e-window 先 build 再跑 playwright）。
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js：build 步骤没产出").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv({ ENJOY_DEV_DELAY_SESSION_CREATE_MS: "6000" })
  const { app, window } = await launch(boot.env)
  try {
    await seedUsedSession(window, boot.userData)
    await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
    await expect(window.getByText("正在准备…")).toBeVisible({ timeout: 8_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await composer.click()
    const a = "准备中首条A"
    const b = "准备中第二条B"
    await window.keyboard.type(a, { delay: 20 })
    await composer.press("Enter")
    await expect(composer).toHaveValue("", { timeout: 2_000 })
    await window.waitForTimeout(500)
    await window.keyboard.type(b, { delay: 20 })
    await composer.press("Enter")
    // B 按下即取走排队：输入框清空，没有「上一条还在准备」灰条，也没有红卡。
    await expect(composer).toHaveValue("", { timeout: 2_000 })
    await expect(window.locator('[data-testid="composer-previous-preparing"]')).toHaveCount(0)
    await expect(banner).toHaveCount(0)
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "ab-b-queued.png"), fullPage: true })
    // luna #145 回归护栏（保留）：733×480 窄矮窗里 B 排着队，输入框与发送键仍在视口内、不溢出。
    await window.setViewportSize({ width: 733, height: 480 })
    await window.waitForTimeout(300)
    await window.screenshot({ path: join(shots, "ab-b-queued-733x480.png") })
    for (const sel of ['[data-testid="composer-input"]', '[data-testid="composer-send"]']) {
      const box = await window.locator(sel).first().boundingBox()
      expect(box, sel).not.toBeNull()
      expect(box!.x, sel).toBeGreaterThanOrEqual(0)
      expect(box!.y, sel).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, sel).toBeLessThanOrEqual(733)
      expect(box!.y + box!.height, sel).toBeLessThanOrEqual(480)
    }
    await window.setViewportSize({ width: 1440, height: 900 })

    const rows = () => userMessages(boot.userData)
    await expect.poll(() => rows().filter((item) => item.endsWith(a)).length, { timeout: 30_000 }).toBe(1)
    await expect.poll(() => rows().filter((item) => item.endsWith(b)).length, { timeout: 40_000 }).toBe(1)
    await expect(window.locator('[data-chat-stage="true"]').getByText(`stub-ok ${b}`).first()).toBeVisible({
      timeout: 30_000
    })
    // A 先于 B 入库。
    const order = rows()
    expect(order.findIndex((item) => item.endsWith(a))).toBeLessThan(order.findIndex((item) => item.endsWith(b)))
    // 回复到齐后再等一会：不重复、不合并、不还回输入框、不弹「没发出去」。
    await window.waitForTimeout(3_000)
    expect(rows().filter((item) => item.endsWith(a)).length).toBe(1)
    expect(rows().filter((item) => item.endsWith(b)).length).toBe(1)
    expect(rows().some((item) => item.includes(a) && item.includes(b))).toBe(false)
    await expect(composer).toHaveValue("")
    await expect(window.getByText("这次没发出去")).toHaveCount(0)
    await window.screenshot({ path: join(shots, "ab-after-ready.png"), fullPage: true })
  } finally {
    await shutdown(app)
  }
})

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

test("leo BLOCK：A 没发出去（看门狗还回）——带图的 B 不被静默续发，字和图都回到输入框，A 在前", async () => {
  test.setTimeout(240_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js：build 步骤没产出").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv({ ENJOY_DEV_DELAY_SESSION_CREATE_MS: "6000" })
  // 先正常启动把自带空会话用掉，再带看门狗开关重启（同一 userData）：之后点新对话才真走创建、A 必卡过看门狗。
  const seeded = await launch(boot.env)
  try {
    await seedUsedSession(seeded.window, boot.userData)
  } finally {
    await shutdown(seeded.app)
  }
  const { app, window } = await launch({ ...boot.env, ENJOY_E2E_SEND_WATCHDOG: "1" })
  try {
    const composer = window.locator('[data-testid="composer-input"]')
    await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
    await expect(window.getByText("正在准备…")).toBeVisible({ timeout: 8_000 })
    const chip = window.locator('[data-testid="composer-asset-chip"]')
    await composer.click()
    const a = "失败首条A"
    const b = "带图第二条B"
    await window.keyboard.type(a, { delay: 20 })
    await composer.press("Enter")
    await expect(composer).toHaveValue("", { timeout: 2_000 })
    await window.keyboard.type(b, { delay: 20 })
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "b-img.png", mimeType: "image/png", buffer: PNG_1PX })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await composer.press("Enter")
    await expect(composer).toHaveValue("", { timeout: 2_000 })
    await expect(chip).toHaveCount(0)
    // A 卡过看门狗被还回；B 必须跟着回来（接在 A 后面），图也在，不进运行中排队、不入库。
    await expect(composer).toHaveValue(new RegExp(`${a}[\\s\\S]*${b}`), { timeout: 20_000 })
    await expect(chip).toHaveCount(1)
    await expect(window.locator('[data-testid="thread-error-banner"]')).toContainText("没发出去")
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "ab-first-fail-restored.png"), fullPage: true })
    // 再等过 A 的迟到发送：B 仍不被自动发出。
    await window.waitForTimeout(8_000)
    expect(userMessages(boot.userData).filter((m) => m.includes(b))).toEqual([])
    await expect(composer).toHaveValue(new RegExp(b))
    await expect(chip).toHaveCount(1)
  } finally {
    await shutdown(app)
  }
})
