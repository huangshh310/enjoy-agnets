/**
 * jojo #145 门禁：高负载下新对话点完等 3s，一口气打完（无间隔 type / insertText）立刻 Enter。
 * 每次 Enter 要么发出（库里恰好一条完整原文、输入框清空），要么出可见提示且留稿，禁止静默。
 * 负载：ENJOY_E2E_CPU_LOAD 个 `yes > /dev/null`（默认 2，box 内存紧，不上 stress）；每条用例结束都杀掉。
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process"
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/first-send-under-load")
const REPEAT = Number(process.env.ENJOY_E2E_REPEAT ?? "10")
const LOAD = Number(process.env.ENJOY_E2E_CPU_LOAD ?? "2")

function startLoad(): ChildProcess[] {
  if (process.platform === "win32") return []
  return Array.from({ length: LOAD }, () => spawn("sh", ["-c", "exec yes > /dev/null"], { stdio: "ignore" }))
}

function stopLoad(procs: ChildProcess[]): void {
  for (const proc of procs) {
    try {
      proc.kill("SIGKILL")
    } catch {
      /* gone */
    }
  }
}

function userMessages(userData: string): string[] {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return []
  const db = new DatabaseSync(dbPath)
  try {
    return (db.prepare("SELECT content FROM messages WHERE role = 'user' ORDER BY rowid").all() as Array<{ content?: string }>).map(
      (row) => row.content ?? ""
    )
  } finally {
    db.close()
  }
}

async function launch(): Promise<{ app: ElectronApplication; window: Page; userData: string }> {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-load-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-load-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const playwright = await import("playwright")
  const app = await playwright._electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 90_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 60_000 })
  await window.setViewportSize({ width: 1440, height: 900 })
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 60_000 })
  await window.evaluate(() => {
    ;(window as unknown as { __enjoySendDebugOn?: boolean }).__enjoySendDebugOn = true
  })
  return { app, window, userData }
}

async function waitSendReady(window: Page): Promise<void> {
  await window.waitForFunction(
    () => {
      const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
      return label === "Send" || label === "发送"
    },
    undefined,
    { timeout: 60_000 }
  )
}

async function seed(window: Page, userData: string): Promise<void> {
  await waitSendReady(window)
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.click()
  await window.keyboard.type("seed used session")
  await window.keyboard.press("Enter")
  await expect.poll(() => userMessages(userData).length, { timeout: 60_000 }).toBeGreaterThan(0)
  await expect(composer).toHaveValue("", { timeout: 30_000 })
}

/** wait=false：选中 @readme 后不等 Chip 落地就接着打字（jojo 那次只发出「h」的手速）。 */
async function attachReadmeChip(window: Page, wait = true): Promise<void> {
  await window.keyboard.type("@readme")
  await window.locator('[data-testid="composer-mention-item"]').filter({ hasText: "readme.md" }).first().waitFor({
    timeout: 30_000
  })
  await window.keyboard.press("Enter")
  if (!wait) return
  await expect(window.locator('[data-testid="composer-quote-chip"]')).toContainText("readme.md", { timeout: 30_000 })
}

/** 新对话按钮在负载下可能还在过渡动画里：等它稳下来，卡住就留现场。 */
async function openNewSession(window: Page, label: string): Promise<void> {
  const button = window.locator('[data-testid="sidebar-new-session"]')
  try {
    await button.click({ noWaitAfter: true, timeout: 30_000 })
  } catch (error) {
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, `${label}-new-session-stuck.png`) }).catch(() => undefined)
    const state = await window
      .evaluate(() => ({
        rect: document.querySelector('[data-testid="sidebar-new-session"]')?.getBoundingClientRect().toJSON(),
        overlay: Array.from(document.querySelectorAll('[role="dialog"],[data-state="open"]')).map((el) => el.outerHTML.slice(0, 200))
      }))
      .catch(() => null)
    throw new Error(`${label}: new session click failed ${JSON.stringify(state)}: ${String(error)}`)
  }
}

type Mode = "type" | "insert" | "xdotool"

function hasXdotool(): boolean {
  if (process.platform !== "linux" || !process.env.DISPLAY) return false
  try {
    execFileSync("xdotool", ["version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

/** 真 X 键盘事件（走 Chromium 输入管线，和 jojo / luna 的 xdotool 实机巡检一致），不是 CDP 合成键。 */
async function xdoFocusComposer(window: Page): Promise<void> {
  const box = await window.locator('[data-testid="composer-input"]').boundingBox()
  const origin = await window.evaluate(() => ({ x: window.screenX, y: window.screenY }))
  if (!box) throw new Error("composer not visible")
  const x = Math.round(origin.x + box.x + box.width / 2)
  const y = Math.round(origin.y + box.y + box.height / 2)
  execFileSync("xdotool", ["mousemove", String(x), String(y), "click", "1"])
}

async function burstAndEnter(window: Page, text: string, mode: Mode): Promise<void> {
  if (mode === "xdotool") {
    execFileSync("xdotool", ["type", "--delay", "0", text])
    execFileSync("xdotool", ["key", "Return"])
    return
  }
  if (mode === "type") await window.keyboard.type(text)
  else await window.keyboard.insertText(text)
  await window.keyboard.press("Enter")
}

/** 这次 Enter 的结局：发出（恰好一条以原文结尾且含全文）或出提示留稿。静默 = 失败。 */
async function expectSentOrNotice(
  window: Page,
  userData: string,
  before: number,
  text: string,
  label: string
): Promise<void> {
  const composer = window.locator('[data-testid="composer-input"]')
  const notice = window.locator(
    '[data-testid="thread-error-banner"], [data-testid="thread-need-model-notice"], [data-testid="thread-no-chat-route-notice"]'
  )
  const outcome = async () => {
    const rows = userMessages(userData).slice(before)
    if (rows.some((item) => item.endsWith(text))) return "sent"
    if (rows.length > 0) return `partial:${JSON.stringify(rows)}`
    if ((await notice.count()) > 0 && (await composer.inputValue()) === text) return "notice"
    return "pending"
  }
  let result = "pending"
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    result = await outcome()
    if (result !== "pending") break
    await window.waitForTimeout(500)
  }
  if (result === "pending") {
    // 静默吞掉：留下现场再判失败。
    const state = await window.evaluate(() => ({
      composer: (document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null)?.value,
      focused: document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName,
      gate: window.__enjoyE2e?.getComposerGate?.() ?? null,
      debug: (window as unknown as { __enjoySendDebug?: unknown[] }).__enjoySendDebug?.slice(-30) ?? null
    }))
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, `${label}-silent.png`) })
    result = `silent:${JSON.stringify(state)}`
  }
  if (result !== "sent") {
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, `${label}-${result.slice(0, 12)}.png`) })
  }
  expect(result, label).toBe("sent")
  expect(userMessages(userData).filter((item) => item.endsWith(text)).length, label).toBe(1)
  await expect(composer, label).toHaveValue("", { timeout: 15_000 })
}

for (const mode of ["type", "insert", "xdotool"] as const) {
  for (const chip of ["none", "chip", "chip-burst"] as const) {
    const name = chip === "none" ? mode : `${mode}+${chip}`
    test(`高负载新对话一口气打完立刻 Enter（${name}，${REPEAT} 次）：每次都发出且清空`, async () => {
      test.setTimeout(REPEAT * 60_000 + 180_000)
      test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
      test.skip(mode === "xdotool" && !hasXdotool(), "xdotool / X display unavailable")
      const load = startLoad()
      const { app, window, userData } = await launch()
      try {
        await seed(window, userData)
        for (let i = 0; i < REPEAT; i += 1) {
          // 上一轮可能还在等审批 / 流式：点新对话即停车，不等它结束，贴近真人连着开新对话。
          await openNewSession(window, `${name}-${i}`)
          await window.waitForTimeout(3_000)
          if (mode === "xdotool") await xdoFocusComposer(window)
          else await window.locator('[data-testid="composer-input"]').click({ noWaitAfter: true })
          if (chip !== "none") await attachReadmeChip(window, chip === "chip")
          const text = `hello world again ${name} ${i}`
          const before = userMessages(userData).length
          await burstAndEnter(window, text, mode)
          await expectSentOrNotice(window, userData, before, text, `${name}-${i}`)
        }
        mkdirSync(shots, { recursive: true })
        await window.screenshot({ path: join(shots, `${name}-final.png`) })
      } finally {
        stopLoad(load)
        await closeForRelaunch(app)
      }
    })
  }
}
