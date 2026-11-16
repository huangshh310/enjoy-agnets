/**
 * E1「停了就真停」M3（luna §1.4 / 产品 §2.2 F）：运行中输入框有草稿时，停止钮与排队钮并排可见（停止在左、排队留最右发送位、间距 8，
 * 两颗 32×32，中心 + 四角内收 5px 各自命中、不串）；1440×920 与 733×480 都在状态栏之上（733 bottom ≤430）。
 * 输入框里 Esc 停这一轮、草稿原样保留；@ 面板开着时 Esc 只关面板、这一轮照跑。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘（另写 m3-geometry.json）。
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

/** stub 每词 0.4s、约 9s，不弹审批。 */
const SLOW = "slow a b c d e f g h i j k l m n o p q r s t u v w x y z"
const DRAFT = "先记下这句草稿，还没想发"
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const made: string[] = []
const geometry: Record<string, unknown> = {}

async function boot() {
  const ws = mkdtempSync(join(tmpdir(), "enjoy-e1m3-ws-"))
  const ud = mkdtempSync(join(tmpdir(), "enjoy-e1m3-ud-"))
  made.push(ws, ud)
  writeFileSync(join(ws, "readme.md"), "# e2e\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: ws,
    ENJOY_E2E_USERDATA: ud
  })
  const window = await firstWindow(app)
  await window.setViewportSize({ width: 1440, height: 920 })
  await window.waitForTimeout(1_000)
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

async function startSlowRun(window: Page) {
  const input = window.getByTestId("composer-input")
  await window.waitForFunction(
    () => /^(Send|发送)$/.test(document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""),
    undefined,
    { timeout: 15_000 }
  )
  await input.fill(SLOW)
  await input.press("Enter")
  await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
  await input.fill(DRAFT)
  await expect(window.getByTestId("composer-action-pair")).toBeVisible({ timeout: 5_000 })
}

type PairGeom = {
  stop: { x: number; y: number; width: number; height: number; bottom: number }
  send: { x: number; y: number; width: number; height: number; bottom: number }
  sendAria: string | null
  barTop: number | null
  formH: number
  hits: { stop: boolean[]; send: boolean[] }
  runChip: boolean
}

async function measurePair(window: Page): Promise<PairGeom> {
  return window.evaluate(() => {
    const stop = document.querySelector('[data-testid="composer-stop"]') as HTMLElement
    const send = document.querySelector('[data-testid="composer-send"]') as HTMLElement
    const form = document.querySelector("form[data-composer]") as HTMLElement
    const bar = document.querySelector('[data-testid="status-context-meter"]')?.closest("[data-toast-clearance]")
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
    }
    const points = (el: Element) => {
      const r = el.getBoundingClientRect()
      const i = 5
      return [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + i, r.top + i],
        [r.right - i, r.top + i],
        [r.left + i, r.bottom - i],
        [r.right - i, r.bottom - i]
      ].map(([x, y]) => {
        const at = document.elementFromPoint(x!, y!)
        return Boolean(at && (at === el || el.contains(at)))
      })
    }
    const chip = [...form.querySelectorAll("span.animate-pulse")].length > 0
    return {
      stop: rect(stop),
      send: rect(send),
      sendAria: send.getAttribute("aria-label"),
      barTop: bar ? bar.getBoundingClientRect().top : null,
      formH: form.getBoundingClientRect().height,
      hits: { stop: points(stop), send: points(send) },
      runChip: chip
    }
  })
}

function expectPair(g: PairGeom, label: string, maxBottom?: number) {
  const dbg = `${label} ${JSON.stringify(g)}`
  expect(g.stop.width, dbg).toBe(32)
  expect(g.stop.height, dbg).toBe(32)
  expect(g.send.width, dbg).toBe(32)
  expect(g.send.height, dbg).toBe(32)
  expect(Math.abs(g.stop.y - g.send.y), dbg).toBeLessThanOrEqual(0.5)
  expect(Math.abs(g.send.x - (g.stop.x + 32 + 8)), `${dbg}: 停止在排队左侧、间距 8`).toBeLessThanOrEqual(0.5)
  expect(g.sendAria, dbg).toBe("排队，完成后执行")
  expect(g.hits.stop.every(Boolean), `${dbg}: 停止五点命中`).toBe(true)
  expect(g.hits.send.every(Boolean), `${dbg}: 排队五点命中`).toBe(true)
  expect(g.runChip, `${dbg}: 并排时收起过程 chip`).toBe(false)
  expect(g.barTop, dbg).toEqual(expect.any(Number))
  expect(g.stop.bottom, `${dbg}: 在状态栏之上`).toBeLessThanOrEqual((g.barTop ?? 0) + 0.5)
  if (maxBottom != null) expect(g.stop.bottom, `${dbg}: bottom ≤ ${maxBottom}`).toBeLessThanOrEqual(maxBottom)
}

async function shot(window: Page, name: string) {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
})
test.afterAll(() => {
  if (shotsDir) writeFileSync(join(shotsDir, "m3-geometry.json"), JSON.stringify(geometry, null, 2))
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

test("有草稿运行中：停止与排队并排（1440 / 733×480）；Esc 停这一轮、草稿保留", async () => {
  test.setTimeout(120_000)
  const { app, window } = await boot()
  try {
    await startSlowRun(window)
    const wide = await measurePair(window)
    geometry["1440x920"] = wide
    expectPair(wide, "1440x920")
    await shot(window, "m3-pair-1440x920")

    await window.setViewportSize({ width: 733, height: 480 })
    await window.waitForTimeout(500)
    const narrow = await measurePair(window)
    geometry["733x480"] = narrow
    expectPair(narrow, "733x480", 430)
    await shot(window, "m3-pair-733x480")

    const input = window.getByTestId("composer-input")
    await input.focus()
    await input.press("Escape")
    await expect(window.getByTestId("composer-stop")).toHaveCount(0, { timeout: 5_000 })
    await expect(input).toHaveValue(DRAFT)
    await expect(window.getByTestId("thread-notice-banner")).toHaveAttribute("data-notice-kind", "stopped", { timeout: 5_000 })
    await expect(window.getByTestId("composer-send")).toHaveAttribute("aria-label", "发送")
    await shot(window, "m3-esc-stopped-draft-kept-733x480")
  } finally {
    await closeForRelaunch(app)
  }
})

test("@ 面板开着时 Esc 只关面板、这一轮照跑；再按 Esc 才停", async () => {
  test.setTimeout(120_000)
  const { app, window } = await boot()
  try {
    await startSlowRun(window)
    const input = window.getByTestId("composer-input")
    await input.fill("草稿 ")
    await input.press("End")
    await input.press("@")
    await expect(window.getByTestId("composer-mention-list")).toBeVisible({ timeout: 8_000 })
    await shot(window, "m3-mention-open-1440x920")
    await input.press("Escape")
    await expect(window.getByTestId("composer-mention-list")).toHaveCount(0, { timeout: 3_000 })
    await expect(window.getByTestId("composer-stop"), "面板吃掉 Esc，不停车").toBeVisible()
    // 面板自己的 dismiss 怎么处理触发符是现网行为（不归本刀）；之后那次 Esc 停车时草稿必须原样不动。
    const afterDismiss = await input.inputValue()
    await shot(window, "m3-mention-esc-closed-still-running-1440x920")
    await window.waitForTimeout(800)
    await expect(window.getByTestId("composer-stop"), "过一会仍在跑").toBeVisible()
    await input.press("Escape")
    await expect(window.getByTestId("composer-stop")).toHaveCount(0, { timeout: 5_000 })
    await expect(input).toHaveValue(afterDismiss)
  } finally {
    await closeForRelaunch(app)
  }
})
