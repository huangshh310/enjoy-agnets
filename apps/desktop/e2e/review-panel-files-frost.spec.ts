/**
 * 审查栏有文件时也不挂装饰；Ctrl+Shift+G 开/关。
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("审查有文件时停装饰，Ctrl+Shift+G 再按收起", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-review-files-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-review-files-ud-"))
  seedGitWorkspaceWithDirtyFiles(workspace)
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    await window.setViewportSize({ width: 1440, height: 900 })
    await window.evaluate(() => document.documentElement.setAttribute("data-skin", "glass"))
    await window
      .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 20_000 })
      .catch(() => undefined)
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })

    await window.keyboard.press("Control+Shift+G")
    const reviewPane = window.locator('[data-testid="right-pane-shell"]')
    await expect(reviewPane).toBeVisible({ timeout: 12_000 })
    await expect(window.getByText("dirty-note.ts").first()).toBeVisible({ timeout: 15_000 })
    await expect(reviewPane).toHaveAttribute("data-pane-shell-deco", "off")
    await expect(reviewPane).not.toHaveAttribute("data-frost", "shell")
    await expect(reviewPane.locator("[data-frost]")).toHaveCount(0)
    const deco = await reviewPane.evaluate((node) => {
      if (node.getAttribute("data-frost") === "shell") return "frost-shell"
      if (node.getAttribute("data-pane-shell-deco") !== "off") return "deco-on"
      if (node.querySelector("[data-frost], .skin-glass-orb, [class*='frost']")) return "nested-deco"
      const after = getComputedStyle(node, "::after").content
      if (after && after !== "none") return `after:${after}`
      const before = getComputedStyle(node, "::before").content
      if (before && before !== "none") return `before:${before}`
      return "ok"
    })
    expect(deco).toBe("ok")

    await window.evaluate(() => {
      document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await window.screenshot({ path: join(shots, "luna_review_with_files_light.png"), fullPage: true })

    await window.evaluate(() => {
      document.documentElement.classList.add("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await window.screenshot({ path: join(shots, "luna_review_with_files_dark.png"), fullPage: true })

    await window.evaluate(() => document.documentElement.classList.remove("dark"))
    await window.keyboard.press("Control+Shift+G")
    await expect
      .poll(async () => (await reviewPane.boundingBox())?.width ?? 0, { timeout: 8_000 })
      .toBeLessThan(48)
  } finally {
    const proc = app.process()
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1_500))]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
})

function seedGitWorkspaceWithDirtyFiles(workspace: string) {
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  execFileSync("git", ["init"], { cwd: workspace })
  execFileSync("git", ["add", "readme.md"], { cwd: workspace })
  execFileSync(
    "git",
    ["-c", "user.email=e2e@test", "-c", "user.name=e2e", "commit", "-m", "init"],
    { cwd: workspace }
  )
  writeFileSync(join(workspace, "dirty-note.ts"), "export const dirty = 1\n")
  writeFileSync(join(workspace, "extra-readme.md"), "# extra\n")
}
