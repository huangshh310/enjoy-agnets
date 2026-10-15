/**
 * 审批卡出现时，排队卡和它的按钮必须整张露出、可点，不被页头盖住，也不和审批卡按钮相交
 * （pr136-gate3 / pr157-gate-52、53：英文 Send right away 被页头和审批卡挡住，一次点偏到 Always allow this session）。
 * 中英文 × 733x480 / 768x654 / 1024x670 / 1024x768 / 1440x900；断言 boundingBox 在视口内、在页头下方、
 * 不和 approval-session / deny / allow 相交，并用 elementFromPoint 确认按钮中心点到的是按钮本身。
 * 最后在 733x480 真实点一下「马上发给它 / Send right away」：排队项被发走，审批卡还在（没误点到审批按钮）。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘，文件名前缀 ENJOY_E2E_SHOT_TAG（默认 after）。
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
