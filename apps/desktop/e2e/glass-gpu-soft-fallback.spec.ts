/**
 * jojo / luna：Xvfb 无 --disable-gpu（SwiftShader 软件 GL）。
 * 审查栏空态不得画黄环，不看 data-gpu-compositing。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { countGreyRingPixels, countHotYellowPixels } from "./png-ring-pixels"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("SwiftShader 非 git 审查空态：浅/暗下右无环（不传 --disable-gpu）", async () => {
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
    args: [
      mainEntry,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader"
    ],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_ALLOW_GPU: "1"
    }
  })
  try {
    const window = await readyGlassWindow(app)
    await window.keyboard.press("Control+Shift+G")
    const review = window.locator('[data-testid="right-pane-shell"]')
    await expect(review).toBeVisible({ timeout: 12_000 })
    await expect(review).toHaveAttribute("data-pane-shell-deco", "off")
    await expect(review).not.toHaveAttribute("data-frost", "shell")
    await assertReviewHasNoPrism(window)
    const lightDump = await dumpReviewChain(window)
    writeFileSync(join(shots, "review-elements-from-point-light.json"), JSON.stringify(lightDump, null, 2))
    await sampleReviewLowerRight(window, "light")
    await window.screenshot({ path: join(shots, "p1_gpu_soft_light_review_nongit.png"), fullPage: true })
    await window.evaluate(() => {
      document.documentElement.classList.add("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await assertReviewHasNoPrism(window)
    const darkDump = await dumpReviewChain(window)
    writeFileSync(join(shots, "review-elements-from-point-dark.json"), JSON.stringify(darkDump, null, 2))
    await sampleReviewLowerRight(window, "dark")
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
  await window.setViewportSize({ width: 1920, height: 1200 })
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
    if (!node) return { after: "missing", filter: "", deco: "", bg: "" }
    const after = getComputedStyle(node, "::after")
    const cs = getComputedStyle(node)
    return {
      after: after.content,
      filter: after.filter,
      deco: node.getAttribute("data-pane-shell-deco"),
      bg: cs.backgroundColor,
      backdrop: cs.backdropFilter
    }
  })
  expect(hit.deco).toBe("off")
  expect(hit.after === "none" || hit.after === "").toBeTruthy()
  expect(!hit.filter || hit.filter === "none").toBeTruthy()
  expect(hit.backdrop === "none" || !hit.backdrop).toBeTruthy()
  expect(hit.bg === "rgb(255, 255, 255)" || hit.bg === "rgb(23, 23, 23)" || /neutral/.test(hit.bg)).toBeTruthy()
}

async function dumpReviewChain(window: Page) {
  return window.evaluate(() => {
    const pane = document.querySelector('[data-testid="right-pane-shell"]')
    const box = pane?.getBoundingClientRect()
    if (!box) return { error: "missing pane" }
    const x = Math.round(box.left + box.width * 0.78)
    const y = Math.round(box.top + box.height * 0.78)
    const chain = document.elementsFromPoint(x, y).slice(0, 10).map((el) => {
      const cs = getComputedStyle(el)
      const before = getComputedStyle(el, "::before")
      const after = getComputedStyle(el, "::after")
      return {
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid") || "",
        className: String(el.className || "").slice(0, 160),
        filter: cs.filter,
        mask: cs.maskImage || cs.mask,
        backdrop: cs.backdropFilter,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage.slice(0, 180),
        before: { content: before.content, filter: before.filter, bg: before.backgroundImage.slice(0, 120) },
        after: { content: after.content, filter: after.filter, bg: after.backgroundImage.slice(0, 120) }
      }
    })
    const orbs = [...document.querySelectorAll(".skin-glass-orbs, .skin-glass-orb, .skin-glass-mesh-gradient")].map(
      (el) => {
        const cs = getComputedStyle(el)
        return { className: String(el.className), display: cs.display, filter: cs.filter }
      }
    )
    return {
      gpu: document.documentElement.dataset.gpuCompositing || "",
      skin: document.documentElement.getAttribute("data-skin"),
      dark: document.documentElement.classList.contains("dark"),
      x,
      y,
      liquid: Boolean(document.getElementById("skin-liquid-glass")),
      orbs,
      chain
    }
  })
}

async function sampleReviewLowerRight(window: Page, mode: "light" | "dark") {
  const box = await window.locator('[data-testid="right-pane-shell"]').boundingBox()
  expect(box).toBeTruthy()
  const clip = {
    x: Math.max(0, box!.x + box!.width * 0.52),
    y: Math.max(0, box!.y + box!.height * 0.55),
    width: Math.min(220, Math.max(64, box!.width * 0.42)),
    height: Math.min(200, Math.max(64, box!.height * 0.38))
  }
  const buf = await window.screenshot({ clip })
  expect(countHotYellowPixels(buf), `${mode} review yellow`).toBe(0)
  if (mode === "dark") {
    const grey = countGreyRingPixels(buf)
    const area = clip.width * clip.height
    expect(grey / area, `${mode} review grey`).toBeLessThan(0.02)
  }
}
