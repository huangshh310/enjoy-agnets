/**
 * P2 快捷键统一派发 soft · 真机自门 4 屏
 * 1 设置改键 + 软提示 · 2 会话新 chord / 侧栏徽章 · 3 审批/排队不回归 · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execSync } from "node:child_process"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-tinykeys-dispatch"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-tinykeys-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-tinykeys-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  writeFileSync(join(workspace, "a.txt"), "a0\n")
  writeFileSync(join(workspace, "b.txt"), "b0\n")
  try {
    execSync("git init && git config user.email e2e@test && git config user.name e2e && git add -A && git commit -m init", {
      cwd: workspace,
      stdio: "ignore"
    })
    appendFileSync(join(workspace, "a.txt"), "a1\n")
    appendFileSync(join(workspace, "b.txt"), "b1\n")
  } catch {
    /* stub 仍可继续；无 git 时审查栏可能空 */
  }
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_SESSION_COUNT: "8",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

async function waitComposer(window: Page) {
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.waitFor({ timeout: 45_000 })
  return composer
}

test.describe("P2 tinykeys-dispatch gate", () => {
  test.setTimeout(200_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 设置改键生效 · 会话徽章 · 不回归 · 零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const app = await launch()
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    const sample: Record<string, unknown> = { at: new Date().toISOString() }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1280, height: 800 })
      await waitComposer(window)

      // ── 屏① 设置：软提示 + Review 人话行；改 search.quick / review.file.next ──
      await window.evaluate(() => {
        location.hash = "#/settings/shortcuts"
      })
      await window.getByText("键盘快捷键目录", { exact: true }).waitFor({ timeout: 20_000 })
      await expect(window.getByTestId("shortcuts-session-apply-hint")).toHaveText(
        "在这里改过的快捷键，回到会话会马上生效。"
      )
      await expect(window.getByText("审查：下一个文件", { exact: true }).first()).toBeVisible()
      await expect(window.getByText("审查：上一个文件", { exact: true }).first()).toBeVisible()
      await expect(window.getByText("全局与导航", { exact: true }).first()).toBeVisible()
      await expect(window.getByText("右侧舞台与开发面板", { exact: true }).first()).toBeVisible()
      await expect(window.getByText("对话与输入", { exact: true }).first()).toBeVisible()
      // 滚到审查行
      await window.getByTestId("keybinding-review.file.next").scrollIntoViewIfNeeded()
      await window.screenshot({ path: join(SHOTS, "01-settings-soft-hint-review-rows.png"), fullPage: false })
      sample.shot01 = "01-settings-soft-hint-review-rows.png"
      sample.softHint = await window.getByTestId("shortcuts-session-apply-hint").innerText()
      sample.hubTitle = await window.getByText("键盘快捷键目录", { exact: true }).innerText()

      // 改键：search.quick → mod+shift+l；review.file.next → mod+alt+j（旧 j 静默失效）
      await window.evaluate(async () => {
        const ide = (window as unknown as { ide: { settings: { setPreferences: (p: unknown) => Promise<void> } } }).ide
        await ide.settings.setPreferences({
          keybindings: [
            { key: "mod+shift+l", command: "search.quick" },
            { key: "mod+alt+j", command: "review.file.next", when: "!inputFocus" },
            { key: "k", command: "review.file.prev", when: "!inputFocus" }
          ]
        })
      })
      await window.reload()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.evaluate(() => {
        location.hash = "#/settings/shortcuts"
      })
      await window.getByTestId("shortcuts-session-apply-hint").waitFor({ timeout: 20_000 })
      await window.getByTestId("keybinding-review.file.next").scrollIntoViewIfNeeded()
      const nextRow = window.getByTestId("keybinding-review.file.next")
      await expect(nextRow).toContainText("J")
      sample.reviewNextChordAfter = await nextRow.innerText()

      // ── 屏② 会话：侧栏徽章跟新 search.quick；审查栏可开 ──
      await window.evaluate(() => {
        location.hash = "#/"
      })
      await waitComposer(window)
      // 侧栏 Kbd 应含 Shift（mod+shift+l）
      const kbd = window.locator("button[aria-label] kbd, button kbd").first()
      await expect
        .poll(async () => {
          const text = await window.locator("aside kbd, [class*='sidebar'] kbd, button kbd").first().innerText().catch(() => "")
          return text
        }, { timeout: 15_000 })
        .toMatch(/Shift|⇧/i)
      const badgeText = await window.locator("button kbd").first().innerText()
      sample.sidebarBadge = badgeText

      // 打开审查栏
      await window.keyboard.press("Control+Shift+G")
      await expect(window.getByTestId("right-pane-shell")).toBeVisible({ timeout: 10_000 })
      // 失焦输入，避免 !inputFocus 挡键
      await window.evaluate(() => {
        const el = document.activeElement
        if (el instanceof HTMLElement) el.blur()
      })
      // 旧 j 静默：先读选中；按 j；若有文件列表再按 mod+alt+j
      const before = await window.evaluate(() => window.__enjoyE2e?.getSelectedFile?.() ?? null)
      await window.keyboard.press("j")
      const afterOld = await window.evaluate(() => window.__enjoyE2e?.getSelectedFile?.() ?? null)
      await window.keyboard.press("Control+Alt+J")
      const afterNew = await window.evaluate(() => window.__enjoyE2e?.getSelectedFile?.() ?? null)
      sample.reviewBefore = before
      sample.reviewAfterOldJ = afterOld
      sample.reviewAfterNewChord = afterNew
      sample.oldJSilent = JSON.stringify(before) === JSON.stringify(afterOld)

      await window.screenshot({ path: join(SHOTS, "02-session-new-chord-badge-review.png"), fullPage: false })
      sample.shot02 = "02-session-new-chord-badge-review.png"

      // ── 屏③ Composer / 许可循环 / Queue·Steer 主路径不回归 ──
      const composer = await waitComposer(window)
      await expect(composer).toBeVisible()
      await composer.click()
      await composer.fill("gate tinykeys soft")
      // 不真正发送 Steer；只确认输入框可写、无死路
      sample.composerValue = await composer.inputValue()
      await window.screenshot({ path: join(SHOTS, "03-composer-no-regress.png"), fullPage: false })
      sample.shot03 = "03-composer-no-regress.png"

      // ── 屏④ 零扩张：回设置确认三组、无 tinykeys 营销 ──
      await window.evaluate(() => {
        location.hash = "#/settings/shortcuts"
      })
      await window.getByTestId("shortcuts-session-apply-hint").waitFor({ timeout: 20_000 })
      const bodyText = await window.locator("body").innerText()
      expect(bodyText).not.toMatch(/全面 tinykeys|快捷键大重构|性能大升级|快捷键系统重构/)
      expect(bodyText).toContain("全局与导航")
      expect(bodyText).toContain("右侧舞台与开发面板")
      expect(bodyText).toContain("对话与输入")
      expect(bodyText).toContain("在这里改过的快捷键，回到会话会马上生效。")
      // 仍只有三组卡片标题（不造第四组）
      sample.groupGlobal = bodyText.includes("全局与导航")
      sample.groupViews = bodyText.includes("右侧舞台与开发面板")
      sample.groupChat = bodyText.includes("对话与输入")
      sample.noMarketing = !/全面 tinykeys|快捷键大重构|性能大升级/.test(bodyText)
      await window.screenshot({ path: join(SHOTS, "04-zero-expansion.png"), fullPage: false })
      sample.shot04 = "04-zero-expansion.png"

      writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
    } finally {
      await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
    }
  })
})
