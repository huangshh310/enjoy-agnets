/**
 * E1「停了就真停」M2（jojo 裁定：持续探活）：
 * - D（ENJOY_E2E_SLOW_TOOL）：允许写入后停 → 「正在停下…」→ 确认死亡即落定「已停止 · 没有写入」；
 *   不出验收卡，10s 内工作区没有 e2e-stub.txt，立刻能再发。
 * - STUCK（kai 的 ENJOY_E2E_STUCK_TOOL，忽略 abort 约 12s）：8s 未确认 →「没能停下 / 再停一次」；
 *   stuck 期间新对话、切会话、设置都能用，新会话照常发送；
 *   ① 不点再停，等夹具自己收尾 → stuck → final；② 点「再停一次」→ 走 rekill → final。
 * 不往渲染层注入任何状态，只读 DOM。设 ENJOY_E2E_SHOTS_DIR 时截图并写 m2-timing.json。
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { bootPendingApproval, closeForRelaunch, firstWindow, mainEntry } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const timing: Record<string, unknown> = {}

async function shot(window: Page, name: string) {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}

/** 侧栏当前选中的会话 id（只读 DOM）。 */
const activeSessionId = (window: Page) =>
  window.evaluate(() => document.querySelector('[data-testid="sidebar-session-row"][data-active="true"]')?.getAttribute("data-session-id") ?? null)

async function openSession(window: Page, sessionId: string) {
  await window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId}"] button`).first().click()
  await expect(window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId}"]`).first()).toHaveAttribute("data-active", "true")
}

const stopPhase = (window: Page) =>
  window.evaluate(() => document.querySelector('[data-testid="composer-stop"]')?.getAttribute("data-stop-phase") ?? null)

/** 每 50ms 采一次停止钮的 phase，返回进入 want 的时刻（相对 t0）。 */
async function waitPhase(window: Page, want: string | null, t0: number, timeoutMs: number): Promise<number> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const phase = await stopPhase(window)
    const stopGone = (await window.locator('[data-testid="composer-stop"]').count()) === 0
    if (want === null ? stopGone || phase === null : phase === want) return Date.now() - t0
    await window.waitForTimeout(50)
  }
  throw new Error(`stop phase never became ${want} within ${timeoutMs}ms (now ${await stopPhase(window)})`)
}

async function allowAndStop(window: Page) {
  await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
  const stop = window.getByTestId("composer-stop")
  await expect(stop).toBeVisible({ timeout: 10_000 })
  await window.waitForTimeout(300)
  const t0 = Date.now()
  await stop.click()
  return t0
}

test.afterAll(() => {
  if (shotsDir) writeFileSync(join(shotsDir, "m2-timing.json"), JSON.stringify(timing, null, 2))
})

test("D：慢工具停下 → 正在停下… → 已停止 · 没有写入；不出验收；不落盘；立刻能发", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ slowTool: true })
  try {
    const window = await firstWindow(env.app)
    const t0 = await allowAndStop(window)
    const stoppingAt = await waitPhase(window, "stopping", t0, 2_000).catch(() => null)
    if (stoppingAt !== null) await shot(window, "d-1-stopping")
    const settledAt = await waitPhase(window, null, t0, 4_000)
    const title = window.getByTestId("tool-stop-title").first()
    await expect(title).toHaveAttribute("data-stop-view", "none_confirmed", { timeout: 3_000 })
    await expect(title).toContainText("已停止 · 没有写入")
    await shot(window, "d-2-settled-nothing-written")
    await expect(window.getByTestId("review-gate-card")).toHaveCount(0)
    await expect(window.getByTestId("session-row-failed")).toHaveCount(0)
    await window.waitForTimeout(Math.max(0, 10_000 - (Date.now() - t0)))
    expect(existsSync(join(env.workspace, "e2e-stub.txt")), "10s 内工作区不得出现 e2e-stub.txt").toBe(false)
    await sendComposer(window, window.getByTestId("composer-input"), "停了之后再问一句")
    await expect(window.locator('[data-chat-stage="true"]')).toContainText("stub-ok", { timeout: 20_000 })
    timing.D = { stoppingAt, settledAt, fileAfter10s: false }
  } finally {
    await closeForRelaunch(env.app)
    rmSync(env.workspace, { recursive: true, force: true })
    rmSync(env.userData, { recursive: true, force: true })
  }
})

test("STUCK ①：8s →「没能停下 / 再停一次」；期间新对话能发；夹具自己收尾 → final", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ extraEnv: { ENJOY_E2E_STUCK_TOOL: "1" } })
  try {
    const window = await firstWindow(env.app)
    const stuckSession = await activeSessionId(window)
    expect(stuckSession).toBeTruthy()
    const t0 = await allowAndStop(window)
    const stoppingAt = await waitPhase(window, "stopping", t0, 2_000)
    await expect(window.getByTestId("thread-notice-banner")).toContainText("正在停下…")
    await shot(window, "stuck1-1-stopping")
    const stuckAt = await waitPhase(window, "stuck", t0, 10_000)
    const stop = window.getByTestId("composer-stop")
    await expect(stop).toHaveAttribute("aria-label", "再停一次")
    await expect(stop).toBeEnabled()
    await expect(window.getByTestId("thread-notice-banner")).toContainText("没能停下")
    await expect(window.getByTestId("tool-stop-title").first()).toHaveAttribute("data-stop-view", "stuck")
    await shot(window, "stuck1-2-stuck")
    // stuck 期间：新对话 + 发送。
    await window.getByTestId("sidebar-new-session").click()
    const newAt = Date.now() - t0
    await sendComposer(window, window.getByTestId("composer-input"), "卡住时新开一句")
    await expect(window.locator('[data-chat-stage="true"]')).toContainText("stub-ok", { timeout: 20_000 })
    const newRepliedAt = Date.now() - t0
    await shot(window, "stuck1-3-new-session-sent")
    // 切回原会话，等夹具 12s 自己收尾。
    expect(await activeSessionId(window)).not.toBe(stuckSession)
    await openSession(window, stuckSession!)
    await expect(window.locator('[data-chat-stage="true"]')).toContainText("e2e-stub.txt", { timeout: 10_000 })
    const finalAt = await waitPhase(window, null, t0, 20_000)
    const title = window.getByTestId("tool-stop-title").first()
    await expect(title).toHaveAttribute("data-stop-view", /^(none_confirmed|maybe_partial|completed)$/, { timeout: 3_000 })
    const view = await title.getAttribute("data-stop-view")
    await expect(window.getByTestId("composer-send")).toBeVisible()
    await shot(window, "stuck1-4-final")
    expect(stuckAt).toBeGreaterThanOrEqual(7_500)
    expect(stuckAt).toBeLessThan(9_500)
    timing.STUCK_natural = { stoppingAt, stuckAt, newSessionClickAt: newAt, newSessionRepliedAt: newRepliedAt, finalAt, finalView: view }
  } finally {
    await closeForRelaunch(env.app)
    rmSync(env.workspace, { recursive: true, force: true })
    rmSync(env.userData, { recursive: true, force: true })
  }
})

test("STUCK ②：stuck 时设置可进出、切会话可用；「再停一次」→ rekill → final", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ extraEnv: { ENJOY_E2E_STUCK_TOOL: "1" } })
  try {
    const window = await firstWindow(env.app)
    const stuckSession = await activeSessionId(window)
    expect(stuckSession).toBeTruthy()
    const t0 = await allowAndStop(window)
    const stuckAt = await waitPhase(window, "stuck", t0, 10_000)
    await shot(window, "stuck2-1-stuck")
    await window.getByTestId("rail-settings").click()
    await expect(window).toHaveURL(/settings/, { timeout: 5_000 })
    await window.getByTestId("rail-chat").click()
    await openSession(window, stuckSession!)
    await expect(window.getByTestId("composer-stop")).toHaveAttribute("data-stop-phase", "stuck", { timeout: 5_000 })
    const restopAt = Date.now() - t0
    await window.getByTestId("composer-stop").click()
    const finalAt = await waitPhase(window, null, t0, 5_000)
    const title = window.getByTestId("tool-stop-title").first()
    await expect(title).toHaveAttribute("data-stop-view", /^(none_confirmed|maybe_partial|completed)$/, { timeout: 3_000 })
    const view = await title.getAttribute("data-stop-view")
    await shot(window, "stuck2-final-after-restop")
    expect(finalAt, "再停一次走 rekill，应早于夹具 12s 自己收尾").toBeLessThan(11_500)
    await sendComposer(window, window.getByTestId("composer-input"), "再停之后接着问")
    await expect(window.locator('[data-chat-stage="true"]')).toContainText("stub-ok", { timeout: 20_000 })
    timing.STUCK_restop = { stuckAt, restopAt, finalAt, restopToFinalMs: finalAt - restopAt, finalView: view }
  } finally {
    await closeForRelaunch(env.app)
    rmSync(env.workspace, { recursive: true, force: true })
    rmSync(env.userData, { recursive: true, force: true })
  }
})
