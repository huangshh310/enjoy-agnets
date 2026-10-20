/**
 * E1（luna 定稿）：停止 / 出错 / 额度用完后排队停住，输入框上方写明原因；继续 / 改一下再发 / 全部清空（toast 可撤回）；
 * 窗口高 ≤600 折成「已暂停 · 排队 N 条」；与 #136 失败卡「再发一次」联动（重发成功后排队的接着发）。
 * 真机（stub 引擎）：ENJOY_E2E_SEND=unreachable|billing + DELAY 让第一句先「在跑」、排队后再失败。
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/queue-pause-e1")
const made: string[] = []

const COPY = {
  zh: {
    skip: "跳过设置",
    stopped: "你停止了上一轮，排队的 2 条先不发。",
    errorHas: "排队的 1 条先不发，免得顺序乱。",
    quotaHas: "额度用完了",
    resendFirst: "先发上面这条，发出去后排队的会接着发。",
    collapsed: "已暂停 · 排队 2 条",
    cleared: "已清空 2 条排队",
    undo: "撤销"
  },
  en: {
    skip: "Skip setup",
    stopped: "You stopped the last turn, so 2 queued messages are on hold.",
    errorHas: "so 1 queued message is on hold to keep it in order.",
    quotaHas: "is out of credit, so 1 queued message is on hold.",
    resendFirst: "Send the one above first. The queue will continue after it goes through.",
    collapsed: "Paused · 2 queued",
    cleared: "Cleared 2 queued messages",
    undo: "Undo"
  }
} as const

function dirs() {
  const ws = mkdtempSync(join(tmpdir(), "enjoy-e1-ws-"))
  const ud = mkdtempSync(join(tmpdir(), "enjoy-e1-ud-"))
  made.push(ws, ud)
  writeFileSync(join(ws, "readme.md"), "# e2e\n")
  return { ENJOY_E2E_WORKSPACE: ws, ENJOY_E2E_USERDATA: ud }
}

async function boot(lang: "zh" | "en", env: Record<string, string> = {}) {
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ...dirs(),
    ...env
  })
  const window = await firstWindow(app)
  await window.setViewportSize({ width: 1280, height: 860 })
  const skip = window.getByRole("button", { name: COPY[lang].skip })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

const shot = (w: Page, name: string) => w.screenshot({ path: join(shots, `${name}.png`) })
const stage = (w: Page) => w.locator('[data-chat-stage="true"]')
const row = (w: Page) => w.getByTestId("queue-paused-row")

async function sendText(w: Page, text: string) {
  const c = w.getByTestId("composer-input")
  await c.fill(text)
  await c.press("Enter")
}
async function queueText(w: Page, text: string) {
  await sendText(w, text)
  await expect(w.getByTestId("queued-user-turn").filter({ hasText: text })).toHaveCount(1, { timeout: 8_000 })
}
/** 排队项没有自己发出去（等足够久）。 */
async function expectNotAutoSent(w: Page, text: string) {
  await w.waitForTimeout(4_000)
  await expect(stage(w).getByText(`stub-ok ${text}`)).toHaveCount(0)
  await expect(w.getByTestId("queued-user-turn").filter({ hasText: text })).toHaveCount(1)
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})
test.afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

for (const lang of ["zh", "en"] as const) {
  test(`停止（${lang}）：排队停住、灰色说明行在排队区顶部；不自己发；继续 → 按顺序发；≤600 折叠；全部清空 + 撤回`, async () => {
    test.setTimeout(240_000)
    const copy = COPY[lang]
    const { app, window } = await boot(lang)
    try {
      await sendText(window, "very slow 甲在跑")
      await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
      await queueText(window, "排队一")
      await queueText(window, "排队二")
      await window.getByTestId("composer-stop").click()
      await expect(row(window)).toBeVisible({ timeout: 8_000 })
      await expect(row(window)).toHaveAttribute("data-reason", "stopped")
      await expect(window.getByTestId("queue-paused-reason")).toHaveText(copy.stopped)
      // 同一容器、在排队行上面；容器紧贴输入框上方。
      const dock = window.getByTestId("queued-followups-docked")
      await expect(dock.getByTestId("queue-paused-row")).toHaveCount(1)
      const rowBox = (await row(window).boundingBox())!
      const firstQueued = (await dock.getByTestId("queued-user-turn").first().boundingBox())!
      const composerBox = (await window.getByTestId("composer-input").boundingBox())!
      expect(rowBox.y).toBeLessThan(firstQueued.y)
      expect(firstQueued.y).toBeLessThan(composerBox.y)
      // 按钮从左到右：全部清空 · 改一下再发 · 继续。
      const xs = await Promise.all(
        ["queue-paused-clear", "queue-paused-edit-first", "queue-paused-continue"].map(async (id) => (await window.getByTestId(id).boundingBox())!.x)
      )
      expect(xs[0]!).toBeLessThan(xs[1]!)
      expect(xs[1]!).toBeLessThan(xs[2]!)
      await expectNotAutoSent(window, "排队一")
      await shot(window, `e1-${lang}-1-stopped`)

      // ≤600 高：折成一行，点开展开。
      await window.setViewportSize({ width: 1280, height: 560 })
      await expect(window.getByTestId("queue-paused-collapsed")).toHaveText(copy.collapsed, { timeout: 5_000 })
      await expect(row(window)).toHaveCount(0)
      await shot(window, `e1-${lang}-4-collapsed-560`)
      await window.getByTestId("queue-paused-collapsed").click()
      await expect(row(window)).toBeVisible()
      await window.setViewportSize({ width: 1280, height: 860 })

      // 全部清空：不确认，toast，撤回后回来且仍停着。
      await window.getByTestId("queue-paused-clear").click()
      await expect(window.getByTestId("queued-user-turn")).toHaveCount(0)
      const toast = window.getByTestId("queue-cleared-toast")
      await expect(toast).toContainText(copy.cleared, { timeout: 5_000 })
      await shot(window, `e1-${lang}-5-cleared-toast`)
      await toast.getByRole("button", { name: copy.undo }).click()
      await expect(window.getByTestId("queued-user-turn")).toHaveCount(2, { timeout: 5_000 })
      await expect(row(window)).toHaveAttribute("data-reason", "stopped")
      await expectNotAutoSent(window, "排队一")

      if (lang === "zh") {
        // 继续：从第一条按顺序发。
        await window.getByTestId("queue-paused-continue").click()
        await expect(stage(window).getByText("stub-ok 排队一")).toBeVisible({ timeout: 20_000 })
        await expect(stage(window).getByText("stub-ok 排队二")).toBeVisible({ timeout: 30_000 })
        const order = await stage(window).locator("[data-thread-message]").allInnerTexts()
        const i1 = order.findIndex((text) => text.includes("排队一"))
        const i2 = order.findIndex((text) => text.includes("排队二"))
        expect(i1).toBeGreaterThanOrEqual(0)
        expect(i1).toBeLessThan(i2)
        await expect(row(window)).toHaveCount(0)
      }
    } finally {
      await closeForRelaunch(app)
    }
  })

  for (const kind of ["unreachable", "billing"] as const) {
    test(`${kind === "billing" ? "额度用完" : "出错"}（${lang}）：琥珀说明行；失败卡「再发一次」在时只提示先发上面这条；清空输入框后给继续 / 改一下再发`, async () => {
      test.setTimeout(240_000)
      const copy = COPY[lang]
      const { app, window } = await boot(lang, { ENJOY_E2E_SEND: kind, ENJOY_E2E_SEND_DELAY_MS: "6000", ENJOY_E2E_SEND_ONCE: "1" })
      try {
        await sendText(window, "第一句会失败")
        await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
        await queueText(window, "排队那句")
        await expect(row(window)).toBeVisible({ timeout: 20_000 })
        await expect(row(window)).toHaveAttribute("data-reason", kind === "billing" ? "quota" : "error")
        const reason = window.getByTestId("queue-paused-reason")
        await expect(reason).toContainText(kind === "billing" ? copy.quotaHas : copy.errorHas)
        // #136 联动：失败那句回到输入框、卡上有「再发一次」→ 继续 / 改一下再发隐藏，句尾提示先发上面这条。
        await expect(window.getByTestId("composer-input")).toHaveValue("第一句会失败")
        await expect(reason).toContainText(copy.resendFirst)
        await expect(window.getByTestId("queue-paused-continue")).toHaveCount(0)
        await expect(window.getByTestId("queue-paused-edit-first")).toHaveCount(0)
        await expect(window.getByTestId("queue-paused-clear")).toBeVisible()
        await expectNotAutoSent(window, "排队那句")
        await shot(window, `e1-${lang}-${kind === "billing" ? "3-quota" : "2-error"}-136-link`)

        if (lang === "zh") {
          // 点失败卡「再发一次」：失败那句先发出去，跑完后排队的自己接着发（自动解除暂停）。
          const retry = window.getByTestId(kind === "billing" ? "thread-credential-restricted-notice-retry" : "thread-credential-network-notice-action")
          await retry.click()
          await expect(stage(window).getByText("stub-ok 第一句会失败")).toBeVisible({ timeout: 20_000 })
          await expect(stage(window).getByText("stub-ok 排队那句")).toBeVisible({ timeout: 30_000 })
          const order = await stage(window).locator("[data-thread-message]").allInnerTexts()
          const a = order.findIndex((text) => text.includes("第一句会失败"))
          const b = order.findIndex((text) => text.includes("排队那句"))
          expect(a).toBeLessThan(b)
          await expect(row(window)).toHaveCount(0)
          await shot(window, `e1-zh-6-${kind}-resent-then-queue`)
        } else {
          // 不重发、把输入框清空：「再发一次」没了 → 继续 / 改一下再发回来。
          await window.getByTestId("composer-input").fill("")
          await expect(window.getByTestId("queue-paused-continue")).toBeVisible({ timeout: 5_000 })
          await expect(window.getByTestId("queue-paused-edit-first")).toBeVisible()
          await expect(reason).not.toContainText(copy.resendFirst)
          await shot(window, `e1-en-${kind === "billing" ? "3-quota" : "2-error"}-plain`)
          // 改一下再发：第一条进输入框，队列仍停着（这里只有 1 条，取走后队列空）。
          await window.getByTestId("queue-paused-edit-first").click()
          await expect(window.getByTestId("composer-input")).toHaveValue("排队那句")
          await expect(window.getByTestId("queued-user-turn")).toHaveCount(0)
          await window.waitForTimeout(2_000)
          await expect(stage(window).getByText("stub-ok 排队那句")).toHaveCount(0)
        }
      } finally {
        await closeForRelaunch(app)
      }
    })
  }
}

test("改一下再发（zh）：输入框有字时隐藏；空了才露出；点了第一条进输入框、其余仍停着", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot("zh")
  try {
    await sendText(window, "very slow 甲在跑")
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    await queueText(window, "排队一")
    await queueText(window, "排队二")
    await window.getByTestId("composer-stop").click()
    await expect(row(window)).toBeVisible({ timeout: 8_000 })
    await window.getByTestId("composer-input").fill("正在打的字")
    await expect(window.getByTestId("queue-paused-edit-first")).toHaveCount(0)
    await expect(window.getByTestId("queue-paused-continue")).toBeVisible()
    await window.getByTestId("composer-input").fill("")
    await window.getByTestId("queue-paused-edit-first").click()
    await expect(window.getByTestId("composer-input")).toHaveValue("排队一")
    await expect(window.getByTestId("queued-user-turn")).toHaveCount(1)
    await expect(row(window)).toHaveAttribute("data-reason", "stopped")
    await expectNotAutoSent(window, "排队二")
    await shot(window, "e1-zh-7-edit-first")
  } finally {
    await closeForRelaunch(app)
  }
})
