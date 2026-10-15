/**
 * luna main-155 巡检顺手修（截图 /workspace/enjoy-docs/main-155-patrol-*.png）：
 * ① 新会话首发失败：红卡不把空态标题「在 xx 里做什么？」顶出可视区（patrol-21/22/51）。
 * ② 英文单复数：1 image；英文界面示例 chip 不出「@日历 help me in 日历…」。
 * ③ 文件 Tab 目录树窄时，「筛选文件…」不被裁（patrol-64）。
 * ④ 重启后选中的会话：历史回灌前不闪空态问候，只留空白占位；之后点「新对话」立刻出问候。
 * ⑤ 回灌一直不回来：8 秒兜底回空态。⑥ 回灌抛错：立刻回空态。⑦ 真空会话重启：回灌完就出问候。
 * ⑧ 侧栏切会话时回灌抛错：立刻回空态。⑨ 换会话时上一轮超时作废。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import {
  bootPendingApproval,
  closeForRelaunch,
  firstWindow,
  mainEntry,
  relaunchElectron,
  stubPath
} from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
type Box = { x: number; y: number; width: number; height: number }
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

function stubEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-l155-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-l155-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  return {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ...extra
  }
}

for (const lang of ["zh", "en"] as const) {
  test(`① 新会话首发失败（${lang}）：红卡不把空态标题顶出可视区`, async () => {
    test.setTimeout(120_000)
    test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
    const app = await relaunchElectron(stubEnv({ ENJOY_E2E_LANG: lang, ENJOY_E2E_SEND_WATCHDOG: "1" }))
    try {
      const window = await firstWindow(app)
      await window.setViewportSize({ width: 1024, height: 670 })
      await window.locator('[data-testid="sidebar-new-session"]').click()
      await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "fail.png", mimeType: "image/png", buffer: PNG })
      await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
      await window.locator('[data-testid="composer-input"]').click()
      await window.keyboard.press("Enter")
      const banner = window.locator('[data-testid="thread-error-banner"]')
      await expect(banner).toBeVisible({ timeout: 15_000 })
      await window.waitForTimeout(500)
      const upper = await box(window.locator('[data-testid="empty-start-upper"]'))
      const title = await box(window.locator('[data-testid="empty-start-upper"] h1'))
      const bannerBox = await box(banner)
      const debug = JSON.stringify({ upper, title, bannerBox })
      expect(title.y, `${lang}: title pushed above upper area ${debug}`).toBeGreaterThanOrEqual(upper.y - 0.5)
      expect(title.y + title.height, `${lang}: title below banner`).toBeLessThanOrEqual(bannerBox.y)
      expect(bannerBox.y + bannerBox.height, `${lang}: banner cut`).toBeLessThanOrEqual(upper.y + upper.height + 0.5)
      await expect(window.locator('[data-testid="composer-input"]')).toBeVisible()
      await snap(window, `1024x670-empty-fail-title-${lang}`)
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("② 英文：1 image 单数；示例 chip 用英文应用名，不出「@日历 help me in 日历…」", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const app = await relaunchElectron(stubEnv({ ENJOY_E2E_LANG: "en", ENJOY_E2E_CU_READY: "1" }))
  try {
    const window = await firstWindow(app)
    await window.setViewportSize({ width: 1024, height: 670 })
    await window.locator('[data-testid="sidebar-new-session"]').click()
    const pill = window.locator('[data-testid="empty-state-desktop-pill"]')
    await expect(pill).toBeVisible({ timeout: 15_000 })
    await expect(pill).toContainText("@Calendar help me in Calendar")
    await expect(pill).not.toContainText("日历")
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "one.png", mimeType: "image/png", buffer: PNG })
    const tray = window.locator('[data-testid="composer-attachment-tray"]')
    await expect(tray).toContainText("1 image", { timeout: 8_000 })
    await expect(tray).not.toContainText("1 images")
    await snap(window, "1024x670-en-1-image-calendar-pill")
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") })
    await expect(tray).toContainText("1 image · 1 file", { timeout: 8_000 })
    await snap(window, "1024x670-en-1-image-1-file")
  } finally {
    await closeForRelaunch(app)
  }
})

test("③ 文件 Tab 目录树窄：「筛选文件…」占位完整可见，展开/收起按钮在树列内", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    await window.setViewportSize({ width: 1024, height: 670 })
    await openFilesTab(window)
    await window.locator('[data-testid="files-tree-root"]').getByText("e2e-stub.txt").first().click()
    await window.waitForTimeout(600)
    const filter = window.locator('[data-testid="files-tree-filter"]')
    await expect(filter).toBeVisible()
    const fit = await filter.evaluate((el) => {
      const input = el as HTMLInputElement
      const style = getComputedStyle(input)
      const ctx = document.createElement("canvas").getContext("2d")!
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const text = ctx.measureText(input.placeholder).width
      const inner = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      return { text, inner, placeholder: input.placeholder }
    })
    expect(fit.inner, `placeholder clipped ${JSON.stringify(fit)}`).toBeGreaterThanOrEqual(fit.text)
    const tree = await box(window.locator('[data-testid="files-tree-root"]'))
    for (const name of ["全部展开", "全部折叠"]) {
      const btn = window.getByRole("button", { name }).first()
      const b = await box(btn)
      expect(b.x + b.width, `${name} outside tree column`).toBeLessThanOrEqual(tree.x + tree.width + 1)
    }
    await snap(window, "1024x670-files-tree-filter")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("④ 重启后选中的会话：历史回灌前不闪空态问候，回灌后出历史", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  const first = await relaunchElectron(env)
  try {
    const window = await firstWindow(first)
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "重启前一句 delta")
    await expect(window.locator("body")).toContainText("stub-ok 重启前一句 delta", { timeout: 20_000 })
    await window.waitForTimeout(800)
  } finally {
    await closeForRelaunch(first)
  }
  // 建会话也拉长 3 秒：点「新对话」后的创建窗里 sessionId 为空，picking 没复位就会白屏等兜底。
  const second = await relaunchElectron({
    ...env,
    ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "3000",
    ENJOY_DEV_DELAY_SESSION_CREATE_MS: "3000"
  })
  try {
    const window = await second.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.setViewportSize({ width: 1024, height: 670 })
    const greeting = window.locator('[data-testid="empty-start-upper"] h1')
    const loading = window.locator('[data-testid="thread-history-loading"]')
    let sawLoading = false
    let shot = false
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      expect(await greeting.count(), "empty-state greeting flashed before history").toBe(0)
      if ((await loading.count()) > 0) {
        sawLoading = true
        if (!shot) {
          await snap(window, "1024x670-restart-history-loading")
          shot = true
        }
      }
      if ((await window.locator("[data-thread-message]").count()) > 0) break
      await window.waitForTimeout(100)
    }
    expect(sawLoading, "never saw neutral loading placeholder").toBe(true)
    await expect(window.locator("body")).toContainText("stub-ok 重启前一句 delta", { timeout: 10_000 })
    await expect(greeting).toHaveCount(0)
    await snap(window, "1024x670-restart-history-loaded")
    // 挑前台会话的 picking 标记要在 loadWorkspace 结束时复位：之后点「新对话」（创建窗 3 秒、sessionId 为空）
    // 应立刻出问候，不白屏等兜底。
    const clickedAt = Date.now()
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(greeting).toBeVisible({ timeout: 2_000 })
    expect(Date.now() - clickedAt, "new chat greeting waited for the fallback timer").toBeLessThan(2_500)
    await expect(loading).toHaveCount(0)
  } finally {
    await closeForRelaunch(second)
  }
})

async function seedHistory(env: NodeJS.ProcessEnv, text: string): Promise<void> {
  const first = await relaunchElectron(env)
  try {
    const window = await firstWindow(first)
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), text)
    await expect(window.locator("body")).toContainText(`stub-ok ${text}`, { timeout: 20_000 })
    await window.waitForTimeout(800)
  } finally {
    await closeForRelaunch(first)
  }
}

async function openRelaunched(env: NodeJS.ProcessEnv) {
  const app = await relaunchElectron(env)
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.setViewportSize({ width: 1024, height: 670 })
  return {
    app,
    window,
    greeting: window.locator('[data-testid="empty-start-upper"] h1'),
    loading: window.locator('[data-testid="thread-history-loading"]')
  }
}

test("⑤ 回灌一直不回来（hang）：先空白占位，8 秒兜底后回到空态，不卡死", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  await seedHistory(env, "重启前一句 hang")
  const { app, window, greeting, loading } = await openRelaunched({ ...env, ENJOY_E2E_SESSION_MESSAGES_FAULT: "hang" })
  try {
    await expect(loading).toBeVisible({ timeout: 10_000 })
    const loadingAt = Date.now()
    await window.waitForTimeout(4_000)
    await expect(greeting, "greeting must wait for hydrate or the fallback").toHaveCount(0)
    await expect(greeting).toBeVisible({ timeout: 10_000 })
    expect(Date.now() - loadingAt).toBeGreaterThan(5_000)
    await expect(loading).toHaveCount(0)
    await expect(window.locator('[data-testid="composer-input"]')).toBeEditable()
    await snap(window, "1024x670-restart-hydrate-timeout-empty")
  } finally {
    await closeForRelaunch(app)
  }
})

test("⑥ 回灌失败（session.messages 抛错）：立刻回到空态，不停在加载中", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  await seedHistory(env, "重启前一句 error")
  const { app, window, greeting, loading } = await openRelaunched({
    ...env,
    ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "1500",
    ENJOY_E2E_SESSION_MESSAGES_FAULT: "error"
  })
  try {
    await expect(loading).toBeVisible({ timeout: 10_000 })
    const loadingAt = Date.now()
    await expect(greeting).toBeVisible({ timeout: 5_000 })
    expect(Date.now() - loadingAt, "failure fell through to the 8s fallback").toBeLessThan(5_000)
    await expect(loading).toHaveCount(0)
    await snap(window, "1024x670-restart-hydrate-error-empty")
  } finally {
    await closeForRelaunch(app)
  }
})

test("⑦ 真空会话重启：回灌完（不是靠 8 秒兜底）就出空态问候", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  const first = await relaunchElectron(env)
  try {
    const window = await firstWindow(first)
    await expect(window.locator('[data-testid="empty-start-upper"] h1')).toBeVisible({ timeout: 20_000 })
    await window.waitForTimeout(800)
  } finally {
    await closeForRelaunch(first)
  }
  const { app, window, greeting, loading } = await openRelaunched({ ...env, ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "2000" })
  try {
    const startedAt = Date.now()
    await expect(greeting).toBeVisible({ timeout: 15_000 })
    expect(Date.now() - startedAt, "empty session waited for the 8s fallback").toBeLessThan(7_500)
    await expect(loading).toHaveCount(0)
    await expect(window.locator("[data-thread-message]")).toHaveCount(0)
    await snap(window, "1024x670-restart-empty-session-greeting")
  } finally {
    await closeForRelaunch(app)
  }
})

/** 起一次，建两个带历史的会话 A、B（B 在前台），返回两者 id。 */
async function seedTwoSessions(env: NodeJS.ProcessEnv): Promise<{ a: string; b: string }> {
  const app = await relaunchElectron(env)
  try {
    const window = await firstWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    const ids: string[] = []
    for (const [index, text] of ["会话甲 一句", "会话乙 一句"].entries()) {
      if (index > 0) {
        await window.locator('[data-testid="sidebar-new-session"]').click()
        await expect(window.locator('[data-testid="empty-start-upper"] h1')).toBeVisible({ timeout: 10_000 })
      }
      await sendComposer(window, composer, text)
      await expect(window.locator("body")).toContainText(`stub-ok ${text}`, { timeout: 20_000 })
      const id = await window.evaluate(() => window.__enjoyE2e?.getComposerGate()?.sessionId ?? null)
      expect(id).toBeTruthy()
      ids.push(id as string)
    }
    await window.waitForTimeout(800)
    return { a: ids[0], b: ids[1] }
  } finally {
    await closeForRelaunch(app)
  }
}

function sessionRow(window: Page, sessionId: string): Locator {
  return window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId}"]`).first()
}

test("⑧ 侧栏切会话时回灌失败（session.messages 抛错）：立刻回到空态，不等 8 秒兜底", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  const { a } = await seedTwoSessions(env)
  const { app, window, greeting, loading } = await openRelaunched({
    ...env,
    ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "1500",
    ENJOY_E2E_SESSION_MESSAGES_FAULT: "error"
  })
  try {
    // 启动那次回灌也失败，先回到空态。
    await expect(greeting).toBeVisible({ timeout: 15_000 })
    await sessionRow(window, a).click()
    await expect(loading).toBeVisible({ timeout: 5_000 })
    const loadingAt = Date.now()
    await expect(greeting).toBeVisible({ timeout: 5_000 })
    expect(Date.now() - loadingAt, "sidebar switch fell through to the 8s fallback").toBeLessThan(5_000)
    await expect(loading).toHaveCount(0)
    await snap(window, "1024x670-sidebar-switch-hydrate-error-empty")
  } finally {
    await closeForRelaunch(app)
  }
})

test("⑨ 换会话时上一轮的超时作废：B 兜底超时后 B→A→B，切回 B 仍先等回灌", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = stubEnv()
  const { a, b } = await seedTwoSessions(env)
  const { app, window, greeting, loading } = await openRelaunched({ ...env, ENJOY_E2E_SESSION_MESSAGES_FAULT: "hang" })
  try {
    // 启动选中 B，回灌一直不回来：8 秒兜底后出空态。
    await expect(loading).toBeVisible({ timeout: 10_000 })
    await expect(greeting).toBeVisible({ timeout: 12_000 })
    expect(await window.evaluate(() => window.__enjoyE2e?.getComposerGate()?.sessionId ?? null)).toBe(b)
    await sessionRow(window, a).click()
    await expect(loading).toBeVisible({ timeout: 5_000 })
    await sessionRow(window, b).click()
    await expect
      .poll(() => window.evaluate(() => window.__enjoyE2e?.getComposerGate()?.sessionId ?? null), { timeout: 5_000 })
      .toBe(b)
    // 切回 B：上一轮 B 的超时不能直接算数，要重新等。
    await expect(loading).toBeVisible({ timeout: 2_000 })
    for (let i = 0; i < 20; i += 1) {
      expect(await greeting.count(), "stale timeout let greeting show right after switching back").toBe(0)
      await window.waitForTimeout(100)
    }
    await snap(window, "1024x670-switch-back-after-timeout-loading")
  } finally {
    await closeForRelaunch(app)
  }
})

async function openFilesTab(window: Page): Promise<void> {
  const tree = window.locator('[data-testid="files-tree-root"]')
  if (await tree.isVisible().catch(() => false)) return
  const shell = window.locator('[data-testid="right-pane-shell"]')
  const expand = window.getByRole("button", { name: "展开改动面板" })
  if (await expand.isVisible().catch(() => false)) await expand.click()
  await shell.waitFor({ timeout: 10_000 })
  const tab = window.getByRole("tab", { name: "文件" })
  if ((await tab.count()) > 0) await tab.first().click()
  else await shell.getByText("文件", { exact: true }).first().click()
  await tree.waitFor({ timeout: 15_000 })
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value).toBeTruthy()
  return value as Box
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
