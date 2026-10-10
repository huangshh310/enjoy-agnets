/**
 * P1：干净 git 工作区、浅色审查空态，黄环不得盖住「推送」。
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { countHotYellowPixels } from "./png-ring-pixels"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("浅色干净仓库审查空态：elementFromPoint 无黄环，推送完整", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-review-clean-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-review-clean-ud-"))
  seedCleanGitWorkspace(workspace)
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
    await window
      .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 20_000 })
      .catch(() => undefined)
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await window.evaluate(() => {
      document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await expect(window.locator("html")).toHaveAttribute("data-gpu-compositing", "off")

    await window.keyboard.press("Control+Shift+G")
    const reviewPane = window.locator('[data-testid="right-pane-shell"]')
    await expect(reviewPane).toBeVisible({ timeout: 12_000 })
    await expect(window.getByText("工作区没有未提交改动。")).toBeVisible({ timeout: 15_000 })
    await expect(reviewPane).toHaveAttribute("data-pane-shell-deco", "off")
    await expect(reviewPane).not.toHaveAttribute("data-frost", "shell")
    const push = window.locator('[data-testid="review-push"]')
    await expect(push).toBeVisible({ timeout: 8_000 })
    await expect(push).toHaveText("推送")

    const hit = await window.evaluate(() => {
      const pane = document.querySelector('[data-testid="right-pane-shell"]')
      const pushEl = document.querySelector('[data-testid="review-push"]')
      if (!pane || !pushEl) return { error: "missing" }
      const box = pushEl.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const node = document.elementFromPoint(x, y) as HTMLElement | null
      const chain: string[] = []
      let walk: HTMLElement | null = node
      while (walk) {
        const after = getComputedStyle(walk, "::after")
        const before = getComputedStyle(walk, "::before")
        chain.push(
          [
            walk.tagName,
            walk.getAttribute("data-testid") ?? "",
            walk.getAttribute("data-frost") ?? "",
            walk.getAttribute("data-pane-shell-deco") ?? "",
            after.content,
            before.content
          ].join("|")
        )
        walk = walk.parentElement
      }
      const paneAfter = getComputedStyle(pane, "::after").content
      const paneBefore = getComputedStyle(pane, "::before").content
      const bg = getComputedStyle(pane).backgroundColor
      return {
        tag: node?.tagName ?? "",
        testId: node?.getAttribute("data-testid") ?? "",
        text: (node?.textContent ?? "").trim().slice(0, 24),
        paneAfter,
        paneBefore,
        bg,
        frost: pane.getAttribute("data-frost"),
        deco: pane.getAttribute("data-pane-shell-deco"),
        chain
      }
    })
    expect(hit.error).toBeUndefined()
    expect(hit.deco).toBe("off")
    expect(hit.frost).toBeFalsy()
    expect(hit.paneAfter === "none" || hit.paneAfter === "").toBeTruthy()
    expect(hit.paneBefore === "none" || hit.paneBefore === "").toBeTruthy()
    expect(hit.text).toContain("推送")
    expect(hit.bg ?? "").toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*1\)/)

    const pushBox = await push.boundingBox()
    expect(pushBox).toBeTruthy()
    const clip = {
      x: Math.max(0, pushBox!.x - 24),
      y: Math.max(0, pushBox!.y - 16),
      width: Math.min(220, pushBox!.width + 80),
      height: Math.min(64, pushBox!.height + 32)
    }
    const buf = await window.screenshot({ clip })
    expect(countHotYellowPixels(buf)).toBe(0)
    await window.screenshot({ path: join(shots, "p1_review_empty_light_no_ring.png"), fullPage: true })
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

function seedCleanGitWorkspace(workspace: string) {
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  execFileSync("git", ["init"], { cwd: workspace })
  execFileSync("git", ["add", "readme.md"], { cwd: workspace })
  execFileSync(
    "git",
    ["-c", "user.email=e2e@test", "-c", "user.name=e2e", "commit", "-m", "init"],
    { cwd: workspace }
  )
}
