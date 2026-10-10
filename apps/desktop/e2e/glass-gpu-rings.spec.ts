/**
 * P1：--disable-gpu 下棱镜 ::after 不得画黄/灰同心环。覆盖审查、主列、侧栏。
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { countGreyRingPixels, countHotYellowPixels } from "./png-ring-pixels"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("disable-gpu 干净 git：浅/暗审查、主列、侧栏无环", async () => {
  await runGpuRingCase({
    kind: "clean-git",
    seed: seedCleanGit,
    expectText: "工作区没有未提交改动。",
    lightShot: "p1_gpu_off_light_review_clean.png",
    darkShot: "p1_gpu_off_dark_review_clean.png"
  })
})

test("disable-gpu 非 git：浅/暗审查、主列、侧栏无环", async () => {
  await runGpuRingCase({
    kind: "nongit",
    seed: (dir) => writeFileSync(join(dir, "readme.md"), "# not a git repo\n"),
    expectText: null,
    lightShot: "p1_gpu_off_light_review_nongit.png",
    darkShot: "p1_gpu_off_dark_review_nongit.png"
  })
})

test("disable-gpu 有改动：浅/暗审查无环", async () => {
  await runGpuRingCase({
    kind: "dirty-git",
    seed: seedDirtyGit,
    expectText: "dirty-note.ts",
    lightShot: "p1_gpu_off_light_review_files.png",
    darkShot: "p1_gpu_off_dark_review_files.png"
  })
})

async function runGpuRingCase(input: {
  kind: string
  seed: (dir: string) => void
  expectText: string | null
  lightShot: string
  darkShot: string
}) {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), `enjoy-gpu-${input.kind}-ws-`))
  const userData = mkdtempSync(join(tmpdir(), `enjoy-gpu-${input.kind}-ud-`))
  input.seed(workspace)
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
    const window = await readyGlassWindow(app)
    await expect(window.locator("html")).toHaveAttribute("data-gpu-compositing", "off")
    await window.keyboard.press("Control+Shift+G")
    const review = window.locator('[data-testid="right-pane-shell"]')
    await expect(review).toBeVisible({ timeout: 12_000 })
    if (input.expectText) {
      await expect(window.getByText(input.expectText).first()).toBeVisible({ timeout: 15_000 })
    }
    await assertNoPrism(window)
    await samplePanes(window, "light")
    await window.screenshot({ path: join(shots, input.lightShot), fullPage: true })
    await window.evaluate(() => {
      document.documentElement.classList.add("dark")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    await assertNoPrism(window)
    await samplePanes(window, "dark")
    await window.screenshot({ path: join(shots, input.darkShot), fullPage: true })
  } finally {
    const proc = app.process()
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1_500))]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
}

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

async function assertNoPrism(window: Page) {
  const hit = await window.evaluate(() => {
    const nodes = [
      document.querySelector("aside.rounded-3xl"),
      document.querySelector("main"),
      document.querySelector('[data-testid="right-pane-shell"]'),
      ...Array.from(document.querySelectorAll("[data-frost]"))
    ].filter((node): node is Element => Boolean(node))
    return nodes.map((node) => {
      const after = getComputedStyle(node, "::after")
      return {
        after: after.content,
        filter: after.filter,
        mask: after.maskImage || after.webkitMaskImage
      }
    })
  })
  expect(hit.length).toBeGreaterThan(1)
  for (const item of hit) {
    expect(item.after === "none" || item.after === "").toBeTruthy()
    expect(!item.filter || item.filter === "none").toBeTruthy()
  }
  expect(await window.locator("#skin-liquid-glass").count()).toBe(0)
}

async function samplePanes(window: Page, mode: "light" | "dark") {
  for (const selector of ["aside.rounded-3xl", "main", '[data-testid="right-pane-shell"]']) {
    const box = await window.locator(selector).first().boundingBox()
    expect(box, selector).toBeTruthy()
    const clip = {
      x: Math.max(0, box!.x + box!.width * 0.52),
      y: Math.max(0, box!.y + box!.height * 0.62),
      width: Math.min(160, Math.max(48, box!.width * 0.28)),
      height: Math.min(120, Math.max(40, box!.height * 0.2))
    }
    const buf = await window.screenshot({ clip })
    expect(countHotYellowPixels(buf), `${mode} ${selector} yellow`).toBe(0)
    if (mode === "dark") {
      const grey = countGreyRingPixels(buf)
      const area = clip.width * clip.height
      expect(grey / area, `${mode} ${selector} grey`).toBeLessThan(0.02)
    }
  }
}

function seedCleanGit(workspace: string) {
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  execFileSync("git", ["init"], { cwd: workspace })
  execFileSync("git", ["add", "readme.md"], { cwd: workspace })
  execFileSync("git", ["-c", "user.email=e2e@test", "-c", "user.name=e2e", "commit", "-m", "init"], {
    cwd: workspace
  })
}

function seedDirtyGit(workspace: string) {
  seedCleanGit(workspace)
  writeFileSync(join(workspace, "dirty-note.ts"), "export const dirty = 1\n")
}
