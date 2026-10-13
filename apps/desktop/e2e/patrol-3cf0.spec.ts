/**
 * luna 巡检 main 3cf0e66：
 * - P1-2：「文件」里点过 .html，再批准写 .txt：待验收条不出「在浏览器打开」（只看条目自己的路径）。
 * - P2-3：重启后「重启后已中断」只在小卡里出现一次。
 * - 10：733 宽下待验收条文件名用省略号收尾。
 * - 文案：手动触发不出「到点才跑」提示；收件箱「等你决定」「复制排障信息」，不出「拍板」。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时按 733x480 / 1440x920 × 浅/深 落盘。
 */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"
import {
  bootPendingApproval,
  closeForRelaunch,
  crashKill,
  firstWindow,
  mainEntry,
  relaunchElectron,
  stubPath
} from "./approval-restart-helpers"

const SIZES = [
  { width: 733, height: 480 },
  { width: 1440, height: 920 }
] as const
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const LONG_HTML = "a-really-long-landing-page-file-name-for-ellipsis-check.html"

test("「文件」里点过 .html，批准写 .txt 后待验收条不出「在浏览器打开」，733 下文件名省略号", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ files: { [LONG_HTML]: "<!doctype html><h1>hi</h1>\n" } })
  try {
    const window = await firstWindow(env.app)
    await window.setViewportSize({ width: 1440, height: 920 })
    await openFilesTab(window)
    const htmlRow = window.locator('[data-testid="files-tree-root"]').getByText(LONG_HTML)
    await htmlRow.click({ timeout: 15_000 })
    await expect
      .poll(() => window.evaluate(() => document.body.innerText.includes("<h1>") || true))
      .toBe(true)
    await window.waitForTimeout(600)
    await snap(window, "1440x920-html-selected-light")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    const gate = window.locator('[data-testid="review-gate-card"]')
    await expect(gate).toBeVisible({ timeout: 20_000 })
    await setGateOpen(window, true)
    await expect(window.locator('[data-testid="review-gate-file"]')).toContainText("e2e-stub.txt")
    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        await window.waitForTimeout(500)
        await expect(gate).not.toContainText("在浏览器打开")
        await expect(window.locator("body")).not.toContainText("在浏览器打开")
        await snap(window, `${size.width}x${size.height}-gate-after-html-${theme}`)
      }
    }
    await setTheme(window, "light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("733 宽下待验收条长文件名用省略号收尾", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    await expect(window.locator('[data-testid="review-gate-card"]')).toBeVisible({ timeout: 20_000 })
    await setGateOpen(window, true)
    // 733×920 展开是文件胶囊；733×480（矮窗）展开是同一行文件句。两处都要省略号收尾。
    for (const [height, sel] of [
      [920, '[data-testid="review-gate-expanded"] [data-testid="review-gate-file"] span.truncate'],
      [480, '[data-testid="review-gate-compact"]']
    ] as const) {
      await window.setViewportSize({ width: 733, height })
      await window.waitForTimeout(500)
      const target = window.locator(sel).last()
      await expect(target, `733x${height} ${sel}`).toBeVisible()
      const res = await target.evaluate((span) => {
        span.textContent = "x".repeat(400) + ".txt"
        const cs = getComputedStyle(span)
        const r = span.getBoundingClientRect()
        return {
          ellipsis: cs.textOverflow,
          clipped: span.scrollWidth > span.clientWidth + 1,
          fits: r.right <= window.innerWidth,
          sw: span.scrollWidth,
          cw: span.clientWidth
        }
      })
      expect(res.ellipsis, `733x${height}`).toBe("ellipsis")
      expect(res.clipped && res.fits, `733x${height} ${JSON.stringify(res)}`).toBe(true)
      await snap(window, `733x${height}-gate-long-name-light`)
    }
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("重启后「重启后已中断」只在小卡里出现一次", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ slowTool: true })
  try {
    const first = await firstWindow(env.app)
    await first.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect(first.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 10_000 })
    await first.waitForTimeout(300)
  } finally {
    await crashKill(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    const notice = window.locator('[data-testid="thread-notice-banner"]')
    await expect(notice).toBeVisible({ timeout: 20_000 })
    await expect(notice).toContainText("重启后已中断")
    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        await window.waitForTimeout(500)
        const count = await window.evaluate(() => {
          const text = document.querySelector('[data-testid="chat-conversation"]')?.textContent ?? ""
          return text.split("重启后已中断").length - 1
        })
        expect(count, `${size.width} ${theme}: 重启后已中断 x${count}`).toBe(1)
        await snap(window, `${size.width}x${size.height}-restart-once-${theme}`)
      }
    }
    // 展开步骤也不再多一处。
    const header = window.getByText("这一步没做完").first()
    if (await header.isVisible()) await header.click()
    await window.waitForTimeout(300)
    const after = await window.evaluate(
      () => (document.querySelector('[data-testid="chat-conversation"]')?.textContent ?? "").split("重启后已中断").length - 1
    )
    expect(after, "expanded step adds 重启后已中断").toBe(1)
    await setTheme(window, "light")
  } finally {
    await closeForRelaunch(second)
  }
})

test("文案：手动自动化不出「到点才跑」；收件箱用「等你决定」「复制排障信息」", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        const tag = `${size.width}x${size.height}`
        await go(window, "#/inbox")
        await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 15_000 })
        await window.locator('[data-testid="inbox-row"]').first().click()
        await window.waitForTimeout(500)
        const body = window.locator("body")
        await expect(body).not.toContainText("拍板")
        await expect(body).not.toContainText("复制会话 ID")
        await expect(body).not.toContainText("ses_")
        await expect(body).toContainText("等你决定")
        await expect(body).toContainText("复制排障信息")
        await snap(window, `${tag}-inbox-${theme}`)

        await go(window, "#/automations")
        await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
        await window.getByRole("button", { name: "新建", exact: true }).first().click()
        await expect(window.locator('[data-testid="automation-save"]')).toBeVisible({ timeout: 10_000 })
        const dialog = window.locator("body")
        await expect(dialog).toContainText("立即运行")
        await expect(window.locator('[data-testid="automation-footer-hint"]')).toHaveCount(0)
        await expect(dialog).not.toContainText("到了设定时间")
        await snap(window, `${tag}-automation-manual-${theme}`)
        await window.keyboard.press("Escape")
        await window.waitForTimeout(300)
        const discard = window.getByRole("button", { name: "放弃" })
        if (await discard.isVisible().catch(() => false)) await discard.click()
        await window.keyboard.press("Escape")
        await go(window, "#/")
      }
    }
    await go(window, "#/")
    await expect(window.locator("body")).not.toContainText("立即插话")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("失败会话：本会话有红卡与重试；切走再回来仍在；重启后从档案还原", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "stub store error")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toBeVisible({ timeout: 20_000 })
    await expect(banner).toContainText("这次没执行成功")
    await expect(window.locator('[data-testid="thread-error-retry"]')).toBeVisible()
    await snap(window, "1440x920-session-error-light")
    // 侧栏失败会话有出错点，不是进行中蓝点。
    await expect(window.locator('[data-testid="session-row-failed"]').first()).toBeVisible({ timeout: 10_000 })
    // 新对话后切回：红卡还在（park / Attention 还原）。
    await window.getByRole("button", { name: "新对话" }).first().click()
    await window.waitForTimeout(800)
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await window.locator('[data-testid="sidebar-session-row"]').first().click()
    await expect(banner).toBeVisible({ timeout: 15_000 })
    await expect(window.locator('[data-testid="thread-error-retry"]')).toBeVisible()
  } finally {
    await closeForRelaunch(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    // 重启后点 Inbox「失败」打开会话：红卡从档案还原。
    // 重启后侧栏失败点与红卡同源一致：档案回填进槽表，红点还在（luna #150 P2）。
    await expect(window.locator('[data-testid="session-row-failed"]').first()).toBeVisible({ timeout: 15_000 })
    // 只有失败时：左栏收件箱有徽标；打开收件箱直接落在「失败」页签，不停在空的「等你决定」（luna #151）。
    await expect(window.locator('[data-testid="rail-inbox"]')).toHaveAttribute("aria-label", /\s1$/, { timeout: 15_000 })
    await go(window, "#/inbox")
    await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="inbox-row"]').first()).toBeVisible({ timeout: 10_000 })
    await window.locator('[data-testid="inbox-row"]').first().click()
    await window.waitForTimeout(400)
    const open = window.getByRole("button", { name: "打开会话" })
    await expect(open).toBeVisible({ timeout: 10_000 })
    await open.click()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-error-retry"]')).toBeVisible()
    await snap(window, "1440x920-session-error-after-restart-light")
    // 733×480：本会话红卡在场时「需处理 · 出错」不再盖住红卡标题（luna g152）。
    await window.setViewportSize({ width: 733, height: 480 })
    await window.waitForTimeout(400)
    const redCard = (await window.locator('[data-testid="thread-error-banner"]').boundingBox())!
    const strips = window.locator('[data-testid="attention-strip"]')
    for (let i = 0; i < (await strips.count()); i++) {
      const box = await strips.nth(i).boundingBox()
      if (box) expect(box.y + box.height <= redCard.y || box.y >= redCard.y + redCard.height, "需处理条不压红卡").toBe(true)
    }
    await expect(window.locator('[data-testid="attention-needs-bar"]')).toHaveCount(0)
    await snap(window, "733x480-redcard-no-needs-bar-light")
    await window.setViewportSize({ width: 1440, height: 920 })
    // 成功跑完一轮：红点 / 待处理条 / 收件箱失败 / 徽标当场清掉，不等重启（luna #151）。
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "hello")
    await expect(window.locator("body")).toContainText("stub-ok", { timeout: 20_000 })
    await expect(window.locator('[data-testid="session-row-failed"]')).toHaveCount(0, { timeout: 10_000 })
    await expect(window.locator('[data-testid="rail-inbox"]')).not.toHaveAttribute("aria-label", /\s\d+$/)
    await go(window, "#/inbox")
    await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 15_000 })
    await window.getByText("失败", { exact: true }).first().click()
    await window.waitForTimeout(400)
    await expect(window.locator('[data-testid="inbox-row"]')).toHaveCount(0)
  } finally {
    await closeForRelaunch(second)
  }
  // 重启后也不复活（档案里的出错已重写为 resolved）。
  const third = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(third)
    await expect(window.locator('[data-testid="rail-inbox"]')).not.toHaveAttribute("aria-label", /\s\d+$/)
    await expect(window.locator('[data-testid="session-row-failed"]')).toHaveCount(0)
  } finally {
    await closeForRelaunch(third)
  }
})

test("ENJOY_E2E_DISMISS_ERROR=fail：关红卡落库失败 → 重试一次后弹 toast（leo #151）", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ extraEnv: { ENJOY_E2E_DISMISS_ERROR: "fail" } })
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "stub store error")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toBeVisible({ timeout: 20_000 })
    await window.locator('[data-testid="thread-error-dismiss"]').click()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.getByText("提示已关，但没记住，重启后可能还会出现。")).toBeVisible({ timeout: 10_000 })
    await snap(window, "1440x920-dismiss-error-fail-toast-light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("灰条与红卡：灰条在场时不画红卡、本会话出错项仍上「需处理」条；换回真失败又出红卡（leo / luna #151）", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "stub store error")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toBeVisible({ timeout: 20_000 })
    const realError = await window.evaluate(() => window.__enjoyE2e?.getComposerGate().error ?? null)
    // 用桩把 store.error 换成「上一条还在准备」：灰条出来，红卡让位。
    await window.evaluate(() => window.__enjoyE2e?.setError("PREVIOUS_STILL_PREPARING"))
    const rail = window.locator('[data-testid="composer-previous-preparing"]')
    await expect(rail).toBeVisible({ timeout: 5_000 })
    await expect(banner).toHaveCount(0)
    // 灰条不算红卡：本会话出错项不被误藏（必修 1）。
    await expect(window.locator('[data-testid="attention-needs-bar"]')).toBeVisible({ timeout: 5_000 })
    await snap(window, "1440x920-rail-with-needs-bar-light")
    // 换回真失败：红卡回来，同会话出错项让位。
    await window.evaluate((msg) => window.__enjoyE2e?.setError(msg), realError)
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(rail).toHaveCount(0)
    await expect(window.locator('[data-testid="attention-needs-bar"]')).toHaveCount(0)
    await snap(window, "1440x920-redcard-after-rail-light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("关掉红卡：切走再切回、重启后都不复活；红点 / 收件箱失败一起消失（leo #151 + #150 水位）", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "stub store error")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="session-row-failed"]').first()).toBeVisible({ timeout: 10_000 })
    await window.locator('[data-testid="thread-error-dismiss"]').click()
    await expect(banner).toHaveCount(0)
    await expect(window.locator('[data-testid="session-row-failed"]')).toHaveCount(0, { timeout: 10_000 })
    // 切走再切回：不复活。
    await window.getByRole("button", { name: "新对话" }).first().click()
    await window.waitForTimeout(800)
    await window.locator('[data-testid="sidebar-session-row"]').first().click()
    await window.waitForTimeout(1_500)
    await expect(banner).toHaveCount(0)
    await expect(window.locator('[data-testid="rail-inbox"]')).not.toHaveAttribute("aria-label", /\s\d+$/)
  } finally {
    await closeForRelaunch(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    await window.locator('[data-testid="sidebar-session-row"]').first().click()
    await window.waitForTimeout(1_500)
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="session-row-failed"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="rail-inbox"]')).not.toHaveAttribute("aria-label", /\s\d+$/)
    await snap(window, "1440x920-session-error-dismissed-after-restart-light")
  } finally {
    await closeForRelaunch(second)
  }
})

test("733×480 空会话：还稿红卡在上方时 Composer 两行文字与发送钮整块可见（luna #150 P3，只改布局）", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await window.getByRole("button", { name: "新对话" }).first().click()
    await window.waitForTimeout(600)
    await window.setViewportSize({ width: 733, height: 480 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.fill("后打的B\n先发的A")
    await window.evaluate(() =>
      (globalThis as { __enjoyE2e?: { setError: (m: string) => void } }).__enjoyE2e?.setError("SEND_FAILED_RESTORE_MERGED")
    )
    await expect(window.locator('[data-testid="thread-error-banner"]')).toBeVisible({ timeout: 5_000 })
    await window.waitForTimeout(400)
    const vp = window.viewportSize()!
    const status = await window.locator("form[data-composer]").boundingBox()
    const input = (await composer.boundingBox())!
    const send = (await window.locator('[data-testid="composer-send"]').boundingBox())!
    expect(status).not.toBeNull()
    // 输入框（两行）与发送钮都在视口内，不被压到状态栏下。
    expect(input.y + input.height, JSON.stringify({ input, vp })).toBeLessThanOrEqual(vp.height)
    expect(send.y + send.height, JSON.stringify({ send, vp })).toBeLessThanOrEqual(vp.height - 20)
    const hit = await window.locator('[data-testid="composer-send"]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return Boolean(at && (at === el || el.contains(at)))
    })
    expect(hit).toBe(true)
    // 红卡贴着 Composer 上沿露出来（滚动原点在底），不被挤出视口、不压 Composer。
    const card = (await window.locator('[data-testid="thread-error-banner"]').boundingBox())!
    const form = (await window.locator("form[data-composer]").boundingBox())!
    expect(card.y, JSON.stringify({ card, form })).toBeGreaterThanOrEqual(0)
    expect(card.y + card.height, JSON.stringify({ card, form })).toBeLessThanOrEqual(form.y + 1)
    await snap(window, "733x480-empty-merged-redcard-light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("440×480：窄窗只在本次运行收起侧栏、回宽窗恢复偏好；长命令审批的拒绝 / 运行在 Composer 之上、点得到", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  const nav = (window: Page) => window.locator('[data-testid="nav-card"]')
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "run long")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 20_000 })
    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      await window.setViewportSize({ width: 440, height: 480 })
      await window.waitForTimeout(600)
      await expect(nav(window)).toHaveAttribute("data-collapsed", "true")
      await expectButtonsReachable(window, `440x480 long ${theme}`)
      await snap(window, `440x480-approval-long-${theme}`)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        await window.waitForTimeout(500)
        // 回到宽窗（≥600）：自动收起只管窄窗那一段，侧栏回到用户偏好（展开）。
        await expect(nav(window)).toHaveAttribute("data-collapsed", "false")
        await expectButtonsReachable(window, `${size.width}x${size.height} long ${theme}`)
        await snap(window, `${size.width}x${size.height}-approval-long-${theme}`)
      }
    }
    await setTheme(window, "light")
    // 停在窄窗（自动收起）时关掉。
    await window.setViewportSize({ width: 440, height: 480 })
    await window.waitForTimeout(400)
    await expect(nav(window)).toHaveAttribute("data-collapsed", "true")
  } finally {
    await closeForRelaunch(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    // 自动收起不是偏好：宽窗重启是展开。
    await expect(nav(window)).toHaveAttribute("data-collapsed", "false", { timeout: 15_000 })
    // 用户手动收起才是偏好：写进去，跨窄窗进出都保持。
    await window.locator('[data-testid="sidebar-toggle"]').click()
    await expect(nav(window)).toHaveAttribute("data-collapsed", "true")
    await window.setViewportSize({ width: 440, height: 480 })
    await window.waitForTimeout(400)
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(400)
    await expect(nav(window)).toHaveAttribute("data-collapsed", "true")
  } finally {
    await closeForRelaunch(second)
  }
  const third = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(third)
    // 手动收起跨重启保留。
    await expect(nav(window)).toHaveAttribute("data-collapsed", "true", { timeout: 15_000 })
    await window.setViewportSize({ width: 440, height: 480 })
    await window.waitForTimeout(600)
    await snap(window, "440x480-after-restart-light")
    // 手动展开 → 偏好回到展开。
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(400)
    await window.locator('[data-testid="sidebar-toggle"]').click()
    await expect(nav(window)).toHaveAttribute("data-collapsed", "false")
  } finally {
    await closeForRelaunch(third)
  }
})

for (const lang of ["en", "zh"] as const) {
test(`${lang} 440×480：审批三钮（总是允许 · 拒绝 · 运行）都在卡内、点得到，会话钮可见文字带范围（luna / leo #151）`, async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ lang })
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "run bash ls")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 20_000 })
    await window.setViewportSize({ width: 440, height: 480 })
    await window.waitForTimeout(600)
    const card = await window.locator('[data-testid="permission-dock"] article').boundingBox()
    expect(card).not.toBeNull()
    const ids = ["approval-session", "approval-deny", "approval-allow"]
    const boxes: { x: number; y: number }[] = []
    for (const id of ids) {
      const btn = window.locator(`[data-testid="${id}"]`)
      await expect(btn, id).toBeVisible()
      const b = (await btn.boundingBox())!
      boxes.push({ x: b.x, y: b.y })
      expect(b.x, `${id} left of card ${JSON.stringify({ b, card })}`).toBeGreaterThanOrEqual(card!.x - 1)
      expect(b.x + b.width, `${id} past card right ${JSON.stringify({ b, card })}`).toBeLessThanOrEqual(card!.x + card!.width + 1)
      const hit = await btn.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const pts = [r.left + 3, r.left + r.width / 2, r.right - 3]
        return pts.every((x) => {
          const at = document.elementFromPoint(x, r.top + r.height / 2)
          return Boolean(at && (at === el || el.contains(at)))
        })
      })
      expect(hit, `${id} not clickable edge-to-edge`).toBe(true)
    }
    // 范围词必须看得见：不靠截断后的残字（leo #151）。
    const visible = await window.locator('[data-testid="approval-session"]').evaluate((el) => {
      const shown = [...el.querySelectorAll("span")].filter((s) => getComputedStyle(s).display !== "none")
      return shown.map((s) => {
        const clipped = s.scrollWidth > s.clientWidth + 1
        return { text: s.textContent ?? "", clipped }
      })
    })
    expect(visible.length, JSON.stringify(visible)).toBe(1)
    expect(visible[0]!.clipped, `session label clipped ${JSON.stringify(visible)}`).toBe(false)
    // 换行不截断：可见文字就是全称（luna #151）。
    expect(visible[0]!.text).toBe(lang === "en" ? "Always allow this session" : "本会话总是允许")
    const sessionBtn = window.locator('[data-testid="approval-session"]')
    await expect(sessionBtn).toHaveAttribute("aria-label", lang === "en" ? "Always allow this session" : "本会话总是允许")
    expect(await sessionBtn.getAttribute("title")).toContain(lang === "en" ? "Always allow this session" : "本会话总是允许")
    // 顺序锁死：总是允许 · 拒绝 · 运行（按阅读顺序：换行时下一行在后；同一行左在前）。
    const before = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      b.y > a.y + 4 || (Math.abs(b.y - a.y) <= 4 && a.x < b.x)
    expect(before(boxes[0]!, boxes[1]!), JSON.stringify(boxes)).toBe(true)
    expect(before(boxes[1]!, boxes[2]!), JSON.stringify(boxes)).toBe(true)
    // 拒绝 / 运行同一行。
    expect(Math.abs(boxes[1]!.y - boxes[2]!.y)).toBeLessThanOrEqual(4)
    await snap(window, `440x480-approval-${lang}-light`)
    await window.locator('[data-testid="approval-allow"]').click()
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
  } finally {
    await closeForRelaunch(env.app)
  }
})
}

async function expectButtonsReachable(window: Page, label: string): Promise<void> {
  const dump = await window.evaluate(() => {
    const q = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return [Math.round(r.y), Math.round(r.height), Math.round(r.width)]
    }
    return {
      conv: q('[data-testid="chat-conversation"]'),
      dock: q('[data-testid="permission-dock"]'),
      card: q('[data-testid="permission-dock"] article'),
      body: q('[data-testid="approval-card-body"]'),
      cmd: q('[data-testid="approval-command-block"]'),
      form: q("form[data-composer]"),
      input: q('[data-testid="composer-input"]')
    }
  })
  console.log(`[layout] ${label} ${JSON.stringify(dump)}`)
  const form = await window.locator("form[data-composer]").boundingBox()
  for (const id of ["approval-deny", "approval-allow"]) {
    const btn = window.locator(`[data-testid="${id}"]`)
    await expect(btn, `${label}: ${id}`).toBeVisible()
    const b = await btn.boundingBox()
    expect(b, `${label}: ${id} box`).not.toBeNull()
    const vp = window.viewportSize()!
    expect(b!.x >= 0 && b!.y >= 0 && b!.x + b!.width <= vp.width + 1 && b!.y + b!.height <= vp.height + 1, `${label}: ${id} out of viewport ${JSON.stringify(b)}`).toBe(true)
    if (form) expect(b!.y + b!.height, `${label}: ${id} under composer ${JSON.stringify({ b, form })}`).toBeLessThanOrEqual(form.y + 1)
    const hit = await btn.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return Boolean(at && el.contains(at))
    })
    expect(hit, `${label}: ${id} covered`).toBe(true)
  }
}

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

async function setGateOpen(window: Page, open: boolean): Promise<void> {
  const expanded = window.locator('[data-testid="review-gate-expanded"]')
  if ((await expanded.count()) > 0 !== open) {
    await window.locator('[data-testid="review-gate-card"] button').first().click()
  }
  await expect(expanded).toHaveCount(open ? 1 : 0)
  await window.waitForTimeout(400)
}

async function go(window: Page, hash: string): Promise<void> {
  await window.evaluate((h) => {
    location.hash = h
  }, hash)
  await window.waitForTimeout(400)
}

async function setTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  const dark = await window.evaluate(() => document.documentElement.classList.contains("dark"))
  if (dark === (theme === "dark")) return
  await window.getByRole("button", { name: theme === "dark" ? "深色" : "浅色" }).click()
  await expect
    .poll(() => window.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(theme === "dark")
  await window.waitForTimeout(800)
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
