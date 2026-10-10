/**
 * jojo：没带 --disable-gpu，GPU 进程启动失败回落到软件渲染时，审查栏空态仍不得画黄环。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { countGreyRingPixels, countHotYellowPixels } from "./png-ring-pixels"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("软件回退非 git 审查空态：浅/暗无环（不传 --disable-gpu）", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-gpu-soft-nongit-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-gpu-soft-nongit-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# not a git repo\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--use-gl=disabled", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_ALLOW_GPU: "1",
      ENJOY_DEV_SIMULATE_GPU_GONE: "1"
    }
  })
  try {
    const window = await readyGlassWindow(app)
    await expect(window.locator("html")).toHaveAttribute("data-gpu-compositing", "off", { timeout: 15_000 })
    await window.keyboard.press("Control+Shift+G")
    const review = window.locator('[data-testid="right-pane-shell"]')
    await expect(review).toBeVisible({ timeout: 12_000 })
    await expect(review).toHaveAttribute("data-pane-shell-deco", "off")
    await expect(review).not.toHaveAttribute("data-frost", "shell")
    await assertReviewHasNoPrism(window)
    await sampleReview(window, "light")
    await window.screenshot({ path: join(shots, "p1_gpu_soft_light_review_nongit.png"), fullPage: true })
    await window.evaluate(() => {
      document.documentElement.classList.add("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await assertReviewHasNoPrism(window)
    await sampleReview(window, "dark")
    await window.screenshot({ path: join(shots, "p1_gpu_soft_dark_review_nongit.png"), fullPage: true })
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

async function readyGlassWindow(app: { firstWindow: () => Promise<Page> }) {
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
  return window
}

async function assertReviewHasNoPrism(window: Page) {
  const hit = await window.evaluate(() => {
    const node = document.querySelector('[data-testid="right-pane-shell"]')
    if (!node) return { after: "missing", filter: "", deco: "" }
    const after = getComputedStyle(node, "::after")
    return {
      after: after.content,
      filter: after.filter,
      deco: node.getAttribute("data-pane-shell-deco")
    }
  })
  expect(hit.deco).toBe("off")
  expect(hit.after === "none" || hit.after === "").toBeTruthy()
  expect(!hit.filter || hit.filter === "none").toBeTruthy()
}

async function sampleReview(window: Page, mode: "light" | "dark") {
  const box = await window.locator('[data-testid="right-pane-shell"]').boundingBox()
  expect(box).toBeTruthy()
  const clip = {
    x: Math.max(0, box!.x + box!.width * 0.52),
    y: Math.max(0, box!.y + box!.height * 0.62),
    width: Math.min(160, Math.max(48, box!.width * 0.28)),
    height: Math.min(120, Math.max(40, box!.height * 0.2))
  }
  const buf = await window.screenshot({ clip })
  expect(countHotYellowPixels(buf), `${mode} review yellow`).toBe(0)
  if (mode === "dark") {
    const grey = countGreyRingPixels(buf)
    const area = clip.width * clip.height
    expect(grey / area, `${mode} review grey`).toBeLessThan(0.02)
  }
}
