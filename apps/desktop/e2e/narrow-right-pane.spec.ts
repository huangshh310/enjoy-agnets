/**
 * 窄窗（768 及以下）右侧改动面板 / 「去审查」打开的审查面板不能宽 0、画在窗外（g157b-25 / pr157-gate-05-768：
 * 按钮已显示「收起改动面板」但什么都看不到，x=775）。
 * 中英文 × 768x654 / 733x480（窄窗：覆盖式抽屉，Esc 和按钮都能关）+ 1024x670 / 1440x900（宽窗：照旧并排，按钮关）。
 * 断言：面板宽度 > 0（≥ 240）且完全在视口内；关闭后面板不再占视口、主区宽度复原。
 * 另两条（luna / jojo main157-patrol-08~15、m157-20/21：窄窗把面板压成 0 后放宽也回不来，「去审查」要点两次开关才找回）：
 *   ① 1440 打开 → 拖窄到 800 → 放宽回 1440：面板宽 > 0 且可见；
 *   ② 800 打开 → 放宽到 1024 → 关闭 → 点一次「去审查」就打开；
 *   ③ 1024 开着时把分隔条拖到窗外、面板被压成 0（开关仍是「开」），不先关，直接点一次「去审查」宽度就恢复（leo e40edfb0 BLOCK）。
 * 窄窗抽屉开着时来了审批：抽屉自动收起，审批卡按钮露出、点得到；审批期间手动再开抽屉不被收回。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘，文件名前缀 ENJOY_E2E_SHOT_TAG（默认 after）。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const shotTag = process.env.ENJOY_E2E_SHOT_TAG ?? "after"
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

const SIZES = [
  { width: 768, height: 654, narrow: true },
  { width: 733, height: 480, narrow: true },
  { width: 1024, height: 670, narrow: false },
  { width: 1440, height: 900, narrow: false }
]

const COPY = {
  zh: { expand: "展开改动面板", collapse: "收起改动面板" },
  en: { expand: "Expand changes pane", collapse: "Collapse changes pane" }
} as const

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, selector)
}

/** 面板在视口内可见的宽度（画在窗外 / 宽 0 都算 0）。 */
async function paneVisibleWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="right-pane-shell"]')
    if (!el) return 0
    const r = el.getBoundingClientRect()
    if (r.height <= 0) return 0
    return Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0))
  })
}

async function expectPaneUsable(page: Page, tag: string, size: { width: number; height: number }) {
  await expect
    .poll(() => paneVisibleWidth(page), { message: `${tag} pane visible width`, timeout: 3_000 })
    .toBeGreaterThanOrEqual(240)
    .catch(() => undefined)
  const box = await boxOf(page, '[data-testid="right-pane-shell"]')
  expect.soft(box, `${tag} pane box`).not.toBeNull()
  if (!box) return
  expect.soft(box.width, `${tag} pane width`).toBeGreaterThanOrEqual(240)
  expect.soft(box.x, `${tag} pane left`).toBeGreaterThanOrEqual(0)
  expect.soft(box.x + box.width, `${tag} pane right`).toBeLessThanOrEqual(size.width)
  expect.soft(box.y, `${tag} pane top`).toBeGreaterThanOrEqual(0)
  expect.soft(box.y + box.height, `${tag} pane bottom`).toBeLessThanOrEqual(size.height)
  // 盖在最上面：中心和靠底部（composer 那一带）点到的都是面板自己，不被主区盖住。
  const points = [
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    { x: box.x + box.width / 2, y: box.y + box.height - 40 }
  ]
  for (const p of points) {
    const onTop = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y)
      return Boolean(hit?.closest('[data-testid="right-pane-shell"]'))
    }, p)
    expect.soft(onTop, `${tag} pane on top at (${Math.round(p.x)},${Math.round(p.y)})`).toBe(true)
  }
}

/** 顶栏开关必须整颗在窗内（之前 768 宽时被「已完成」小签挤到 x≈781）；在窗内就真点，不在就软失败后用 DOM click 继续取证。 */
async function clickToggle(page: Page, toggle: Locator, tag: string, size: { width: number; height: number }) {
  const box = await toggle.boundingBox()
  const inside = Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width && box.y + box.height <= size.height)
  expect.soft(inside, `${tag} header toggle inside viewport ${JSON.stringify(box)}`).toBe(true)
  if (inside) await toggle.click()
  else await toggle.evaluate((el) => (el as HTMLElement).click())
}

/** 覆盖式抽屉：打开时主区不被挤（x、宽度和关着时一样，分隔条也不占位）。 */
async function expectMainUntouched(page: Page, tag: string, before: Box | null) {
  const now = await boxOf(page, '[data-testid="chat-conversation"]')
  expect.soft(now && before ? Math.abs(now.width - before.width) : -1, `${tag} main width untouched`).toBeLessThanOrEqual(1)
  expect.soft(now && before ? Math.abs(now.x - before.x) : -1, `${tag} main x untouched`).toBeLessThanOrEqual(1)
}

async function expectRestored(page: Page, tag: string, before: Box | null) {
  await expect.poll(() => paneVisibleWidth(page), { message: `${tag} pane closed`, timeout: 3_000 }).toBe(0)
  const after = await boxOf(page, '[data-testid="chat-conversation"]')
  expect.soft(after && before ? Math.abs(after.width - before.width) : -1, `${tag} main width restored`).toBeLessThanOrEqual(1)
  expect.soft(after && before ? Math.abs(after.x - before.x) : -1, `${tag} main x restored`).toBeLessThanOrEqual(1)
}

for (const lang of ["zh", "en"] as const) {
  test(`窄窗右侧面板有可用宽度、完全在窗内，Esc / 按钮能关（${lang}）`, async () => {
    test.setTimeout(240_000)
    const copy = COPY[lang]
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-nrp-ws-"))
    const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-nrp-ud-"))
    writeFileSync(join(workspace, "readme.md"), "# e2e\n")
    const app = await relaunchElectron({
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: lang,
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    })
    try {
      const page = await firstWindow(app)
      await page.setViewportSize({ width: 1024, height: 670 })
      const composer = page.locator('[data-testid="composer-input"]')
      // 改一个文件 → 出现「未自动提交 · 去审查」。
      await sendComposer(page, composer, "please write a note")
      await page.locator('[data-testid="approval-allow"]').click({ timeout: 15_000 })
      await expect(page.getByText("stub-ok", { exact: false }).first()).toBeVisible({ timeout: 15_000 })
      const review = page.locator('[data-testid="review-gate-open"]')
      await expect(review).toBeVisible({ timeout: 10_000 })
      // 聊天顶栏的改动面板开关（运行账本按钮的 title 也叫「收起改动面板」，按 aria-label 精确取顶栏这一个）。
      const expand = page.locator(`header button[aria-label="${copy.expand}"]`)
      const collapse = page.locator(`header button[aria-label="${copy.collapse}"]`)
      // 起点：面板收起。
      if (await collapse.count()) await collapse.evaluate((el) => (el as HTMLElement).click())
      await expect(expand).toHaveCount(1)

      for (const size of SIZES) {
        const tag = `${lang} ${size.width}x${size.height}`
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.waitForTimeout(500)
        const before = await boxOf(page, '[data-testid="chat-conversation"]')

        // 1) 页头按钮打开 → 按钮关。
        await clickToggle(page, expand, `${tag} open`, size)
        await expect(collapse).toHaveCount(1)
        await page.waitForTimeout(400)
        if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-panel-${lang}-${size.width}x${size.height}-toggle.png`) })
        await expectPaneUsable(page, `${tag} toggle`, size)
        if (size.narrow) await expectMainUntouched(page, `${tag} toggle drawer`, before)
        await clickToggle(page, collapse, `${tag} close`, size)
        await expect(expand).toHaveCount(1)
        await expectRestored(page, `${tag} toggle→button`, before)

        // 2) 「去审查」打开 → 窄窗 Esc 关 / 宽窗按钮关。
        await review.click()
        await expect(collapse).toHaveCount(1)
        await page.waitForTimeout(400)
        if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-panel-${lang}-${size.width}x${size.height}-review.png`) })
        await expectPaneUsable(page, `${tag} review`, size)
        if (size.narrow) await expectMainUntouched(page, `${tag} review drawer`, before)
        if (size.narrow) {
          await page.keyboard.press("Escape")
        } else {
          await clickToggle(page, collapse, `${tag} close`, size)
        }
        await expect.soft(expand, `${tag} closed`).toHaveCount(1, { timeout: 3_000 })
        if (await collapse.count()) await collapse.evaluate((el) => (el as HTMLElement).click())
        await expectRestored(page, `${tag} review→${size.narrow ? "Esc" : "button"}`, before)
        if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-panel-${lang}-${size.width}x${size.height}-closed.png`) })
      }
    } finally {
      await closeForRelaunch(app)
    }
  })
}

async function launchWithChange(lang: "zh" | "en") {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-nrp-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-nrp-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  })
  const page = await firstWindow(app)
  await page.setViewportSize({ width: 1024, height: 670 })
  const composer = page.locator('[data-testid="composer-input"]')
  await sendComposer(page, composer, "please write a note")
  await page.locator('[data-testid="approval-allow"]').click({ timeout: 15_000 })
  await expect(page.getByText("stub-ok", { exact: false }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid="review-gate-open"]')).toBeVisible({ timeout: 10_000 })
  const copy = COPY[lang]
  const expand = page.locator(`header button[aria-label="${copy.expand}"]`)
  const collapse = page.locator(`header button[aria-label="${copy.collapse}"]`)
  if (await collapse.count()) await collapse.evaluate((el) => (el as HTMLElement).click())
  await expect(expand).toHaveCount(1)
  return { app, page, expand, collapse, review: page.locator('[data-testid="review-gate-open"]') }
}

async function shot(page: Page, name: string) {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-${name}.png`) })
}

for (const lang of ["zh", "en"] as const) {
  test(`1440 打开 → 拖窄到 800 → 放宽回 1440，面板自动回到可用宽度（${lang}）`, async () => {
    test.setTimeout(180_000)
    const { app, page, expand, collapse } = await launchWithChange(lang)
    try {
      const wide = { width: 1440, height: 900 }
      await page.setViewportSize(wide)
      await page.waitForTimeout(400)
      await clickToggle(page, expand, `${lang} 1440 open`, wide)
      await expect(collapse).toHaveCount(1)
      await expectPaneUsable(page, `${lang} 1440 opened`, wide)
      await shot(page, `patrol1-${lang}-1440-open`)
      for (const w of [1200, 1000, 900, 800]) {
        await page.setViewportSize({ width: w, height: 654 })
        await page.waitForTimeout(150)
      }
      await page.waitForTimeout(400)
      await shot(page, `patrol1-${lang}-800-dragged`)
      for (const w of [900, 1000, 1200, 1440]) {
        await page.setViewportSize({ width: w, height: w === 1440 ? 900 : 654 })
        await page.waitForTimeout(150)
      }
      await page.waitForTimeout(500)
      await shot(page, `patrol1-${lang}-1440-widened`)
      await expect(collapse, `${lang} still open`).toHaveCount(1)
      await expectPaneUsable(page, `${lang} 1440 widened`, wide)
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`800 打开 → 放宽到 1024 → 关闭 → 点一次「去审查」就打开（${lang}）`, async () => {
    test.setTimeout(180_000)
    const { app, page, expand, collapse, review } = await launchWithChange(lang)
    try {
      const narrow = { width: 800, height: 654 }
      await page.setViewportSize(narrow)
      await page.waitForTimeout(400)
      await review.click()
      await expect(collapse).toHaveCount(1)
      await expectPaneUsable(page, `${lang} 800 opened`, narrow)
      await shot(page, `patrol2-${lang}-800-open`)
      const mid = { width: 1024, height: 670 }
      await page.setViewportSize(mid)
      await page.waitForTimeout(500)
      await shot(page, `patrol2-${lang}-1024-widened`)
      await expectPaneUsable(page, `${lang} 1024 widened`, mid)
      await clickToggle(page, collapse, `${lang} 1024 close`, mid)
      await expect(expand).toHaveCount(1)
      // 只点一次「去审查」。
      await review.click()
      await expect(collapse).toHaveCount(1)
      await page.waitForTimeout(400)
      await shot(page, `patrol2-${lang}-1024-review-once`)
      await expectPaneUsable(page, `${lang} 1024 review once`, mid)
    } finally {
      await closeForRelaunch(app)
    }
  })
}

/** 分栏里审查栏 Panel 的实际宽度（不看抽屉）。 */
async function inspectorPanelWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inspector-host"]')?.closest("[data-panel]")
    return panel ? panel.getBoundingClientRect().width : -1
  })
}

async function inspectorSeparatorBox(page: Page): Promise<Box | null> {
  return page.evaluate(() => {
    const sep = document.querySelector('[data-testid="inspector-host"]')?.closest("[data-panel]")?.previousElementSibling
    if (!sep || sep.getAttribute("role") !== "separator") return null
    const r = sep.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
}

for (const lang of ["zh", "en"] as const) {
  test(`1024 面板开着被压成 0（不关）→ 直接点一次「去审查」宽度恢复（${lang}）`, async () => {
    test.setTimeout(180_000)
    const { app, page, collapse, review } = await launchWithChange(lang)
    try {
      const mid = { width: 1024, height: 670 }
      await page.setViewportSize(mid)
      await page.waitForTimeout(400)
      await review.click()
      await expect(collapse).toHaveCount(1)
      await expectPaneUsable(page, `${lang} 1024 opened`, mid)
      // 把分隔条拖到窗外右缘：库把可折叠的审查栏压成 0。onResize 兜底每次打开最多补 3 次，
      // 反复拖到它补不动为止；全程不点开关，store 里一直是「开」。
      for (let i = 0; i < 8; i++) {
        if ((await inspectorPanelWidth(page)) < 1) {
          await page.waitForTimeout(600)
          if ((await inspectorPanelWidth(page)) < 1) break
        }
        const sep = await inspectorSeparatorBox(page)
        if (!sep) break
        const y = sep.y + sep.height / 2
        await page.mouse.move(sep.x + sep.width / 2, y)
        await page.mouse.down()
        await page.mouse.move(mid.width - 2, y, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(600)
      }
      await expect(collapse, `${lang} still open (not closed)`).toHaveCount(1)
      expect(await inspectorPanelWidth(page), `${lang} squashed to 0`).toBeLessThan(1)
      await shot(page, `squash-${lang}-1024-squashed`)
      // 只点一次「去审查」，不先关、不碰开关。
      await review.click()
      await expect
        .poll(() => inspectorPanelWidth(page), { message: `${lang} review restores width`, timeout: 3_000 })
        // 1024 宽时默认 38% 约 275px；和其它用例一样按「可用宽度 ≥ 240」判。
        .toBeGreaterThanOrEqual(240)
      await expect(collapse).toHaveCount(1)
      await page.waitForTimeout(300)
      await shot(page, `squash-${lang}-1024-review-restored`)
      await expectPaneUsable(page, `${lang} 1024 review restored`, mid)
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`窄窗抽屉开着时来了审批：抽屉自动收起，审批按钮露出可点（${lang}）`, async () => {
    test.setTimeout(180_000)
    const { app, page, expand, collapse, review } = await launchWithChange(lang)
    try {
      const narrow = { width: 768, height: 654 }
      await page.setViewportSize(narrow)
      await page.waitForTimeout(400)
      const host = page.locator('[data-testid="inspector-host"]')
      await review.click()
      await expect(host).toHaveAttribute("data-drawer", "open")
      await expectPaneUsable(page, `${lang} 768 drawer open`, narrow)
      await shot(page, `approval-drawer-${lang}-768-before`)
      // 抽屉开着时再要一次写盘审批（上一次只点了「允许」，不是本会话总是允许，所以还会再弹卡）。
      const composer = page.locator('[data-testid="composer-input"]')
      await composer.fill("please write a note")
      await page.waitForFunction(
        () => {
          const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
          return label === "Send" || label === "发送"
        },
        undefined,
        { timeout: 15_000 }
      )
      await composer.press("Enter")
      const allow = page.locator('[data-testid="approval-allow"]')
      await expect(allow).toBeVisible({ timeout: 15_000 })
      await expect(host, `${lang} drawer auto-closed`).toHaveAttribute("data-drawer", "closed", { timeout: 3_000 })
      await expect(expand).toHaveCount(1)
      await page.waitForTimeout(300)
      await shot(page, `approval-drawer-${lang}-768-approval`)
      for (const id of ["approval-allow", "approval-deny"]) {
        const button = page.locator(`[data-testid="${id}"]`)
        const box = await button.boundingBox()
        expect(box, `${lang} ${id} box`).not.toBeNull()
        const hitsSelf = await button.evaluate(
          (el, p) => {
            const hit = document.elementFromPoint(p.x, p.y)
            return Boolean(hit && (hit === el || el.contains(hit)))
          },
          { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
        )
        expect.soft(hitsSelf, `${lang} ${id} not covered by drawer`).toBe(true)
      }
      // 审批期间自己再打开抽屉：不会被立刻收回去。
      await clickToggle(page, expand, `${lang} 768 reopen during approval`, narrow)
      await expect(collapse).toHaveCount(1)
      await page.waitForTimeout(500)
      await expect(host, `${lang} manual reopen sticks`).toHaveAttribute("data-drawer", "open")
    } finally {
      await closeForRelaunch(app)
    }
  })
}
