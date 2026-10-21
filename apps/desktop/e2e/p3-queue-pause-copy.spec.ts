/**
 * mike P3（#163 巡检，jojo patrol-211e3bbb + luna m211-33）：排队区 / 暂停行 / 插话提示 / 底栏 / 发送贴底。
 * 真机（stub 引擎，非 Git 临时工作区）。截图进 ENJOY_E2E_SHOTS_DIR（默认 test-results/p3-queue-pause-copy）。
 * 本机共享机器不跑；CI e2e-window 跑，luna / jojo 真机补截图。
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

/** stub 每词 0.4s、约 9s，不弹审批。 */
const SLOW = "slow a b c d e f g h i j k l m n o p q r s t u"
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/p3-queue-pause-copy")
const made: string[] = []

function dirs() {
  const ws = mkdtempSync(join(tmpdir(), "enjoy-p3-ws-"))
  const ud = mkdtempSync(join(tmpdir(), "enjoy-p3-ud-"))
  made.push(ws, ud)
  writeFileSync(join(ws, "readme.md"), "# e2e\n")
  return { ENJOY_E2E_WORKSPACE: ws, ENJOY_E2E_USERDATA: ud }
}

async function boot() {
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ...dirs()
  })
  const window = await firstWindow(app)
  await window.setViewportSize({ width: 1280, height: 860 })
  const skip = window.getByRole("button", { name: "跳过设置" })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

const shot = (w: Page, name: string) => w.screenshot({ path: join(shots, `${name}.png`) })
const stage = (w: Page) => w.locator('[data-chat-stage="true"]')

async function sendText(w: Page, text: string) {
  const c = w.getByTestId("composer-input")
  await c.fill(text)
  await c.press("Enter")
}
async function queueText(w: Page, text: string) {
  await sendText(w, text)
  await expect(w.getByTestId("queued-user-turn").filter({ hasText: text })).toHaveCount(1, { timeout: 8_000 })
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})
test.afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

test("5 条排队停住：733×480 折叠，点开后底下藏着的有「还有 N 条」；拉高再拉矮重新折起；非 Git 底栏不写「未检出分支」；暂停中又在跑时占位符换暂停句", async () => {
  test.setTimeout(240_000)
  const { app, window } = await boot()
  try {
    await sendText(window, SLOW)
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    for (const n of [1, 2, 3, 4, 5]) await queueText(window, `排队${n}`)
    await window.getByTestId("composer-stop").click()
    await expect(window.getByTestId("queue-paused-row")).toBeVisible({ timeout: 8_000 })

    // 10：非 Git 文件夹，底栏不写「未检出分支」。
    await expect(window.getByText("未检出分支")).toHaveCount(0)

    // 1 + 3：733×480 折成一行；点开后区内滚，底下藏着的行有「还有 N 条」，点一下滚到底、提示收起。
    await window.setViewportSize({ width: 733, height: 480 })
    const collapsed = window.getByTestId("queue-paused-collapsed")
    await expect(collapsed).toHaveText("已暂停 · 排队 5 条", { timeout: 5_000 })
    await collapsed.click()
    const dock = window.getByTestId("queued-followups-docked")
    await expect(dock).toHaveAttribute("data-mode", "all")
    const more = window.getByTestId("queued-hidden-below")
    await expect(more).toBeVisible({ timeout: 5_000 })
    await expect(more).toContainText(/还有 \d 条/)
    await shot(window, "p3-1-733x480-expanded-hidden-below")
    await more.click()
    await expect(window.getByTestId("queued-user-turn").last()).toBeInViewport({ ratio: 1, timeout: 5_000 })
    await expect(more).toHaveCount(0, { timeout: 5_000 })
    await shot(window, "p3-1-733x480-scrolled-to-last")

    // m211-33：拉高（>600）再拉回 ≤600，重新折成一行。
    await window.setViewportSize({ width: 733, height: 720 })
    await expect(window.getByTestId("queue-paused-row")).toBeVisible({ timeout: 5_000 })
    await window.setViewportSize({ width: 733, height: 480 })
    await expect(collapsed).toBeVisible({ timeout: 5_000 })
    await shot(window, "p3-3-733x480-refolded")

    // 12：队列停着、又手动发了一句（在跑）：占位符说「排队已暂停…点「继续」才发」，不说「任务进行中」。
    await window.setViewportSize({ width: 1280, height: 860 })
    await sendText(window, SLOW)
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    const composer = window.getByTestId("composer-input")
    await expect(composer).toHaveAttribute("placeholder", /排队已暂停/)
    await expect(composer).not.toHaveAttribute("placeholder", /任务进行中/)
    await shot(window, "p3-12-paused-running-placeholder")
    await window.getByTestId("composer-stop").click()
  } finally {
    await closeForRelaunch(app)
  }
})

test("11：插话提示「已收到，它下一步就会看到。」这一轮跑完自己收（不用点 ×）", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot()
  try {
    await sendText(window, SLOW)
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    const composer = window.getByTestId("composer-input")
    await composer.fill("顺便插一句")
    await composer.press("Control+Enter")
    const hint = window.getByText("已收到，它下一步就会看到。")
    await expect(hint).toBeVisible({ timeout: 10_000 })
    await shot(window, "p3-11-steered-hint")
    await expect(window.getByTestId("composer-stop")).toHaveCount(0, { timeout: 60_000 })
    await expect(hint).toHaveCount(0, { timeout: 5_000 })
    await shot(window, "p3-11-hint-gone-after-run")
  } finally {
    await closeForRelaunch(app)
  }
})

test("14：往上翻过之后再发一句，对话回到底部", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot()
  try {
    await window.setViewportSize({ width: 733, height: 480 })
    for (const n of [1, 2, 3, 4]) {
      await sendText(window, `第${n}句`)
      await expect(stage(window).getByText(`stub-ok 第${n}句`)).toBeVisible({ timeout: 20_000 })
    }
    const scroller = window.locator('[role="log"] > div').first()
    const box = (await scroller.boundingBox())!
    await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await window.mouse.wheel(0, -4000)
    const gap = () => scroller.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)
    await expect.poll(gap, { timeout: 5_000 }).toBeGreaterThan(40)
    await sendText(window, "最后一句")
    await expect(stage(window).getByText("stub-ok 最后一句")).toBeVisible({ timeout: 20_000 })
    await expect.poll(gap, { timeout: 5_000 }).toBeLessThan(8)
    await shot(window, "p3-14-scrolled-after-send")
  } finally {
    await closeForRelaunch(app)
  }
})

test("15：点「改一下再发」后自己发出去要贴底，之后再发也贴底（luna m4df B3e / C9：main 上离底 28→1068）", async () => {
  test.setTimeout(240_000)
  const { app, window } = await boot()
  try {
    // luna 的窗口 1024×640（>600，暂停行不折成一行）；先攒几轮让对话能滚。
    await window.setViewportSize({ width: 1024, height: 640 })
    for (const n of [1, 2, 3]) {
      await sendText(window, `第${n}句`)
      await expect(stage(window).getByText(`stub-ok 第${n}句`)).toBeVisible({ timeout: 20_000 })
    }
    await sendText(window, SLOW)
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    await queueText(window, "排队1")
    await queueText(window, "排队2")
    await window.getByTestId("composer-stop").click()
    await expect(window.getByTestId("queue-paused-row")).toBeVisible({ timeout: 8_000 })

    const scroller = window.locator('[role="log"] > div').first()
    const gap = () => scroller.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)

    // 「改一下再发」：第一条进输入框，队列仍停着。
    await window.getByTestId("queue-paused-edit-first").click()
    const composer = window.getByTestId("composer-input")
    await expect(composer).toHaveValue(/排队1/, { timeout: 5_000 })
    await composer.fill("改过的一句")
    await composer.press("Enter")
    await expect(stage(window).getByText("stub-ok 改过的一句")).toBeVisible({ timeout: 20_000 })
    await expect.poll(gap, { timeout: 5_000 }).toBeLessThan(8)
    await shot(window, "p3-15-after-edit-first-send")

    // 之后再发一句：仍贴底（不是只贴一次）。
    await sendText(window, "再来一句")
    await expect(stage(window).getByText("stub-ok 再来一句")).toBeVisible({ timeout: 20_000 })
    await expect.poll(gap, { timeout: 5_000 }).toBeLessThan(8)
    await shot(window, "p3-15-after-next-send")
  } finally {
    await closeForRelaunch(app)
  }
})
