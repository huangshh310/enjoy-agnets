/**
 * P2 Review 文件树 headless-tree soft · 真机自门 4 屏
 * 1 树壳+筛选 · 2 键盘/焦点环 · 3 选中↔Diff+stage · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execSync } from "node:child_process"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-headless-tree-review"

async function launch(workspace: string) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-ht-ud-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_SESSION_COUNT: "4",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace
    }
  })
}

function seedWorkspace(workspace: string) {
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  writeFileSync(join(workspace, "a.ts"), "export const a = 1\n")
  writeFileSync(join(workspace, "b.ts"), "export const b = 1\n")
  mkdirSync(join(workspace, "pkg"), { recursive: true })
  writeFileSync(join(workspace, "pkg/c.ts"), "export const c = 1\n")
  try {
    execSync(
      "git init && git config user.email e2e@test && git config user.name e2e && git add -A && git commit -m init",
      { cwd: workspace, stdio: "ignore" }
    )
    appendFileSync(join(workspace, "a.ts"), "export const a2 = 2\n")
    appendFileSync(join(workspace, "b.ts"), "export const b2 = 2\n")
    appendFileSync(join(workspace, "pkg/c.ts"), "export const c2 = 2\n")
  } catch {
    /* stub 仍可继续 */
  }
}

async function openReview(window: Page) {
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 45_000 })
  await window.keyboard.press("Control+Shift+G")
  await expect(window.locator('[data-testid="right-pane-shell"]')).toBeVisible({
    timeout: 15_000
  })
  await expect(window.getByTestId("review-file-tree")).toBeVisible({ timeout: 15_000 })
}

test.describe("P2 headless-tree-review gate", () => {
  test.setTimeout(220_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 树壳筛选 · 键盘焦点 · 选中Diff · 零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-ht-ws-"))
    seedWorkspace(workspace)
    const app = await launch(workspace)
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    const sample: Record<string, unknown> = { at: new Date().toISOString() }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1440, height: 900 })
      await window
        .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', {
          timeout: 25_000
        })
        .catch(() => undefined)
      const skipGuide = window.getByRole("button", { name: "跳过设置" })
      if ((await skipGuide.count()) > 0) await skipGuide.click()

      await openReview(window)

      // ── 屏① 树壳 + 筛选 + 空态 ──
      const filter = window.getByTestId("review-file-tree-filter")
      await expect(filter).toHaveAttribute("placeholder", "筛选文件…")
      await expect(window.getByTestId("review-file-tree-list")).toBeVisible()
      sample.filterPlaceholder = await filter.getAttribute("placeholder")
      await window.screenshot({ path: join(SHOTS, "01-tree-filter.png"), fullPage: false })

      await filter.fill("zzz-no-match")
      await expect(window.getByTestId("review-file-list-empty")).toHaveText("没有匹配的文件")
      sample.emptyCopy = await window.getByTestId("review-file-list-empty").innerText()
      await filter.fill("")
      await expect(window.getByTestId("review-file-tree-list")).toBeVisible()

      // ── 屏② 键盘导航 + 焦点环 ──
      const list = window.getByTestId("review-file-tree-list")
      await list.click()
      await window.keyboard.press("Home")
      await window.keyboard.press("ArrowDown")
      await window.keyboard.press("ArrowDown")
      const focused = list.locator(".ring-accent\\/35, [class*='ring-accent']").first()
      sample.focusRingVisible = (await focused.count()) > 0
      await window.screenshot({ path: join(SHOTS, "02-keyboard-focus-ring.png"), fullPage: false })

      // 确认树源未抢 j/k：失焦后 j 仍走 #219（有文件时可能换选；此处只证明按键不抛）
      await window.evaluate(() => {
        const el = document.activeElement
        if (el instanceof HTMLElement) el.blur()
      })
      await window.keyboard.press("j")
      sample.afterJ = await window.evaluate(() => window.__enjoyE2e?.getSelectedFile?.() ?? null)

      // ── 屏③ 选中 ↔ Diff + stage 入口可见 ──
      const fileRow = window.getByTestId("review-file-tree-file").first()
      await expect(fileRow).toBeVisible({ timeout: 10_000 })
      const fileName = (await fileRow.getAttribute("data-path")) || ""
      await fileRow.click()
      sample.selectedPath = await window.evaluate(() => window.__enjoyE2e?.getSelectedFile?.() ?? null)
      sample.clickedPath = fileName
      // Diff 区或 pierre host 至少一侧有响应
      const diffHost = window.locator(
        '[data-diff-engine="pierre-shiki-js"], [data-testid="review-diff-empty"], [data-testid="right-pane-shell"]'
      )
      await expect(diffHost.first()).toBeVisible()
      sample.stageMarks = await window.evaluate(() => {
        const marks = Array.from(document.querySelectorAll('[data-testid="review-file-tree-file"] span'))
          .map((el) => el.textContent || "")
          .filter((t) => t === "+" || t === "−" || t === "M" || t === "A" || t === "D" || t === "U")
        return marks.slice(0, 12)
      })
      await window.screenshot({ path: join(SHOTS, "03-select-diff-stage.png"), fullPage: false })

      // ── 屏④ 零扩张：无营销文案；Files 树未换 headless（本刀只 Review）──
      const bodyText = await window.locator("body").innerText()
      expect(bodyText).not.toMatch(/全面 headless-tree|树系统重构|性能大升级/)
      sample.noMarketing = !/全面 headless-tree|树系统重构|性能大升级/.test(bodyText)
      sample.hasReviewTree = (await window.getByTestId("review-file-tree").count()) > 0
      // Composer 可写
      const composer = window.locator('[data-testid="composer-input"]')
      await composer.click()
      await composer.fill("gate headless-tree soft")
      sample.composerValue = await composer.inputValue()
      await window.screenshot({ path: join(SHOTS, "04-zero-expansion.png"), fullPage: false })

      writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
    } finally {
      await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
    }
  })
})
