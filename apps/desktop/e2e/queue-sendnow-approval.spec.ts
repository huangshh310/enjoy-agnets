/**
 * 审批卡出现时，排队卡和它的按钮必须整张露出、可点，不被页头盖住，也不和审批卡按钮相交
 * （pr136-gate3 / pr157-gate-52、53：英文 Send right away 被页头和审批卡挡住，一次点偏到 Always allow this session）。
 * 中英文 × 733x480 / 768x654 / 1024x670 / 1024x768 / 1440x900；断言 boundingBox 在视口内、在页头下方、
 * 不和 approval-session / deny / allow 相交，并用 elementFromPoint 确认按钮中心点到的是按钮本身。
 * 最后在 733x480 真实点一下「马上发给它 / Send right away」：排队项被发走，审批卡还在（没误点到审批按钮）。
 * luna g158（e40edfb0 FAIL）：
 *   - 733x480 排队 1 条 / 2 条 / 2 条 + 输入框带图 / 3 条 + 输入框带图：审批三钮（本会话总是允许 / 拒绝 / 批准）都在视口内、elementFromPoint 命中、
 *     不带 force 真点得到；1 条时计划卡正文露出文件名（g158-05 回归）；放不下时排队区折叠成「排队 N 条」，点开展开；
 *   - 有排队行时不再挂「下一句」条；3 条及以上只画 2 行 +「还有 N 条」，点开看全部（1024x733）；
 *   - 1024x733 长对话：排队行 × 不被对话目录条盖住，点 × 删掉这条、不打开目录预览。
 * 另一条：紧凑行有文字又带图时，文字后面跟一个附件数小签（不然单行里看不出带着图），按钮仍整排露出。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘，文件名前缀 ENJOY_E2E_SHOT_TAG（默认 after）。
 *
 * #170 1d（luna CONDITIONAL → 可真机）：审批卡挤高 <64px 不画「还有 N 条」；
 * tall 展开够高过再缩到 733×480 → foldOnSqueeze 折成一行；再点开（autoFolded）保持展开且仍无胶囊。
 * 复现：ENJOY_E2E_STUB=1，发「please write a note」出审批卡，再排 ≥3 条，窗口 1024×720 → 展开 → 缩 733×480。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
const shotTag = process.env.ENJOY_E2E_SHOT_TAG ?? "after"
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

const SIZES = [
  { width: 733, height: 480 },
  { width: 768, height: 654 },
  { width: 1024, height: 670 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 }
]

const COPY = {
  zh: { queued: "排队的一句", sendNow: "马上发给它", back: "退回输入框", remove: "移除排队任务" },
  en: { queued: "queued line", sendNow: "Send right away", back: "Return to composer", remove: "Remove queued follow-up" }
} as const

type Box = { x: number; y: number; width: number; height: number }

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function boxOf(page: Page, selector: string, closest?: string): Promise<Box | null> {
  return page.evaluate(([sel, up]) => {
    const found = document.querySelector(sel)
    const el = up ? found?.closest(up) : found
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, [selector, closest ?? ""] as const)
}

for (const lang of ["zh", "en"] as const) {
  test(`审批卡出现时排队卡按钮完整可见可点、不压审批按钮（${lang}）`, async () => {
    test.setTimeout(180_000)
    const copy = COPY[lang]
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ws-"))
    const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ud-"))
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
      await sendComposer(page, composer, "please write a note")
      await expect(page.locator('[data-testid="approval-allow"]')).toBeVisible({ timeout: 15_000 })
      // 运行中再发一句 → 进队列（排队卡出现在审批卡上方）。
      await composer.click()
      await page.keyboard.type(copy.queued)
      await composer.press("Enter")
      const queued = page.locator('[data-testid="queued-user-turn"]')
      await expect(queued).toHaveCount(1, { timeout: 5_000 })
      await expect(queued).toContainText(copy.queued)

      for (const size of SIZES) {
        await page.setViewportSize(size)
        await page.waitForTimeout(500)
        if (shotsDir) {
          await page.screenshot({ path: join(shotsDir, `${shotTag}-queue-${lang}-${size.width}x${size.height}.png`) })
        }
        const tag = `${lang} ${size.width}x${size.height}`
        const header = await boxOf(page, '[data-testid="chat-breadcrumb"]', "header")
        expect(header, `${tag} chat header`).not.toBeNull()
        const headerBottom = header!.y + header!.height
        const approvalBoxes: Box[] = []
        for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
          const b = await boxOf(page, `[data-testid="${id}"]`)
          if (b) approvalBoxes.push(b)
        }
        expect.soft(approvalBoxes.length, `${tag} approval buttons rendered`).toBeGreaterThanOrEqual(2)
        for (const name of [copy.sendNow, copy.back, copy.remove]) {
          const button = queued.getByRole("button", { name, exact: true })
          const box = await button.boundingBox()
          expect.soft(box, `${tag} ${name} box`).not.toBeNull()
          if (!box) continue
          expect.soft(box.x, `${tag} ${name} left`).toBeGreaterThanOrEqual(0)
          expect.soft(box.x + box.width, `${tag} ${name} right`).toBeLessThanOrEqual(size.width)
          expect.soft(box.y, `${tag} ${name} below header (${headerBottom})`).toBeGreaterThanOrEqual(headerBottom)
          expect.soft(box.y + box.height, `${tag} ${name} bottom`).toBeLessThanOrEqual(size.height)
          for (const a of approvalBoxes) {
            expect.soft(intersects(box, a), `${tag} ${name} vs approval ${JSON.stringify(a)}`).toBe(false)
          }
          const cx = box.x + box.width / 2
          const cy = box.y + box.height / 2
          const hitsSelf = await button.evaluate(
            (el, p) => {
              const hit = document.elementFromPoint(p.cx, p.cy)
              return Boolean(hit && (hit === el || el.contains(hit)))
            },
            { cx, cy }
          )
          expect.soft(hitsSelf, `${tag} ${name} elementFromPoint(${cx},${cy})`).toBe(true)
        }
      }

      // 最小窗真实点一下：排队项被发走、审批仍待处理（没误点到「本会话总是允许」）。
      await page.setViewportSize({ width: 733, height: 480 })
      await page.waitForTimeout(400)
      const sendNow = queued.getByRole("button", { name: copy.sendNow, exact: true })
      const box = await sendNow.boundingBox()
      expect(box).not.toBeNull()
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
      await expect(queued).toHaveCount(0, { timeout: 5_000 })
      await expect(page.locator('[data-testid="approval-allow"]')).toBeVisible()
      await expect(page.locator('[data-testid="approval-session"]')).toBeVisible()
      if (shotsDir) {
        await page.screenshot({ path: join(shotsDir, `${shotTag}-queue-${lang}-733x480-clicked.png`) })
      }
    } finally {
      await closeForRelaunch(app)
    }
  })
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAOklEQVR42u3OMQ0AAAgDsEmbfxVIwQXhaFIBzbSvREhISEhISEhISEhISEhISEhISEhISEhISEjozgKXaGC19rykhgAAAABJRU5ErkJggg==",
  "base64"
)
const EXTRAS_ONE = { zh: "1 个附件或引用", en: "1 attachment or context chip" } as const

for (const lang of ["zh", "en"] as const) {
  test(`审批卡上方的紧凑排队行：有文字也显示附件数（${lang}）`, async () => {
    test.setTimeout(180_000)
    const copy = COPY[lang]
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ws-"))
    const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ud-"))
    writeFileSync(join(workspace, "readme.md"), "# e2e\n")
    const app = await relaunchElectron({
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_STUB_VISION: "1",
      ENJOY_E2E_LANG: lang,
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    })
    try {
      const page = await firstWindow(app)
      await page.setViewportSize({ width: 1024, height: 670 })
      const composer = page.locator('[data-testid="composer-input"]')
      await sendComposer(page, composer, "please write a note")
      await expect(page.locator('[data-testid="approval-allow"]')).toBeVisible({ timeout: 15_000 })
      // 带一张图 + 一句话排队。
      await page.locator('[data-testid="composer-attach"]').setInputFiles({ name: "queued.png", mimeType: "image/png", buffer: PNG })
      await expect(page.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
      await composer.click()
      await page.keyboard.type(copy.queued)
      await composer.press("Enter")
      const queued = page.locator('[data-testid="queued-user-turn"]')
      await expect(queued).toHaveCount(1, { timeout: 5_000 })
      await expect(queued).toHaveAttribute("data-placement", "dock")
      await expect(queued).toContainText(copy.queued)
      const extras = queued.locator('[data-testid="queued-extras"]')
      for (const size of [{ width: 733, height: 480 }, { width: 1440, height: 900 }]) {
        const tag = `${lang} ${size.width}x${size.height}`
        await page.setViewportSize(size)
        await page.waitForTimeout(400)
        await expect(extras, `${tag} extras chip`).toBeVisible()
        await expect(extras).toHaveAttribute("title", EXTRAS_ONE[lang])
        await expect(extras).toContainText("1")
        const box = await extras.boundingBox()
        expect.soft(box && box.x >= 0 && box.x + box.width <= size.width, `${tag} extras inside viewport`).toBe(true)
        const sendNow = queued.getByRole("button", { name: copy.sendNow, exact: true })
        const sb = await sendNow.boundingBox()
        expect.soft(sb && sb.x + sb.width <= size.width, `${tag} send-now still inside viewport`).toBe(true)
        if (shotsDir) {
          await page.screenshot({ path: join(shotsDir, `${shotTag}-queue-extras-${lang}-${size.width}x${size.height}.png`) })
        }
      }
    } finally {
      await closeForRelaunch(app)
    }
  })
}

type Lang = "zh" | "en"
const NEXT_HINT = { zh: "下一句：", en: "Next:" } as const
const QUEUE_HINT = { zh: "将在当前任务完成后执行", en: "Will run after the current task finishes" } as const
const COLLAPSED = { zh: (n: number) => `排队 ${n} 条`, en: (n: number) => `${n} queued` } as const
const MORE = { zh: (n: number) => `还有 ${n} 条`, en: (n: number) => `${n} more` } as const

async function launchApproval(lang: Lang, opts: { vision?: boolean; prompts?: string[] } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-qsn-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ...(opts.vision ? { ENJOY_E2E_STUB_VISION: "1" } : {}),
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  })
  const page = await firstWindow(app)
  await page.setViewportSize({ width: 1024, height: 733 })
  const composer = page.locator('[data-testid="composer-input"]')
  for (const text of opts.prompts ?? []) {
    await sendComposer(page, composer, text)
    await expect(page.locator("body")).toContainText(`stub-ok ${text.slice(0, 12)}`, { timeout: 20_000 })
    await expect(page.locator('[data-testid="composer-send"]')).toHaveAttribute("aria-label", /Send|发送/, { timeout: 20_000 })
  }
  await sendComposer(page, composer, "please write a note")
  await expect(page.locator('[data-testid="approval-allow"]')).toBeVisible({ timeout: 15_000 })
  return { app, page, composer, queued: page.locator('[data-testid="queued-user-turn"]'), dock: page.locator('[data-testid="queued-followups-docked"]') }
}

async function enqueue(page: Page, composer: ReturnType<Page["locator"]>, text: string, total: number) {
  await composer.click()
  await page.keyboard.type(text)
  await composer.press("Enter")
  await expect(page.locator('[data-testid="queued-followups-docked"]')).toHaveAttribute("data-count", String(total), { timeout: 5_000 })
}

/** 审批三钮都在视口内、在聊天顶栏下方、中心点到的是按钮本身（没被排队区 / 输入框 / 托盘盖住）。 */
async function expectApprovalReachable(page: Page, tag: string, size: { width: number; height: number }) {
  const header = await boxOf(page, '[data-testid="chat-breadcrumb"]', "header")
  const headerBottom = header ? header.y + header.height : 0
  for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
    const button = page.locator(`[data-testid="${id}"]`)
    await expect.soft(button, `${tag} ${id} visible`).toBeVisible()
    const box = await button.boundingBox()
    expect.soft(box, `${tag} ${id} box`).not.toBeNull()
    if (!box) continue
    expect.soft(box.y, `${tag} ${id} below header`).toBeGreaterThanOrEqual(headerBottom)
    expect.soft(box.y + box.height, `${tag} ${id} bottom inside viewport`).toBeLessThanOrEqual(size.height)
    expect.soft(box.x + box.width, `${tag} ${id} right inside viewport`).toBeLessThanOrEqual(size.width)
    const hitsSelf = await button.evaluate(
      (el, p) => {
        const hit = document.elementFromPoint(p.x, p.y)
        return Boolean(hit && (hit === el || el.contains(hit)))
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    )
    expect.soft(hitsSelf, `${tag} ${id} elementFromPoint hits itself`).toBe(true)
  }
}

/** 计划卡正文：文件名那一行整行露在正文区里（g158-05：修前有，e40edfb0 只剩标题）。 */
async function planFileVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.querySelector('[data-testid="approval-card-body"]')
    if (!body) return false
    const b = body.getBoundingClientRect()
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.includes("e2e-stub.txt")) continue
      const r = (n.parentElement as Element).getBoundingClientRect()
      if (r.height > 0 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5) return true
    }
    return false
  })
}

for (const lang of ["zh", "en"] as const) {
  test(`733x480 审批按钮永远可见：排队 1 条 / 2 条 / 输入框带图，放不下时折叠成「排队 N 条」可点开（${lang}）`, async () => {
    test.setTimeout(240_000)
    const copy = COPY[lang]
    const { app, page, composer, queued, dock } = await launchApproval(lang, { vision: true })
    try {
      const size = { width: 733, height: 480 }
      await page.setViewportSize(size)
      await page.waitForTimeout(400)
      const shot = async (name: string) => {
        if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-g158-${lang}-733x480-${name}.png`) })
      }

      // 1 条：三钮可点、计划卡露出文件名、不再挂「下一句」条。
      await enqueue(page, composer, `${copy.queued} 1`, 1)
      await page.waitForTimeout(300)
      await shot("1-queued")
      await expectApprovalReachable(page, `${lang} 1 queued`, size)
      expect.soft(await planFileVisible(page), `${lang} 1 queued plan file name visible`).toBe(true)
      await expect.soft(page.getByText(NEXT_HINT[lang], { exact: false }), `${lang} no next-hint rail`).toHaveCount(0)

      // 2 条。
      await enqueue(page, composer, `${copy.queued} 2`, 2)
      await page.waitForTimeout(300)
      await shot("2-queued")
      await expectApprovalReachable(page, `${lang} 2 queued`, size)

      // 2 条 + 输入框带图（托盘把对话列再压一截）：三钮仍可点（放不下就先折叠排队区）。
      const attach = () =>
        page.locator('[data-testid="composer-attach"]').setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: PNG })
      await attach()
      await expect(page.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
      await page.waitForTimeout(400)
      await shot("2-queued-image-tray")
      await expectApprovalReachable(page, `${lang} 2 queued + image`, size)

      // 3 条（输入框里的图跟着第 3 条走）+ 再放一张图：排队区折叠成一行「排队 3 条」，三钮仍可点。
      await enqueue(page, composer, `${copy.queued} 3`, 3)
      await attach()
      await expect(page.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
      await page.waitForTimeout(400)
      await shot("3-queued-image-tray")
      await expectApprovalReachable(page, `${lang} 3 queued + image`, size)
      const collapsed = page.locator('[data-testid="queued-collapsed"]')
      await expect(collapsed, `${lang} collapsed to one row`).toBeVisible()
      await expect(collapsed).toHaveText(COLLAPSED[lang](3))
      await expect(queued).toHaveCount(0)

      // 点一下展开：三条都在（区内滚），审批按钮仍然露出、可点。
      await collapsed.click()
      await expect(dock).toHaveAttribute("data-mode", "all")
      await expect(queued).toHaveCount(3)
      await page.waitForTimeout(300)
      await shot("4-expanded")
      await expectApprovalReachable(page, `${lang} expanded`, size)
      // #170 1d：733×480 + 审批卡把排队区挤到 <64px → 不画「还有 N 条」（本来就挤着点开，不走 foldOnSqueeze）。
      await expect(page.locator('[data-testid="queued-hidden-below"]'), `${lang} no hidden-below pill when squeezed`).toHaveCount(0)

      // 不带 force 真点「批准」：审批被处理，不是点到了别处。
      await page.locator('[data-testid="approval-allow"]').click({ timeout: 5_000 })
      await expect(page.locator('[data-testid="approval-allow"]')).toHaveCount(0, { timeout: 10_000 })
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`排队 3 条及以上只画 2 行 +「还有 N 条」，点开看全部；有排队行时不挂「下一句」条（${lang}）`, async () => {
    test.setTimeout(180_000)
    const copy = COPY[lang]
    const { app, page, composer, queued, dock } = await launchApproval(lang)
    try {
      for (let i = 1; i <= 4; i++) await enqueue(page, composer, `${copy.queued} ${i}`, i)
      await page.waitForTimeout(400)
      if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-g158-${lang}-1024x733-4queued.png`) })
      await expect(dock).toHaveAttribute("data-mode", "more")
      await expect(queued).toHaveCount(2)
      const more = page.locator('[data-testid="queued-more"]')
      await expect(more).toHaveText(MORE[lang](2))
      await expect(page.getByText(NEXT_HINT[lang], { exact: false }), `${lang} no next-hint rail`).toHaveCount(0)
      await expect(page.getByText(QUEUE_HINT[lang], { exact: true }), `${lang} no queued-hint rail`).toHaveCount(0)
      await expectApprovalReachable(page, `${lang} 1024x733 4 queued`, { width: 1024, height: 733 })
      await more.click()
      await expect(dock).toHaveAttribute("data-mode", "all")
      await expect(queued).toHaveCount(4)
      await page.waitForTimeout(300)
      if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-g158-${lang}-1024x733-4queued-expanded.png`) })
      await expectApprovalReachable(page, `${lang} 1024x733 expanded`, { width: 1024, height: 733 })
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`1024x733 长对话：排队行 × 不被对话目录条盖住，点 × 删掉这条、不打开目录（${lang}）`, async () => {
    test.setTimeout(240_000)
    const copy = COPY[lang]
    const filler = " long enough to fill the thread".repeat(10)
    // 8 句：刻度列（8 × 22px）在被审批卡压扁的消息区里居中后会往下伸到排队行上（luna g158-39）。
    const prompts = ["one", "two", "three", "four", "five", "six", "seven", "eight"].map((p) => `rail ${p} q${filler}`)
    const { app, page, composer, queued } = await launchApproval(lang, { prompts })
    try {
      const ticks = page.locator('[data-slot="preview-rail-item"]')
      await expect(ticks.first()).toBeAttached({ timeout: 10_000 })
      await enqueue(page, composer, `${copy.queued} 1`, 1)
      await enqueue(page, composer, `${copy.queued} 2`, 2)
      await page.waitForTimeout(500)
      const remove = queued.first().getByRole("button", { name: copy.remove, exact: true })
      const box = await remove.boundingBox()
      expect(box).not.toBeNull()
      // 前提：× 横向落在目录条刻度那一列里（luna 量到 x≈955–1003），否则测不到被盖。
      const nav = await boxOf(page, 'nav:has([data-slot="preview-rail-item"])')
      expect(nav, "rail nav present").not.toBeNull()
      const cx = box!.x + box!.width / 2
      const cy = box!.y + box!.height / 2
      expect(cx >= nav!.x && cx <= nav!.x + nav!.width, `× x=${cx} inside rail column ${JSON.stringify(nav)}`).toBe(true)
      // 前提：至少一个刻度和 × 相交（不相交就测不到被盖）。
      const tickBoxes = await ticks.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
      expect(tickBoxes.some((t) => intersects(t, box!)), `a rail tick overlaps × ${JSON.stringify({ box, tickBoxes })}`).toBe(true)
      if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-g158-${lang}-1024x733-rail-remove-before.png`) })
      const hitsSelf = await remove.evaluate(
        (el, p) => {
          const hit = document.elementFromPoint(p.x, p.y)
          return Boolean(hit && (hit === el || el.contains(hit)))
        },
        { x: cx, y: cy }
      )
      expect.soft(hitsSelf, `${lang} × elementFromPoint hits itself`).toBe(true)
      const firstText = await queued.first().textContent()
      const currentBefore = await page.evaluate(() =>
        document.querySelector('[data-slot="preview-rail-item"][aria-current="location"]')?.getAttribute("aria-label") ?? ""
      )
      // 指针移到 × 上：盖在上面的若是刻度，会悬停出目录预览卡。
      await page.mouse.move(cx, cy)
      await page.waitForTimeout(300)
      await expect(page.locator('[data-slot="preview-rail-card"]'), `${lang} hovering × opens no rail preview`).toHaveCount(0)
      await page.mouse.down()
      await page.mouse.up()
      await expect(queued).toHaveCount(1, { timeout: 5_000 })
      expect(firstText).toContain(`${copy.queued} 1`)
      await expect(queued.first()).toContainText(`${copy.queued} 2`)
      // 没点到刻度：当前位置没被改到别的句子上。
      const currentAfter = await page.evaluate(() =>
        document.querySelector('[data-slot="preview-rail-item"][aria-current="location"]')?.getAttribute("aria-label") ?? ""
      )
      expect.soft(currentAfter, `${lang} rail selection unchanged`).toBe(currentBefore)
      if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-g158-${lang}-1024x733-rail-remove-after.png`) })
    } finally {
      await closeForRelaunch(app)
    }
  })
}

// #158 gate P1（pr158-gate-09 / 10-733x480 / 11）：733x480 有审批卡时点「马上发给它」，
// 旧提示「已交给下一步检查点…」挂在输入框帽檐里（Composer 此时 shrink-0），对话列被压掉一行，审批卡只剩「计划概览」标题，
// 本会话总是允许 / 拒绝 / 批准 被帽檐盖住（elementFromPoint 命中提示文字），要点 × 才回来。
// 修后：有审批卡时提示画在审批卡上方的紧凑区（同列、文档流），放不下就让位；帽檐里不画。
const STEER_HINT = { zh: "已收到，它下一步就会看到。", en: "Got it. It'll see this at its next step." } as const
const OLD_STEER_HINT = /已交给下一步检查点|Queued for the next safe checkpoint/
const ANY_STEER_HINT = /已交给下一步检查点|Queued for the next safe checkpoint|已收到，它下一步就会看到|Got it\. It'll see this at its next step/

for (const lang of ["zh", "en"] as const) {
  test(`733x480 有审批卡时点「马上发」：提示不盖审批三钮，三钮在视口内、可点、未被遮挡（${lang}）`, async () => {
    test.setTimeout(240_000)
    const copy = COPY[lang]
    const { app, page, composer, queued, dock } = await launchApproval(lang, { vision: true })
    try {
      const size = { width: 733, height: 480 }
      await page.setViewportSize(size)
      await page.waitForTimeout(400)
      const shot = async (name: string) => {
        if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-p1-${lang}-733x480-${name}.png`) })
      }

      // gate 复现：排队 2 条 + 输入框带图（对话列最挤的一档）。
      await enqueue(page, composer, `${copy.queued} 1`, 1)
      await enqueue(page, composer, `${copy.queued} 2`, 2)
      await composer.click()
      await page.keyboard.type("typing")
      await page.locator('[data-testid="composer-attach"]').setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: PNG })
      await expect(page.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
      await page.waitForTimeout(400)
      // 放不下时排队区折叠成「排队 2 条」：点开再点行上的「马上发给它」（gate 同一路径）。
      const collapsed = page.locator('[data-testid="queued-collapsed"]')
      if (await collapsed.isVisible()) {
        await collapsed.click()
        await expect(dock).toHaveAttribute("data-mode", "all")
      }
      await expect(queued).toHaveCount(2)
      await shot("before")

      const sendNow = queued.first().getByRole("button", { name: copy.sendNow, exact: true })
      await expect(sendNow).toBeInViewport()
      const sb = await sendNow.boundingBox()
      expect(sb).not.toBeNull()
      await page.mouse.click(sb!.x + sb!.width / 2, sb!.y + sb!.height / 2)
      await expect(queued).toHaveCount(1, { timeout: 5_000 })
      await expect(queued.first()).toContainText(`${copy.queued} 2`)
      // 等插话落地、提示挂出来（旧代码在帽檐里，新代码在紧凑区；让位时也留着占位节点）。
      await expect(page.getByText(ANY_STEER_HINT).first()).toBeAttached({ timeout: 10_000 })
      await page.waitForTimeout(400)
      await shot("after-send-now")

      // 文案：不再出现「检查点 / Agent」那版。
      await expect(page.getByText(OLD_STEER_HINT)).toHaveCount(0)
      // 有审批卡时帽檐（输入框上方）里不挂这条提示。
      await expect(page.locator("form[data-composer]").locator("..").getByText(STEER_HINT[lang])).toHaveCount(0)

      // 三钮：可见、在视口内、可用、中心点命中自己、试点（trial）过 actionability（含「没被别的元素接走指针」）。
      const approvalBoxes: Box[] = []
      for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
        const button = page.locator(`[data-testid="${id}"]`)
        await expect(button, `${lang} ${id} visible`).toBeVisible()
        await expect(button, `${lang} ${id} in viewport`).toBeInViewport({ ratio: 1 })
        await expect(button, `${lang} ${id} enabled`).toBeEnabled()
        const box = await button.boundingBox()
        expect(box, `${lang} ${id} box`).not.toBeNull()
        approvalBoxes.push(box!)
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.y).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(size.width)
        expect(box!.y + box!.height).toBeLessThanOrEqual(size.height)
        const hit = await button.evaluate(
          (el, p) => {
            const at = document.elementFromPoint(p.x, p.y)
            return { ok: Boolean(at && (at === el || el.contains(at))), what: at ? `${at.tagName} ${(at.textContent ?? "").slice(0, 40)}` : "null" }
          },
          { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
        )
        expect(hit.ok, `${lang} ${id} elementFromPoint hits itself (got ${hit.what})`).toBe(true)
        await button.click({ trial: true, timeout: 3_000 })
      }

      // 提示若画出来了：整条在视口内、不和任何审批按钮相交。
      const hint = page.locator('[data-testid="dock-runtime-hint"]')
      if (await hint.isVisible()) {
        await expect(hint).toHaveText(STEER_HINT[lang])
        const hb = (await hint.boundingBox())!
        for (const a of approvalBoxes) expect(intersects(hb, a), `${lang} hint vs approval ${JSON.stringify(a)}`).toBe(false)
      }

      // 真点「批准」（不带 force）：审批被处理，没误点到别处。
      await page.locator('[data-testid="approval-allow"]').click({ timeout: 5_000 })
      await expect(page.locator('[data-testid="approval-allow"]')).toHaveCount(0, { timeout: 10_000 })
      await shot("approved")
    } finally {
      await closeForRelaunch(app)
    }
  })
}

/**
 * #170 1d / luna r-luna ①：审批卡 + 排队区 — tall 展开够高过（seenRoomy）再缩到 733×480 →
 * foldOnSqueeze 折回一行；再点开（autoFolded）保持展开且无「还有 N 条」胶囊。
 * refoldOnShort（tall→≤600）是另一条路径，本用例缩窗前先确认审批卡在、用高度变化挤 dock，不把它当回归。
 */
test("审批卡挤高：tall 展开后再缩 733×480 → 折成一行；再点开无「还有 N 条」胶囊（zh）", async () => {
  test.setTimeout(240_000)
  const lang = "zh" as const
  const copy = COPY[lang]
  const { app, page, composer, queued, dock } = await launchApproval(lang)
  try {
    // 高窗：审批卡 + 排 5 条，点开展开 → dock 够高（≥64），可能有「还有 N 条」。
    await page.setViewportSize({ width: 1024, height: 720 })
    await page.waitForTimeout(300)
    for (let i = 1; i <= 5; i++) await enqueue(page, composer, `${copy.queued} ${i}`, i)
    const collapsed = page.locator('[data-testid="queued-collapsed"]')
    if (await collapsed.isVisible()) await collapsed.click()
    // 也可能是「还有 N 条」的 more 模式：点开看全部。
    const more = page.locator('[data-testid="queued-more"]')
    if (await more.isVisible()) await more.click()
    await expect(dock).toHaveAttribute("data-mode", "all", { timeout: 5_000 })
    await expect(queued).toHaveCount(5)
    await page.waitForTimeout(400)
    const roomyHeight = await dock.evaluate((el) => (el as HTMLElement).clientHeight)
    expect(roomyHeight, `tall dock should be roomy (≥64), got ${roomyHeight}`).toBeGreaterThanOrEqual(64)
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-170-1d-tall-expanded.png`) })

    // 缩到 733×480：审批卡把排队区挤到 <64px → foldOnSqueeze 折回一行。
    await page.setViewportSize({ width: 733, height: 480 })
    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="approval-allow"]')).toBeVisible()
    await expect(collapsed, "foldOnSqueeze → 折成一行「排队 N 条」").toBeVisible({ timeout: 5_000 })
    await expect(collapsed).toHaveText(COLLAPSED[lang](5))
    await expect(page.locator('[data-testid="queued-hidden-below"]')).toHaveCount(0)
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-170-1d-squeezed-folded.png`) })

    // 再点开：autoFolded 这一轮不再自动折；挤着也不画胶囊。
    await collapsed.click()
    await expect(dock).toHaveAttribute("data-mode", "all", { timeout: 5_000 })
    await expect(queued).toHaveCount(5)
    await page.waitForTimeout(400)
    const squeezedHeight = await dock.evaluate((el) => (el as HTMLElement).clientHeight)
    expect(squeezedHeight, `squeezed dock <64 after re-expand, got ${squeezedHeight}`).toBeLessThan(64)
    await expect(page.locator('[data-testid="queued-hidden-below"]'), "挤高不画胶囊").toHaveCount(0)
    // 仍保持展开（不再被 foldOnSqueeze 折回去）。
    await page.waitForTimeout(500)
    await expect(dock).toHaveAttribute("data-mode", "all")
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${shotTag}-170-1d-reexpanded-no-pill.png`) })
  } finally {
    await closeForRelaunch(app)
  }
})
