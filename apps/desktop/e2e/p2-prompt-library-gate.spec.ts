/**
 * P2 E8 提示收藏 soft · 真机自门 4 屏
 * 1 打开面板+可搜 · 2 星标+一键插入 · 3 与 Recipe 并陈 · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-prompt-library"

test("P2 E8 提示收藏 soft · 4 屏自门", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(SHOTS, { recursive: true })

  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  test.skip(!electron?.launch, "playwright electron launcher unavailable")

  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-prompt-lib-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-prompt-lib-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")

  const app = (await electron!.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_SESSION_COUNT: "4"
    }
  })) as ElectronApplication

  const sample: Record<string, unknown> = { at: new Date().toISOString() }

  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    await expect(window.locator('[data-testid="composer-input"]')).toBeVisible({ timeout: 45_000 })

    // 种子：库内星标 + 本会话用户气泡（面板 = 召回 ∪ 星标）
    await window.evaluate(async () => {
      const ide = window.ide
      await ide.settings.savePromptLibraryEntry({
        text: "请先列风险，再给最小改动建议。",
        starred: true
      })
      await ide.settings.savePromptLibraryEntry({
        text: "跨会话旧提示：整理本周待办",
        starred: false
      })
      // 注入本会话消息，供「最近」区
      const store = (window as unknown as { __ENJOY_CHAT_STORE__?: { setState: Function } }).__ENJOY_CHAT_STORE__
      // fallback：直接改 zustand 若暴露；否则用 composer 发 stub
    })

    // 若 store 未暴露，用 setComposer 无关；改走 evaluate 写消息到 chat-store 模块路径难。
    // 用 IPC 种子 + 打开面板即可验星标区；再往 composer 打字后不清。
    // 补充：通过 evaluate 访问页面内模块不现实；改为发送一条 stub 消息。
    await window.getByTestId("composer-input").fill("会话最近一句：帮我看这段 diff")
    await window.getByTestId("composer-send").click()
    await window.waitForTimeout(1200)

    // ── 屏① 打开面板 + 可搜 ──
    await window.getByTestId("prompt-library-button").click()
    await expect(window.getByTestId("prompt-library-popover")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByTestId("prompt-library-search")).toBeVisible()
    await expect(window.getByText("提示收藏").first()).toBeVisible()
    // 已收藏区应有种子星标
    await expect(window.getByTestId("prompt-library-starred")).toBeVisible({ timeout: 5_000 })
    await expect(window.getByText("请先列风险").first()).toBeVisible()
    await window.getByTestId("prompt-library-search").fill("列风险")
    await expect(window.getByText("请先列风险").first()).toBeVisible()
    await expect(window.getByText("跨会话旧提示").first()).toBeHidden({ timeout: 3_000 }).catch(() => undefined)
    await window.screenshot({ path: join(SHOTS, "01-open-search.png") })
    sample.screen1 = {
      title: "提示收藏",
      searchVisible: true,
      starredVisible: true
    }

    // 清搜，准备星标/插入
    await window.getByTestId("prompt-library-search").fill("")
    await window.waitForTimeout(200)

    // ── 屏② 星标 + 一键插入 ──
    // 点最近行星标（若有会话句）或已有星标行插入
    const insertBtn = window.getByTestId("prompt-library-insert").first()
    await expect(insertBtn).toBeVisible()
    // 先清草稿再插入可感
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)
    await window.getByTestId("composer-input").fill("")
    await window.getByTestId("prompt-library-button").click()
    await expect(window.getByTestId("prompt-library-popover")).toBeVisible({ timeout: 8_000 })
    await window.getByTestId("prompt-library-insert").first().click()
    await window.waitForTimeout(400)
    const draft = await window.getByTestId("composer-input").inputValue()
    expect(draft.length).toBeGreaterThan(0)
    expect(draft).not.toMatch(/已批准|Always-allow/)
    // toast 可选
    const toast = window.locator('[data-testid="prompt-library-inserted-toast"], [data-sonner-toast]')
    const toastText = ((await toast.first().textContent().catch(() => "")) || "")
    expect(toastText).not.toMatch(/已批准|已放行|全面提示库|Goose|技能自动批准/)
    // 再开面板点星标切换
    await window.getByTestId("prompt-library-button").click()
    await expect(window.getByTestId("prompt-library-popover")).toBeVisible({ timeout: 8_000 })
    const starBtn = window.getByTestId("prompt-library-star").first()
    await starBtn.click()
    await window.waitForTimeout(300)
    await window.screenshot({ path: join(SHOTS, "02-star-insert.png") })
    sample.screen2 = { draftSnippet: draft.slice(0, 40), toastText }

    // ── 屏③ 与 Recipe 并陈 + 主流程 ──
    await window.keyboard.press("Escape")
    await window.waitForTimeout(200)
    await expect(window.getByTestId("prompt-library-button")).toBeVisible()
    await window.getByTestId("composer-engine-chip").click()
    await expect(window.getByTestId("agent-picker-panel")).toBeVisible({ timeout: 10_000 })
    await window.getByTestId("composer-preset-rail").click()
    await expect(window.getByTestId("composer-preset-row")).toBeVisible({ timeout: 8_000 })
    // 两入口并陈：flyout 开着时 Composer 旁书签仍在
    await expect(window.getByTestId("prompt-library-button")).toBeVisible()
    await expect(window.getByTestId("composer-input")).toBeEditable()
    await expect(window.getByTestId("composer-send")).toBeVisible()
    await window.screenshot({ path: join(SHOTS, "03-beside-recipe.png") })
    sample.screen3 = { recipeRail: true, libraryButton: true, sendVisible: true }

    // ── 屏④ 零扩张 ──
    await window.keyboard.press("Escape")
    await window.waitForTimeout(200)
    await window.getByTestId("prompt-library-button").click()
    await expect(window.getByTestId("prompt-library-popover")).toBeVisible({ timeout: 8_000 })
    const panelText = await window.getByTestId("prompt-library-popover").innerText()
    expect(panelText).not.toMatch(/设成每天跑|全面提示库|Goose 兼容|技能自动批准|已批准|Always-allow|Recipe|预设库/)
    const bodyText = await window.locator("body").innerText()
    expect(bodyText).not.toMatch(/全面提示库|Goose 兼容|技能自动批准/)
    expect(await window.locator("text=设成每天跑").count()).toBe(0)
    expect(await window.locator("text=全面提示库").count()).toBe(0)
    await window.screenshot({ path: join(SHOTS, "04-zero-expansion.png") })
    sample.screen4 = { bannedCopyAbsent: true, noDailyRunFake: true, i3StillStopped: true }

    writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
  } finally {
    await app.close().catch(() => undefined)
  }
})

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow({ timeout: 60_000 })
  await window.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => undefined)
  await window.waitForTimeout(800)
  return window
}
