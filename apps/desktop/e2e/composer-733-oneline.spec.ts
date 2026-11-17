/**
 * P2 733 底栏只留一行（段 A）：底栏按容器实测宽度选级（L0 → L1 → L2 → L3a–L3e），永远一行。
 * 1. 733×480 英文三条组合（待验收 + 有图 / 运行中 + 有图展开 / 暂停 2 + 待验收 + 任务栏）：一行、关键钮 5/5、send ≤ 状态栏 top − 13 且 ≤ 430、
 *    缩略图整张在验收条和 form 之间、对话区 ≥ 56。
 * 2. 宽度扫描 733 → 1440 → 733（步长 8）：级别单调、不回跳、每步一行；每个切换点 ±4 来回 10 次级别不变；全程没有 ResizeObserver loop。
 * 3. L3 溢出：三颗可选 chip（电脑操控 / 更倾向桌面 / 扩展）进菜单顶部小节，条上不再有；指南针钮有点和没点都是 28×28，点在钮内；
 *    点色与 L0 chip 的黄色判据一致；sr-only 说明（菜单外常驻）写出当前在菜单里的项（黄色时带警告原文）。
 * 4. 嵌套 Popover：Esc 一次关一层；点外层菜单内部只关内层；点两层之外两层都关、焦点不卡；「管理扩展」跳设置页，回来两层都关。
 * 5. 「已切换」在 733 和 1440 都整颗可见；L3c–L3e 更窄窗宽可达、testid 唯一（Q8 只验可达）。
 * 6. K6（luna §15）：733×480 暂停 2 + 待验收，点开暂停排队区 → 挤压态：说明行单行 24、带 title 全文、钉顶；排队行整行（0px 被裁）、
 *    滚到底乙整行可见、任何时刻可见行都是整行；三钮 + 行内钮 5/5；排队区不压验收条；send ≤ 430；1024 / 1440 不进挤压态、行全露。
 * 7. B1（luna §16）：733×480 审批 + 排队 2 + 图：「N 条等待」芯片不渲染（count 0，不是 hidden）；审批三钮在对话列内、5/5，
 *    点「马上发」前后都是；1024 / 1440 也 5/5；审批走掉（停止）后芯片照常回来。
 * 每个组合往 console 和 testInfo.attach 写一行诊断 JSON（行数、行高、级别、左组每项宽、右组宽、rowInner）。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron, stubPath } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"
// 侧栏自动收起断点：用产品常量（app-shell 唯一来源），不在测试里另写 768（leo F-e）
import { NARROW_SIDEBAR_PX } from "../src/renderer/src/components/app-shell/chrome/sidebar-collapse-state"

const SEND_GAP = 13
const SEND_MAX_733 = 430
const STEPS = ["0", "1", "2", "3a", "3b", "3c", "3d", "3e"] as const
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
/** stub 每词 0.4s，约 9s，不弹审批。 */
const SLOW = "slow a b c d e f g h i j k l m n o p q r s t u"
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

type Lang = "zh" | "en"
type Box = { x: number; y: number; width: number; height: number }

async function boot(lang: Lang, opts: { cu?: boolean; skills?: boolean } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-733-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-733-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  if (opts.skills) {
    const dir = join(workspace, ".agents", "skills", "ws-733-skill")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "SKILL.md"), "---\nname: ws-733-skill\ndescription: Workspace skill for the 733 footer gate.\ntrigger: /ws-733\n---\n# OK\n")
  }
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ...(opts.cu ? { ENJOY_E2E_CU_READY: "1" } : {})
  })
  try {
    const window = await firstWindow(app)
    const roErrors: string[] = []
    window.on("console", (m) => {
      if (/ResizeObserver loop/.test(m.text())) roErrors.push(m.text())
    })
    window.on("pageerror", (e) => {
      if (/ResizeObserver loop/.test(String(e))) roErrors.push(String(e))
    })
    const skip = window.getByRole("button", { name: /^(跳过设置|Skip setup)$/ })
    await window.waitForTimeout(800)
    if ((await skip.count()) > 0) await skip.click()
    await window.setViewportSize({ width: 1440, height: 920 })
    return { app, window, workspace, roErrors }
  } catch (error) {
    await closeForRelaunch(app)
    throw error
  }
}

/** fonts.ready + 底栏后代几何连续两帧不变。 */
async function settle(window: Page) {
  await window.evaluate(() => document.fonts.ready.then(() => undefined))
  let prev = ""
  for (let i = 0; i < 40; i += 1) {
    const cur = await window.evaluate(
      () =>
        new Promise<string>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const row = document.querySelector('[data-testid="composer-footer-row"]')
              const form = document.querySelector("form[data-composer]")
              const els = [row, ...(row?.querySelectorAll("*") ?? [])].filter(Boolean) as Element[]
              resolve(
                JSON.stringify([
                  row?.getAttribute("data-footer-density"),
                  row?.getAttribute("data-footer-overflow"),
                  form?.getBoundingClientRect().top,
                  ...els.map((el) => {
                    const b = el.getBoundingClientRect()
                    return [b.x, b.y, b.width, b.height]
                  })
                ])
              )
            })
          )
        )
    )
    if (cur === prev) return
    prev = cur
    await window.waitForTimeout(40)
  }
}

async function resize(window: Page, width: number, height: number) {
  await window.setViewportSize({ width, height })
  await settle(window)
}

const stepOf = (window: Page) =>
  window.evaluate(() => {
    const row = document.querySelector('[data-testid="composer-footer-row"]')
    return `${row?.getAttribute("data-footer-density") ?? "?"}${row?.getAttribute("data-footer-overflow") ?? ""}`
  })

/** N1 + CI 诊断：行内可见交互子项中心 y 差 ≤ 8、行高 ≤ 46；左组每项宽 / 右组宽 / rowInner 写进 console + attach。 */
async function footerDiag(window: Page, testInfo: TestInfo, label: string) {
  await settle(window)
  const d = await window.evaluate(() => {
    const row = document.querySelector('[data-testid="composer-footer-row"]') as HTMLElement | null
    const left = document.querySelector('[data-testid="composer-footer-left"]') as HTMLElement | null
    const right = document.querySelector('[data-testid="composer-footer-right"]') as HTMLElement | null
    if (!row || !left || !right) return null
    const visible = (el: Element) => {
      const b = el.getBoundingClientRect()
      return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== "hidden"
    }
    const items = [...row.querySelectorAll("button, [role=button], [data-testid=composer-run-chip], [data-testid=session-meter]")].filter(visible)
    const centers = items.map((el) => {
      const b = el.getBoundingClientRect()
      return b.top + b.height / 2
    })
    const lines: number[] = []
    for (const c of [...centers].sort((a, b) => a - b)) {
      if (!lines.length || c - lines[lines.length - 1]! > 8) lines.push(c)
    }
    const cs = getComputedStyle(row)
    const leftItems: Record<string, number> = {}
    for (const [i, el] of [...left.children].entries()) {
      const b = el.getBoundingClientRect()
      if (!b.width) continue
      const tid = el.getAttribute("data-testid") ?? el.querySelector("[data-testid]")?.getAttribute("data-testid") ?? `#${i}`
      leftItems[tid] = Math.round(b.width * 100) / 100
    }
    return {
      density: row.getAttribute("data-footer-density"),
      overflow: row.getAttribute("data-footer-overflow"),
      rowLines: lines.length,
      rowHeight: row.getBoundingClientRect().height,
      spreadY: centers.length ? Math.max(...centers) - Math.min(...centers) : 0,
      rowInner: row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      leftWidth: left.getBoundingClientRect().width,
      rightWidth: right.getBoundingClientRect().width,
      leftItems,
      vp: { w: innerWidth, h: innerHeight }
    }
  })
  expect(d, `${label}: footer row present`).not.toBeNull()
  const line = JSON.stringify({ label, ...d })
  console.log(`[composer-733-oneline] ${line}`)
  await testInfo.attach(`footer-${label}`, { body: line, contentType: "application/json" })
  expect(d!.rowLines, `${label}: one line ${line}`).toBe(1)
  expect(d!.spreadY, `${label}: N1 center spread ${line}`).toBeLessThanOrEqual(8)
  expect(d!.rowHeight, `${label}: row height ${line}`).toBeLessThanOrEqual(46)
  return d!
}

async function barTop(window: Page): Promise<number> {
  const top = await window.evaluate(() => {
    const bar = document.querySelector('[data-testid="status-context-meter"]')?.closest("[data-toast-clearance]")
    return bar ? bar.getBoundingClientRect().top : null
  })
  expect(top, "status bar present").toEqual(expect.any(Number))
  return top as number
}

/** 5 点 elementFromPoint（四角各收 3px + 中心）命中自身或后代。 */
async function hit5(locator: Locator, label: string) {
  const hits = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    // 胶囊 / 圆形钮的外接矩形四角不是可点击区域；四点取四象限中点（离边 1/4），仍覆盖整个按钮而非只测中心。
    const i = Math.min(r.width / 4, r.height / 4)
    return [
      [r.left + i, r.top + i],
      [r.right - i, r.top + i],
      [r.left + i, r.bottom - i],
      [r.right - i, r.bottom - i],
      [r.left + r.width / 2, r.top + r.height / 2]
    ].map(([x, y]) => {
      const at = document.elementFromPoint(x!, y!)
      return { x, y, ok: !!at && (at === el || el.contains(at)), by: at ? `${at.tagName}.${at.getAttribute("data-testid") ?? ""} "${(at.textContent ?? "").slice(0, 40)}" in ${at.closest("[data-testid]")?.getAttribute("data-testid") ?? "?"} rect=${JSON.stringify(r)}` : "none" }
    })
  })
  for (const h of hits) expect(h.ok, `${label}: (${h.x},${h.y}) covered by ${h.by}`).toBe(true)
}

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox()
  expect(b).toBeTruthy()
  return b as Box
}

/** send / stop / queue：bottom ≤ 状态栏 top − 13，733×480 下 ≤ 430，5/5。 */
async function expectActionClear(window: Page, testId: string, label: string) {
  const el = window.getByTestId(testId)
  await expect(el, `${label}: ${testId} visible`).toBeVisible()
  const b = await box(el)
  const top = await barTop(window)
  const bottom = b.y + b.height
  expect(bottom, `${label}: ${testId}.bottom ${bottom} ≤ barTop ${top} − ${SEND_GAP}`).toBeLessThanOrEqual(top - SEND_GAP + 0.5)
  const vp = window.viewportSize()!
  if (vp.width === 733 && vp.height === 480) expect(bottom, `${label}: ${testId}.bottom ≤ ${SEND_MAX_733}`).toBeLessThanOrEqual(SEND_MAX_733 + 0.5)
  await hit5(el, `${label} ${testId}`)
}

/** 缩略图整张在验收条和 form 之间、高 ≥ 44、5/5；对话区 ≥ 56；form 不被裁。 */
async function expectThumbAndConversation(window: Page, label: string) {
  const frame = await box(window.locator('[data-testid="composer-review-frame"]'))
  const form = await box(window.locator("form[data-composer]"))
  const chips = window.locator('[data-testid="composer-asset-chip"]')
  const n = await chips.count()
  expect(n, `${label}: attachment chip`).toBeGreaterThan(0)
  for (let i = 0; i < n; i += 1) {
    const t = await box(chips.nth(i))
    const dbg = JSON.stringify({ frame, form, thumb: t })
    expect(t.y, `${label}: thumb top ≥ review frame bottom ${dbg}`).toBeGreaterThanOrEqual(frame.y + frame.height - 0.5)
    expect(t.y + t.height, `${label}: thumb bottom ≤ form top ${dbg}`).toBeLessThanOrEqual(form.y + 0.5)
    expect(t.height, `${label}: thumb ≥ 44 ${dbg}`).toBeGreaterThanOrEqual(44)
    await hit5(chips.nth(i), `${label} thumb #${i}`)
  }
  await expectConversationAndForm(window, label)
}

async function expectConversationAndForm(window: Page, label: string) {
  const conv = await box(window.locator('[data-testid="chat-conversation"]'))
  expect(conv.height, `${label}: conversation ≥ 56 (h=${conv.height})`).toBeGreaterThanOrEqual(56 - 0.5)
  const form = await box(window.locator("form[data-composer]"))
  expect(form.y + form.height, `${label}: form.bottom ≤ viewport`).toBeLessThanOrEqual(window.viewportSize()!.height + 0.5)
  expect(await window.locator("form[data-composer]").evaluate((el) => el.scrollHeight <= el.clientHeight + 1), `${label}: form not clipped`).toBe(true)
  const input = await box(window.getByTestId("composer-input"))
  expect(input.height, `${label}: input ≥ 40`).toBeGreaterThanOrEqual(40)
}

async function snap(window: Page, name: string) {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}

async function writeTurnToReview(window: Page) {
  await sendComposer(window, window.getByTestId("composer-input"), "please write a note")
  await window.getByTestId("approval-allow").click({ timeout: 15_000, force: true })
  await expect(window.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
  await expect(window.getByTestId("review-gate-card")).toBeVisible({ timeout: 20_000 })
}

async function attachImage(window: Page, name = "blue.png") {
  const before = await window.locator('[data-testid="composer-asset-chip"]').count()
  await window.getByTestId("composer-attach").setInputFiles({ name, mimeType: "image/png", buffer: PNG })
  await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(before + 1, { timeout: 8_000 })
  await expect(window.locator('[data-testid="composer-asset-chip"] img').last()).toBeVisible({ timeout: 8_000 })
}


type DockGeo = {
  squeezed: string | null
  dock: { top: number; bottom: number; height: number }
  scroll: { top: number; bottom: number }
  desc: { top: number; bottom: number; height: number } | null
  reason: { height: number; lineHeight: number; title: string | null; text: string } | null
  rows: Array<{ top: number; bottom: number; visible: number; height: number }>
  frameTop: number | null
}

/** 停着的排队区几何：可见行 = 和「说明行底 → 滚动区底」相交的部分。 */
async function dockGeo(window: Page): Promise<DockGeo> {
  return window.evaluate(() => {
    const r = (el: Element) => el.getBoundingClientRect()
    const dock = document.querySelector('[data-testid="queued-followups-docked"]')!
    const sc = document.querySelector('[data-testid="queued-followups-scroll"]')!
    const desc = sc.querySelector(':scope > [data-testid="queue-paused-row"]')
    const reason = [...document.querySelectorAll('[data-testid="queue-paused-reason"], [data-testid="queue-paused-reason-short"]')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement | undefined
    const S = r(sc)
    const top = desc ? Math.max(S.top, r(desc).bottom) : S.top
    const frame = document.querySelector('[data-testid="composer-review-frame"]')
    return {
      squeezed: dock.getAttribute("data-squeezed"),
      dock: { top: r(dock).top, bottom: r(dock).bottom, height: r(dock).height },
      scroll: { top: S.top, bottom: S.bottom },
      desc: desc ? { top: r(desc).top, bottom: r(desc).bottom, height: r(desc).height } : null,
      reason: reason ? { height: r(reason).height, lineHeight: parseFloat(getComputedStyle(reason).lineHeight) || 0, title: reason.getAttribute("title"), text: reason.textContent ?? "" } : null,
      rows: [...sc.querySelectorAll(':scope > [data-testid="queued-user-turn"]')].map((row) => {
        const b = r(row)
        return { top: b.top, bottom: b.bottom, height: b.height, visible: Math.max(0, Math.min(b.bottom, S.bottom) - Math.max(b.top, top)) }
      }),
      frameTop: frame ? r(frame).top : null
    }
  })
}

/** K6：每条可见行要么整行露、要么完全不露（0.5px 容差）；排队区不压验收条。 */
function expectWholeRows(g: DockGeo, label: string) {
  const dbg = JSON.stringify(g)
  for (const [i, row] of g.rows.entries()) {
    const whole = row.visible >= row.height - 0.5
    expect(whole || row.visible <= 0.5, `${label}: row #${i} half-visible (${row.visible}/${row.height}) ${dbg}`).toBe(true)
  }
  if (g.frameTop != null) expect(g.dock.bottom, `${label}: dock.bottom ≤ review frame top ${dbg}`).toBeLessThanOrEqual(g.frameTop + 0.5)
}

async function pausedDockFlow(window: Page, lang: Lang) {
  await writeTurnToReview(window)
  await resize(window, 733, 480)
  await window.getByTestId("composer-input").fill(SLOW)
  await window.getByTestId("composer-input").press("Enter")
  await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
  for (const [i, text] of (lang === "en" ? ["queued one", "queued two"] : ["排队一", "排队二"]).entries()) {
    await window.getByTestId("composer-input").fill(text)
    await window.getByTestId("composer-input").press("Enter")
    await expect(window.getByTestId("queued-user-turn")).toHaveCount(i + 1, { timeout: 8_000 })
  }
  await window.getByTestId("composer-stop").click()
  await expect(window.locator('[data-testid="queue-paused-row"], [data-testid="queue-paused-collapsed"]').first()).toBeVisible({ timeout: 10_000 })
  await expect(window.getByTestId("composer-stop")).toHaveCount(0, { timeout: 10_000 })
  await window.evaluate(() => (globalThis as any).__enjoyE2e?.setReviewChrome({ workflowStatus: "needs_review" }))
  await expect(window.getByTestId("review-gate-card")).toBeVisible({ timeout: 10_000 })
  await settle(window)
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
})

test("733×480 英文三条：待验收 + 有图 · 运行中 + 有图展开 · 暂停 2 + 待验收 + 任务栏 —— 一行、5/5、三点", async () => {
    const testInfo = test.info()
  test.setTimeout(180_000)
  const { app, window, workspace, roErrors } = await boot("en")
  try {
    await writeTurnToReview(window)
    expect(existsSync(stubPath(workspace))).toBe(true)
    await attachImage(window)
    await resize(window, 733, 480)
    // ① 待验收 + 有图（单行条）· 空闲
    await window.getByTestId("composer-input").fill("look at this blue image")
    await footerDiag(window, testInfo, "733-en-review-image")
    await expectActionClear(window, "composer-send", "review+image")
    await expectThumbAndConversation(window, "review+image")
    for (const id of ["review-gate-open", "review-gate-reject", "review-gate-approve"]) {
      const b = await box(window.getByTestId(id))
      expect(b.y + b.height, `review+image: ${id} above status bar`).toBeLessThanOrEqual((await barTop(window)) + 0.5)
      await hit5(window.getByTestId(id), `review+image ${id}`)
    }
    await snap(window, "733-en-1-review-image")

    // ② 运行中 + 有图展开（并排 stop / queue）
    // stub 模型不收图：带图发送会直接报「换个能看图的模型」。先移除①的图，开跑后再附图（附图只进排队草稿）。
    await window.getByRole("button", { name: "Remove blue.png" }).dispatchEvent("click")
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(0, { timeout: 8_000 })
    await window.getByTestId("composer-input").fill("")
    await window.getByTestId("composer-input").fill(SLOW)
    await window.getByTestId("composer-input").press("Enter")
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(0, { timeout: 8_000 })
    await settle(window)
    // 运行点（luna §16，空草稿运行中才单显运行点）：L≥2 槽 12px（w-3），里面仍是现网 6px 呼吸点、水平 / 垂直居中，不放大
    // 运行点只在「运行中 + 空草稿 + 不并排」时挂（composer-footer showRunChip）。一次性读会撞上 Enter 后草稿清空 /
    // 运行态落 store 之前的那一帧（spec10 全量负载下 1/96 读到 null，单跑 4/4 绿）→ 轮询到运行点挂上，且读时仍在运行。
    type RunDot = { density: string | null; slotW: number; dotW: number; dotH: number; dx: number; dy: number }
    let runDot = null as RunDot | null
    let lastSeen = ""
    await expect
      .poll(
        async () => {
          const r = await window.evaluate(() => {
            const slot = document.querySelector('[data-testid="composer-run-chip"]')?.getBoundingClientRect()
            const dot = document.querySelector('[data-testid="composer-run-dot"]')?.getBoundingClientRect()
            const density = document.querySelector('[data-testid="composer-footer-row"]')?.getAttribute("data-footer-density") ?? null
            const seen = JSON.stringify({
              stop: document.querySelectorAll('[data-testid="composer-stop"]').length,
              pair: document.querySelectorAll('[data-testid="composer-action-pair"]').length,
              draft: (document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null)?.value?.length ?? -1,
              density
            })
            if (!slot || !dot) return { dot: null, seen }
            return {
              seen,
              dot: { density, slotW: slot.width, dotW: dot.width, dotH: dot.height, dx: Math.abs(dot.x + dot.width / 2 - (slot.x + slot.width / 2)), dy: Math.abs(dot.y + dot.height / 2 - (slot.y + slot.height / 2)) }
            }
          })
          lastSeen = r.seen
          runDot = r.dot
          return runDot !== null
        },
        { timeout: 8_000, intervals: [100, 200, 250], message: "running 时有运行点（轮询 8s）" }
      )
      .toBe(true)
    await expect(window.getByTestId("composer-stop"), "读运行点时仍在运行").toBeVisible()
    expect(runDot, `running 时有运行点（${lastSeen}）`).not.toBeNull()
    expect(Number(runDot!.density), "733 运行中在 L≥2").toBeGreaterThanOrEqual(2)
    expect(runDot!.slotW).toBeCloseTo(12, 0)
    expect(runDot!.dotW).toBeCloseTo(6, 0)
    expect(runDot!.dotH).toBeCloseTo(6, 0)
    expect(runDot!.dx).toBeLessThanOrEqual(0.5)
    expect(runDot!.dy).toBeLessThanOrEqual(0.5)
    await window.getByTestId("composer-footer-row").screenshot({ path: testInfo.outputPath("733-en-run-dot-row.png") })
    await attachImage(window, "blue-run.png")
    const tray = window.getByTestId("composer-attachment-tray")
    const expand = tray.getByRole("button", { name: /1 image/ })
    if ((await expand.count()) > 0) await expand.first().click()
    await window.getByTestId("composer-input").fill("queued one")
    await settle(window)
    const d2 = await footerDiag(window, testInfo, "733-en-running-image-expanded")
    expect(d2.density).not.toBeNull()
    await expectActionClear(window, "composer-stop", "running+image")
    // 并排：stop + 排队（排队钮沿用 composer-send）
    await expect(window.getByTestId("composer-action-pair")).toBeVisible()
    await expectActionClear(window, "composer-send", "running+image")
    await expectConversationAndForm(window, "running+image")
    await snap(window, "733-en-2-running-image-expanded")

    // ③ 暂停 2 + 待验收 + 任务栏
    await window.getByTestId("composer-input").press("Enter")
    await expect(window.getByTestId("queued-user-turn")).toHaveCount(1, { timeout: 8_000 })
    await window.getByTestId("composer-input").fill("queued two")
    await window.getByTestId("composer-input").press("Enter")
    await expect(window.getByTestId("queued-user-turn")).toHaveCount(2, { timeout: 8_000 })
    await window.getByTestId("composer-stop").click()
    await expect(window.locator('[data-testid="queue-paused-row"], [data-testid="queue-paused-collapsed"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(window.getByTestId("composer-stop")).toHaveCount(0, { timeout: 10_000 })
    await window.evaluate(() => (globalThis as any).__enjoyE2e?.setReviewChrome({ workflowStatus: "needs_review" }))
    const cont = window.getByTestId("todo-continue")
    await expect
      .poll(async () => {
        if ((await cont.count()) === 0) await window.evaluate(() => (globalThis as any).__enjoyE2e?.injectTodoList?.(["a", "b", "c"]))
        return cont.count()
      }, { timeout: 8_000, intervals: [250] })
      .toBeGreaterThan(0)
    await expect(window.getByTestId("review-gate-card")).toBeVisible({ timeout: 10_000 })
    await settle(window)
    await footerDiag(window, testInfo, "733-en-paused2-review-tasks")
    await expectActionClear(window, "composer-send", "paused+review+tasks")
    await expectConversationAndForm(window, "paused+review+tasks")
    await snap(window, "733-en-3-paused-review-tasks")
    expect(roErrors, "no ResizeObserver loop").toEqual([])
  } finally {
    await closeForRelaunch(app)
  }
})

for (const lang of ["zh", "en"] as const) {
  test(`宽度扫描（${lang}）：733 → 1440 → 733 步长 8，级别单调不回跳、每步一行；切换点 ±4 ×10 不变；「已切换」733 / 1440 整颗可见`, async () => {
    const testInfo = test.info()
    test.setTimeout(240_000)
    const { app, window, roErrors } = await boot(lang)
    try {
      await sendComposer(window, window.getByTestId("composer-input"), lang === "en" ? "hello there" : "你好")
      await expect(window.locator("body")).toContainText("stub-ok", { timeout: 20_000 })
      await expect(window.getByTestId("composer-send")).toHaveAttribute("aria-label", /^(Send|发送)$/, { timeout: 20_000 })
      const H = 720
      const seq: Array<{ w: number; step: string; inner: number }> = []
      const widths = [] as number[]
      for (let w = 733; w <= 1440; w += 8) widths.push(w)
      if (widths[widths.length - 1] !== 1440) widths.push(1440)
      const down = [...widths].reverse().slice(1)
      for (const w of [...widths, ...down]) {
        await resize(window, w, H)
        const step = await stepOf(window)
        const one = await window.evaluate(() => {
          const row = document.querySelector('[data-testid="composer-footer-row"]')!
          const cs = [...row.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => {
            const r = b.getBoundingClientRect()
            return r.top + r.height / 2
          })
          return { spread: Math.max(...cs) - Math.min(...cs), h: row.getBoundingClientRect().height, inner: (row as HTMLElement).clientWidth }
        })
        expect(one.spread, `${lang} w=${w} N1 spread`).toBeLessThanOrEqual(8)
        expect(one.h, `${lang} w=${w} row height`).toBeLessThanOrEqual(46)
        seq.push({ w, step, inner: one.inner })
      }
      const idx = (s: string) => STEPS.indexOf(s as (typeof STEPS)[number])
      for (const s of seq) expect(idx(s.step), `${lang} w=${s.w} step ${s.step} known`).toBeGreaterThanOrEqual(0)
      const up = seq.slice(0, widths.length)
      // 单调按容器（rowInner）判，不按窗宽：窗宽跨过布局断点（≈768 起侧栏出现）时 row 会突然变窄，降级是对的（arch §2.3：rowInner 与级别无关、natural 随级别不增 → 级别随 rowInner 单调）。
      for (let i = 1; i < seq.length; i += 1) {
        const a = seq[i - 1]!
        const b = seq[i]!
        const msg = `${lang} ${a.w}→${b.w} (row ${a.inner}→${b.inner}, ${a.step}→${b.step})`
        if (b.inner > a.inner) expect(idx(b.step), `widening ${msg}`).toBeLessThanOrEqual(idx(a.step))
        else if (b.inner < a.inner) expect(idx(b.step), `narrowing ${msg}`).toBeGreaterThanOrEqual(idx(a.step))
        else expect(b.step, `same row ${msg}`).toBe(a.step)
      }
      expect(up[up.length - 1]!.step, `${lang} 1440 is L0`).toBe("0")
      const sweep = JSON.stringify(seq.filter((s, i, a) => i === 0 || a[i - 1]!.step !== s.step))
      console.log(`[composer-733-oneline] sweep ${lang} ${sweep}`)
      await testInfo.attach(`sweep-${lang}`, { body: sweep, contentType: "application/json" })

      // 每个实测切换点 ±4 来回 10 次：级别不变
      // 只测底栏自己的阈值：窗宽步进 8 时 row 也该只变约 8。row 一步跳了几百 px 的点是窗口布局断点（≈768 侧栏出现 / 收起），
      // 那里 ±4 本来就跨两种容器宽，级别跟着容器走是对的（上面的单调判据已按 rowInner 覆盖），回滞 8 吸收不了也不该吸收。
      const LAYOUT_JUMP = 16
      const switchPts = seq.filter((s, i, a) => i > 0 && a[i - 1]!.step !== s.step).map((s) => ({ w: s.w, jump: Math.abs(s.inner - seq[seq.indexOf(s) - 1]!.inner) }))
      const layoutBreaks = switchPts.filter((p) => p.jump > LAYOUT_JUMP)
      console.log(`[composer-733-oneline] layout-breaks ${lang} ${JSON.stringify(layoutBreaks)}`)
      const switches = switchPts.filter((p) => p.jump <= LAYOUT_JUMP).map((p) => p.w)
      expect(switches.length, `${lang}: at least one footer threshold between 733 and 1440`).toBeGreaterThan(0)
      for (const w of new Set(switches)) {
        await resize(window, w, H)
        const at = await stepOf(window)
        const seen: string[] = []
        for (let k = 0; k < 10; k += 1) {
          await resize(window, w + 4, H)
          seen.push(await stepOf(window))
          await resize(window, w - 4, H)
          seen.push(await stepOf(window))
        }
        const first = at
        console.log(`[composer-733-oneline] jitter ${lang} ±4@${w} start=${at} ${seen.join(",")}`)
        expect(seen, `${lang} ±4 around ${w} (start ${at}): ${seen.join(",")}`).toEqual(seen.map(() => first))
      }

      for (const [w, h] of [[733, 480], [1024, 670], [1440, 920]] as const) {
        await resize(window, w, h)
        await footerDiag(window, testInfo, `${w}-${lang}-idle`)
        await expectActionClear(window, "composer-send", `${w} ${lang} idle`)
      }
      // 1024 余量 ≥ 19
      await resize(window, 1024, 670)
      const s1024 = await box(window.getByTestId("composer-send"))
      expect((await barTop(window)) - (s1024.y + s1024.height), `${lang} 1024 margin`).toBeGreaterThanOrEqual(19)

      // 「已切换」：加第二个模型，在 1440 和 733 各切一次，整颗可见
      await window.evaluate(async () => {
        const ide = (globalThis as any).ide
        const ps = await ide.settings.listProviders()
        const p = ps.find((x: any) => x.active)
        await ide.settings.upsertProvider({
          id: p.id, name: p.name, kind: p.kind, baseURL: p.baseURL, modelId: p.modelId, apiStyle: p.apiStyle,
          models: [...p.models.map(({ id, label, enabled }: any) => ({ id, label, enabled })), { id: "stub-e2e-b", label: "E2E Stub B", enabled: true }]
        })
      })
      await window.reload()
      await window.getByTestId("composer-input").waitFor({ timeout: 30_000 })
      for (const [w, h, target] of [[1440, 920, "stub-e2e-b"], [733, 480, "stub-e2e"]] as const) {
        await resize(window, w, h)
        await window.getByTestId("composer-model-chip").click()
        await window.getByTestId(`model-switch-item-${target}`).first().click({ timeout: 5_000 })
        const toast = window.getByTestId("model-switch-toast")
        await expect(toast).toBeVisible({ timeout: 5_000 })
        // 选完模型菜单要先收起（退出动画结束、节点卸载），否则量到的是菜单盖在浮签上。
        await expect(window.locator('[data-testid^="model-switch-item-"]'), `${lang} ${w}: model menu closed`).toHaveCount(0, { timeout: 3_000 })
        await settle(window)
        const t = await box(toast)
        expect(t.x, `${lang} ${w}: toast left in viewport`).toBeGreaterThanOrEqual(0)
        expect(t.x + t.width, `${lang} ${w}: toast right in viewport`).toBeLessThanOrEqual(w + 0.5)
        expect(t.y, `${lang} ${w}: toast top in viewport`).toBeGreaterThanOrEqual(0)
        const clipped = await toast.evaluate((el) => {
          const r = el.getBoundingClientRect()
          let p = el.parentElement
          while (p) {
            const cs = getComputedStyle(p)
            if (/(clip|hidden)/.test(cs.overflowX) || /(clip|hidden)/.test(cs.overflowY)) {
              const q = p.getBoundingClientRect()
              if ((/(clip|hidden)/.test(cs.overflowX) && (r.left < q.left - 0.5 || r.right > q.right + 0.5)) || (/(clip|hidden)/.test(cs.overflowY) && (r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5))) return p.className
            }
            p = p.parentElement
          }
          return null
        })
        expect(clipped, `${lang} ${w}: toast clipped by ancestor`).toBeNull()
        // 浮签本身是 pointer-events-none（现网如此，不改），elementFromPoint 会穿透它；只在量的这一瞬给它临时 auto，量完复原，判 5 点不被别的层盖住。
        await toast.evaluate((el) => ((el as HTMLElement).style.pointerEvents = "auto"))
        try {
          await hit5(toast, `${lang} ${w} 已切换`)
        } finally {
          await toast.evaluate((el) => ((el as HTMLElement).style.pointerEvents = "")).catch(() => undefined)
        }
        await snap(window, `switched-${lang}-${w}`)
        await expect(toast).toHaveCount(0, { timeout: 8_000 })
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

/** 套用带「更倾向桌面」的启动预设（照 p2-composer-recipe-gate 的步骤）。 */
async function applyDesktopBiasPreset(window: Page, lang: Lang) {
  await window.getByTestId("composer-engine-chip").click()
  await expect(window.getByTestId("agent-picker-panel")).toBeVisible({ timeout: 10_000 })
  await window.getByTestId("composer-preset-rail").click()
  await expect(window.getByTestId("composer-preset-row")).toBeVisible({ timeout: 8_000 })
  await window.getByTestId("composer-preset-save-toggle").click()
  await window.getByTestId("composer-preset-name").fill(lang === "en" ? "Desk" : "桌面")
  await window.getByTestId("composer-preset-desktop-bias").locator("input").check()
  await window.getByTestId("composer-preset-save-submit").click()
  await expect(window.getByTestId("composer-preset-list")).toBeVisible({ timeout: 8_000 })
  await window.keyboard.press("Escape")
  await window.waitForTimeout(300)
  await window.getByTestId("composer-input").fill("")
  await window.getByTestId("composer-engine-chip").click()
  await expect(window.getByTestId("agent-picker-panel")).toBeVisible({ timeout: 10_000 })
  await window.getByTestId("composer-preset-rail").click()
  await expect(window.getByTestId("composer-preset-list")).toBeVisible({ timeout: 8_000 })
  await window.getByTestId("composer-preset-apply").first().click()
  await window.waitForTimeout(400)
  await window.keyboard.press("Escape")
  await window.waitForTimeout(300)
  await window.getByTestId("composer-input").fill("")
  await expect(window.getByTestId("preset-desktop-bias-pill")).toBeVisible({ timeout: 8_000 })
}

const menuContent = (window: Page) => window.locator("[data-radix-popper-content-wrapper]").filter({ has: window.getByText(/^(会话目标与总结|Session goal & recap)$/) })
const hostPopover = (window: Page, lang: Lang) =>
  window.locator("[data-radix-popper-content-wrapper]").filter({ has: window.getByRole("button", { name: lang === "en" ? "Manage extensions" : "管理扩展" }) })

/** 把窗口一路收窄到目标级（≥ want），返回窗宽。 */
async function narrowTo(window: Page, want: string, height: number) {
  const target = STEPS.indexOf(want as (typeof STEPS)[number])
  for (let w = 733; w >= 400; w -= 8) {
    await resize(window, w, height)
    if (STEPS.indexOf((await stepOf(window)) as (typeof STEPS)[number]) >= target) return w
  }
  return null
}

for (const lang of ["zh", "en"] as const) {
  test(`L3 溢出（${lang}）：三颗 chip 进菜单、指南针 28 有点 / 没点、点色 parity、sr-only 说明；嵌套 Popover Esc / 点内 / 点外`, async () => {
    const testInfo = test.info()
    test.setTimeout(240_000)
    const { app, window, roErrors } = await boot(lang, { cu: true, skills: true })
    try {
      // 不先发消息：发过一轮后 HostInject 走本轮注入快照（stub 不注入 → hidden，芯片按现网逻辑消失）；
      // 这里要的是「已启用 1 个 Skill」那颗芯片在底栏，故停在发送前的已启用态。
      await applyDesktopBiasPreset(window, lang)
      await resize(window, 1440, 920)
      const row = window.getByTestId("composer-footer-row")
      for (const id of ["computer-use-chip", "preset-desktop-bias-pill", "host-inject-chip"]) {
        await expect(row.getByTestId(id), `L0 ${id} on bar`).toBeVisible({ timeout: 10_000 })
      }
      // 三颗 chip 全在条上时 1440 可能已是 L1（容器判级，侧栏占宽）；这里只要求还没到 L3b
      const s0 = await stepOf(window)
      expect(STEPS.indexOf(s0 as (typeof STEPS)[number]), `1440 start ${s0} < 3b`).toBeLessThan(STEPS.indexOf("3b"))
      const overflow = window.getByTestId("composer-overflow")
      // 没点：L3b 前钮 28×28、无点
      await expect(window.getByTestId("composer-overflow-dot")).toHaveCount(0)
      const b0 = await box(overflow)
      expect([b0.width, b0.height], "compass 28 without dot").toEqual([28, 28])
      // L0 菜单原文（对比 L3b 时去掉小节后的文本）
      await overflow.click()
      await expect(menuContent(window)).toBeVisible()
      const menuText0 = (await menuContent(window).innerText()).trim()
      await window.keyboard.press("Escape")
      await expect(menuContent(window)).toHaveCount(0)
      // 黄色判据（chip 侧）
      const hostKind = await window.getByTestId("host-inject-bar").getAttribute("data-kind")
      const chipWarn = (await window.getByTestId("host-inject-chip").locator("svg.text-status-yellow-text").count()) > 0
      expect(chipWarn, `chip warn icon ⇔ kind ${hostKind}`).toBe(hostKind === "unsupported" || hostKind === "failed")
      const chipTexts = {
        cu: (await row.getByTestId("computer-use-chip").innerText()).trim(),
        pb: (await row.getByTestId("preset-desktop-bias-pill").innerText()).trim(),
        hi: (await row.getByTestId("host-inject-chip").innerText()).trim()
      }
      // L2 宽：chip 仍在条上，黄色 icon 一致
      const w2 = await narrowTo(window, "2", 480)
      expect(w2).not.toBeNull()
      if ((await row.getByTestId("host-inject-chip").count()) > 0) {
        expect((await row.getByTestId("host-inject-chip").locator("svg.text-status-yellow-text").count()) > 0, "L2 chip warn parity").toBe(chipWarn)
      }

      // L3b
      const w3b = await narrowTo(window, "3b", 480)
      expect(w3b, "L3b reachable").not.toBeNull()
      await footerDiag(window, testInfo, `${w3b}-${lang}-L3b-three-chips`)
      for (const id of ["computer-use-chip", "preset-desktop-bias-pill", "host-inject-chip"]) {
        await expect(row.getByTestId(id), `L3b ${id} not on bar`).toHaveCount(0)
      }
      const dot = window.getByTestId("composer-overflow-dot")
      await expect(dot).toHaveCount(1)
      await expect(dot).toHaveAttribute("aria-hidden", "true")
      await expect(dot).toHaveAttribute("data-tone", chipWarn ? "warn" : "accent")
      const b3 = await box(overflow)
      expect([b3.width, b3.height], "compass 28 with dot").toEqual([28, 28])
      const db = await box(dot)
      expect(db.x >= b3.x && db.y >= b3.y && db.x + db.width <= b3.x + b3.width && db.y + db.height <= b3.y + b3.height, `dot inside button ${JSON.stringify({ db, b3 })}`).toBe(true)
      // sr-only：菜单外常驻，写出当前在菜单里的项（+ 黄色警告原文）
      const status = window.getByTestId("composer-overflow-status")
      expect(await status.evaluate((el) => !!el.closest("[data-radix-popper-content-wrapper]"))).toBe(false)
      const desc = (await status.textContent())?.trim() ?? ""
      for (const part of [chipTexts.cu, chipTexts.pb, chipTexts.hi]) expect(desc, `a11y description has ${part}`).toContain(part)
      if (chipWarn) expect(desc).toMatch(/不支持|does not support|跳过|skipped/i)
      await expect(overflow).toHaveAccessibleDescription(desc)
      console.log(`[composer-733-oneline] a11y ${lang} kind=${hostKind} warn=${chipWarn} desc=${JSON.stringify(desc)}`)
      await snap(window, `L3b-${lang}-dot`)

      // 菜单：小节在原标题之上，原条目文本不变
      await overflow.click()
      const menu = menuContent(window)
      await expect(menu).toBeVisible()
      const section = menu.getByTestId("composer-overflow-footer-items")
      await expect(section).toBeVisible()
      const sb = await box(section)
      expect(sb.y, `${lang}: L3b section top inside viewport (menu not clipped)`).toBeGreaterThanOrEqual(0)
      for (const id of ["computer-use-chip", "preset-desktop-bias-pill", "host-inject-chip"]) await expect(section.getByTestId(id)).toHaveCount(1)
      if (chipWarn) await expect(menu.getByTestId("composer-overflow-host-warn")).toBeVisible()
      const heading = menu.getByText(/^(会话目标与总结|Session goal & recap)$/)
      expect((await box(section)).y).toBeLessThan((await box(heading)).y)
      const restText = await menu.evaluate((el) => {
        const clone = el.cloneNode(true) as HTMLElement
        clone.querySelector('[data-testid="composer-overflow-footer-items"]')?.remove()
        document.body.appendChild(clone)
        const t = clone.innerText
        clone.remove()
        return t.trim()
      })
      expect(restText, "original menu entries unchanged").toBe(menuText0)
      await snap(window, `L3b-${lang}-menu-open`)

      // 嵌套：Esc 一次关一层
      await section.getByTestId("host-inject-chip").click()
      await expect(hostPopover(window, lang)).toBeVisible()
      await snap(window, `L3b-${lang}-nested-popover`)
      await window.keyboard.press("Escape")
      await expect(hostPopover(window, lang)).toHaveCount(0)
      await expect(menu).toBeVisible()
      await window.keyboard.press("Escape")
      await expect(menu).toHaveCount(0)
      // 点外层菜单内部：只关内层
      await overflow.click()
      await expect(menu).toBeVisible()
      await section.getByTestId("host-inject-chip").click()
      await expect(hostPopover(window, lang)).toBeVisible()
      await menu.getByText(/^(会话目标与总结|Session goal & recap)$/).click()
      await expect(hostPopover(window, lang)).toHaveCount(0)
      await expect(menu).toBeVisible()
      // 点两层之外：两层都关，焦点不卡
      await section.getByTestId("host-inject-chip").click()
      await expect(hostPopover(window, lang)).toBeVisible()
      // 两层之外的一点：输入框左端（未发消息时没有会话流节点；菜单在右侧，不与输入框左端重叠）
      const inp = await box(window.getByTestId("composer-input"))
      await window.mouse.click(inp.x + 12, inp.y + Math.min(12, inp.height / 2))
      await expect(hostPopover(window, lang)).toHaveCount(0)
      await expect(menu).toHaveCount(0)
      const focusInPopper = await window.evaluate(() => !!document.activeElement?.closest("[data-radix-popper-content-wrapper]"))
      expect(focusInPopper, "focus not stuck in a closed layer").toBe(false)
      await window.getByTestId("composer-input").click()
      await window.keyboard.type("ok")
      await expect(window.getByTestId("composer-input")).toHaveValue("ok")
      await window.getByTestId("composer-input").fill("")
      // 「管理扩展」：跳设置页，回来两层都关
      await overflow.click()
      await section.getByTestId("host-inject-chip").click()
      await hostPopover(window, lang).getByRole("button", { name: lang === "en" ? "Manage extensions" : "管理扩展" }).click()
      await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/settings\/extensions/)
      await window.evaluate(() => {
        location.hash = "#/"
      })
      await window.getByTestId("composer-input").waitFor({ timeout: 12_000 })
      await settle(window)
      await expect(window.locator("[data-radix-popper-content-wrapper]")).toHaveCount(0)

      // L3c–L3e：更窄窗宽可达、testid 唯一（Q8 只验可达）
      for (const want of ["3c", "3d", "3e"] as const) {
        const w = await narrowTo(window, want, 480)
        const got = await stepOf(window)
        console.log(`[composer-733-oneline] ${lang} reach ${want}: w=${w} step=${got}`)
        await testInfo.attach(`reach-${lang}-${want}`, { body: JSON.stringify({ w, step: got }), contentType: "application/json" })
        expect(w, `${lang}: L${want} reachable by narrowing (got ${got})`).not.toBeNull()
        await footerDiag(window, testInfo, `${w}-${lang}-L${got}`)
        await overflow.click()
        await expect(menu.getByTestId("composer-overflow-footer-items")).toBeVisible()
        for (const id of ["session-meter", "prompt-library-button", "composer-preview-toggle"]) {
          expect(await window.locator(`[data-testid="${id}"]`).count(), `${want}: ${id} unique`).toBeLessThanOrEqual(1)
        }
        if (STEPS.indexOf(got as (typeof STEPS)[number]) >= STEPS.indexOf("3d")) {
          await expect(row.getByTestId("prompt-library-button")).toHaveCount(0)
          await expect(menu.getByTestId("prompt-library-button")).toHaveCount(1)
        }
        await window.keyboard.press("Escape")
        await expect(menu).toHaveCount(0)
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

/** 左组每一项：实际宽 vs 自然宽（同 group 上下文里 absolute 克隆量）、文字行数、高；chip 不许被 flex 压扁 / 折行。 */
async function leftItemsNatural(window: Page) {
  return window.evaluate(() => {
    const row = document.querySelector('[data-testid="composer-footer-row"]') as HTMLElement
    const left = document.querySelector('[data-testid="composer-footer-left"]') as HTMLElement
    const lines = (el: Element) => {
      const tops = new Set<number>()
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = walker.nextNode())) {
        if (!n.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(n)
        for (const r of range.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top))
      }
      return tops.size
    }
    const items = [...left.children].flatMap((el, i) => {
      const b = el.getBoundingClientRect()
      if (!b.width && !b.height) return []
      const clone = el.cloneNode(true) as HTMLElement
      clone.removeAttribute("data-testid")
      clone.querySelectorAll("[data-testid]").forEach((c) => c.removeAttribute("data-testid"))
      clone.style.cssText += ";position:absolute;visibility:hidden;flex-shrink:0;left:0;top:0;pointer-events:none"
      left.appendChild(clone)
      const natural = clone.getBoundingClientRect().width
      clone.remove()
      const id = el.getAttribute("data-testid") ?? el.querySelector("[data-testid]")?.getAttribute("data-testid") ?? `#${i}`
      return [{ id, width: b.width, natural, height: b.height, lines: lines(el) }]
    })
    const attach = left.querySelector(":scope > button, :scope > * > button") as HTMLElement | null
    return {
      step: `${row.getAttribute("data-footer-density")}${row.getAttribute("data-footer-overflow") ?? ""}`,
      items,
      attachWidth: attach ? attach.getBoundingClientRect().width : null,
      chipsOnBar: ["computer-use-chip", "preset-desktop-bias-pill", "host-inject-chip"].filter((id) => row.querySelector(`[data-testid="${id}"]`)),
      chipHeights: Object.fromEntries(["computer-use-chip", "preset-desktop-bias-pill", "host-inject-chip"].flatMap((id) => { const el = row.querySelector(`[data-testid="${id}"]`); return el ? [[id, el.getBoundingClientRect().height]] : [] }))
    }
  })
}

for (const lang of ["zh", "en"] as const) {
  test(`#228 H1（${lang}）：新会话 + 桌面预设，空首屏与紧接着那一轮 × 1440 / 1080 / 984 / 733 —— chip 与附件钮按自然宽、不压扁不折行，放不下就降级进菜单`, async () => {
    const testInfo = test.info()
    test.setTimeout(240_000)
    const { app, window, roErrors } = await boot(lang, { cu: true, skills: true })
    try {
      await window.getByTestId("sidebar-new-session").click()
      await window.waitForTimeout(600)
      await applyDesktopBiasPreset(window, lang)
      const check = async (phase: string) => {
        for (const w of [1440, 1080, 984, 733]) {
          await resize(window, w, 480)
          const label = `H1-${phase}-${w}x480-${lang}`
          await footerDiag(window, testInfo, label)
          const d = await leftItemsNatural(window)
          const line = JSON.stringify({ label, ...d })
          console.log(`[composer-733-oneline] ${line}`)
          await testInfo.attach(label, { body: line, contentType: "application/json" })
          for (const it of d.items) {
            expect(it.width, `${label} ${it.id} 不被压（实际 ≥ 自然 − 0.5）${line}`).toBeGreaterThanOrEqual(it.natural - 0.5)
            expect(it.lines, `${label} ${it.id} 文字一行 ${line}`).toBeLessThanOrEqual(1)
          }
          for (const id of d.chipsOnBar) {
            expect(d.chipHeights[id], `${label} ${id} 高 24（未被压成多行）${line}`).toBeLessThanOrEqual(24.5)
          }
          expect(d.attachWidth, `${label} 附件钮 30 ${line}`).toBeCloseTo(30, 0)
          // 三颗 chip 不在条上 ⇔ 已降到 L3b 及以后（进菜单），不是被挤没
          if (d.chipsOnBar.length === 0) expect(STEPS.indexOf(d.step as (typeof STEPS)[number]), `${label} chips moved ⇒ ≥3b`).toBeGreaterThanOrEqual(STEPS.indexOf("3b"))
          if (shotsDir) await window.screenshot({ path: join(shotsDir, `${label}.png`) })
        }
      }
      await check("empty")
      await resize(window, 1440, 480)
      await sendComposer(window, window.getByTestId("composer-input"), lang === "en" ? "hello there" : "你好")
      await expect(window.locator("body")).toContainText("stub-ok", { timeout: 20_000 })
      await expect(window.getByTestId("composer-send")).toHaveAttribute("aria-label", /^(Send|发送)$/, { timeout: 30_000 })
      await check("turn")
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

for (const lang of ["zh", "en"] as const) {
  test(`K6（${lang}）：733×480 暂停 2 + 待验收，点开暂停排队区 → 挤压态整行、说明行单行钉顶、5/5；1024 / 1440 不进挤压态`, async () => {
    test.setTimeout(180_000)
    const { app, window, roErrors } = await boot(lang)
    try {
      await pausedDockFlow(window, lang)
      // 窗口 ≤600 高时暂停区默认折成一行（pausedCollapsed），点开
      const collapsed = window.getByTestId("queue-paused-collapsed")
      await expect(collapsed.or(window.getByTestId("queue-paused-row")).first()).toBeVisible({ timeout: 8_000 })
      if (await collapsed.isVisible()) await collapsed.click()
      await expect(window.getByTestId("queue-paused-row")).toBeVisible({ timeout: 5_000 })
      await expect(window.getByTestId("queued-followups-docked")).toHaveAttribute("data-squeezed", /^[1-9]\d*$/, { timeout: 5_000 })
      await settle(window)
      const g = await dockGeo(window)
      const dbg = JSON.stringify(g)
      console.log(`[composer-733-oneline] K6 ${lang} top ${dbg}`)
      // 说明行 1 行、高 24、title = 全文
      expect(g.desc!.height, `K6 ${lang}: desc row 24 ${dbg}`).toBeGreaterThan(23.5)
      expect(g.desc!.height, `K6 ${lang}: desc row 24 ${dbg}`).toBeLessThanOrEqual(24.5)
      expect(g.reason!.height, `K6 ${lang}: reason one line ${dbg}`).toBeLessThanOrEqual(g.reason!.lineHeight + 0.5)
      expect(g.reason!.title, `K6 ${lang}: reason title = full text`).toBe(g.reason!.text)
      // 排队甲整行在区内
      expect(g.rows[0]!.top, `K6 ${lang}: row A top ≥ dock top ${dbg}`).toBeGreaterThanOrEqual(g.dock.top - 0.5)
      expect(g.rows[0]!.bottom, `K6 ${lang}: row A bottom ≤ scroll bottom ${dbg}`).toBeLessThanOrEqual(g.scroll.bottom + 0.5)
      expectWholeRows(g, `K6 ${lang} top`)
      for (const id of ["queue-paused-continue", "queue-paused-clear", "queue-paused-edit-first"]) {
        const el = window.getByTestId(id)
        if ((await el.count()) > 0) await hit5(el, `K6 ${lang} ${id}`)
      }
      const rowA = window.getByTestId("queued-user-turn").first()
      for (const id of ["queued-return", "queued-remove"]) await hit5(rowA.getByTestId(id), `K6 ${lang} row A ${id}`)
      await expectActionClear(window, "composer-send", `K6 ${lang}`)
      await expectConversationAndForm(window, `K6 ${lang}`)
      await snap(window, `K6-${lang}-733-squeezed-top`)
      // 滚到底：乙整行可见、说明行钉顶、停下时没有半行
      await window.getByTestId("queued-followups-scroll").evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
      await window.waitForTimeout(600)
      const end = await dockGeo(window)
      const dbgEnd = JSON.stringify(end)
      console.log(`[composer-733-oneline] K6 ${lang} end ${dbgEnd}`)
      expect(Math.abs(end.desc!.top - end.scroll.top), `K6 ${lang}: desc pinned at top while scrolled ${dbgEnd}`).toBeLessThanOrEqual(0.5)
      const last = end.rows[end.rows.length - 1]!
      expect(last.visible, `K6 ${lang}: last row whole at end ${dbgEnd}`).toBeGreaterThanOrEqual(last.height - 0.5)
      expectWholeRows(end, `K6 ${lang} end`)
      await hit5(window.getByTestId("queue-paused-continue"), `K6 ${lang} continue (scrolled)`)
      await hit5(window.getByTestId("queued-user-turn").last().getByTestId("queued-remove"), `K6 ${lang} row B remove`)
      await snap(window, `K6-${lang}-733-squeezed-end`)
      // 1024 / 1440：内容放得下，不进挤压态，行全露
      for (const [w, h] of [[1024, 670], [1440, 920]] as const) {
        await resize(window, w, h)
        await expect(window.getByTestId("queued-followups-docked")).not.toHaveAttribute("data-squeezed", /.*/, { timeout: 5_000 })
        const wide = await dockGeo(window)
        for (const [i, row] of wide.rows.entries()) expect(row.visible, `K6 ${lang} ${w}: row #${i} whole ${JSON.stringify(wide)}`).toBeGreaterThanOrEqual(row.height - 0.5)
        expectWholeRows(wide, `K6 ${lang} ${w}`)
        await snap(window, `K6-${lang}-${w}-expanded`)
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })

  test(`B1（${lang}）：733×480 审批 + 排队 2 + 图 —— 不渲染「N 条等待」芯片，审批三钮在对话列内 5/5（马上发前后）；审批走掉芯片回来`, async () => {
    test.setTimeout(180_000)
    const { app, window, roErrors } = await boot(lang, {})
    try {
      const composer = window.getByTestId("composer-input")
      await sendComposer(window, composer, "please write a note")
      await expect(window.getByTestId("approval-allow")).toBeVisible({ timeout: 15_000 })
      await resize(window, 733, 480)
      for (const i of [1, 2]) {
        await composer.click()
        await window.keyboard.type(`${lang === "en" ? "queued line" : "排队的一句"} ${i}`)
        await composer.press("Enter")
        await expect(window.getByTestId("queued-followups-docked")).toHaveAttribute("data-count", String(i), { timeout: 5_000 })
      }
      await composer.click()
      await window.keyboard.type("typing")
      await attachImage(window, "tray.png")
      const approvalClear = async (label: string) => {
        await settle(window)
        // 条件渲染：DOM 里根本没有（不是 hidden / 透明）
        await expect(window.getByTestId("composer-queue-chip"), `${label}: queue chip not rendered`).toHaveCount(0)
        const conv = await box(window.getByTestId("chat-conversation"))
        for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
          const el = window.getByTestId(id)
          if ((await el.count()) === 0) continue
          const b = await box(el)
          expect(b.y + b.height, `${label}: ${id} inside conversation ${JSON.stringify({ b, conv })}`).toBeLessThanOrEqual(conv.y + conv.height + 0.5)
          await hit5(el, `${label} ${id}`)
        }
      }
      await approvalClear(`B1 ${lang} 733`)
      await snap(window, `B1-${lang}-733-approval-queue2-image`)
      for (const [w, h] of [[1024, 670], [1440, 920]] as const) {
        await resize(window, w, h)
        await approvalClear(`B1 ${lang} ${w}`)
      }
      await resize(window, 733, 480)
      const collapsed = window.getByTestId("queued-collapsed")
      if (await collapsed.isVisible().catch(() => false)) await collapsed.click()
      const sendNow = window.getByTestId("queued-user-turn").first().getByTestId("queued-send-now")
      const sb = await box(sendNow)
      await window.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2)
      await expect(window.getByTestId("queued-user-turn")).toHaveCount(1, { timeout: 5_000 })
      await window.waitForTimeout(500)
      await approvalClear(`B1 ${lang} 733 after send-now`)
      await snap(window, `B1-${lang}-733-after-send-now`)
      // 审批走掉（停止 → 队列停着、还剩 1 条）：芯片照常回来
      await window.getByTestId("composer-stop").click()
      await expect(window.getByTestId("approval-allow")).toHaveCount(0, { timeout: 15_000 })
      await expect(window.getByTestId("queued-followups-docked")).toHaveAttribute("data-count", "1", { timeout: 10_000 })
      await expect(window.getByTestId("composer-queue-chip"), `B1 ${lang}: chip back once approval is gone`).toBeVisible({ timeout: 10_000 })
      await snap(window, `B1-${lang}-733-approval-gone-chip-back`)
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

/** 逐帧（rAF）记底栏级 / 行高 / 发送钮底 / 是否在跑，直到 stop()。 */
async function recordFrames(window: Page) {
  await window.evaluate(() => {
    const w = window as unknown as { __h2rec?: { f: [string, number, number | null, number, number][]; stop: boolean } }
    const st = { f: [] as [string, number, number | null, number, number][], stop: false }
    w.__h2rec = st
    const loop = () => {
      const row = document.querySelector('[data-testid="composer-footer-row"]')
      const send = document.querySelector('[data-testid="composer-send"],[data-testid="composer-stop"]')
      st.f.push([
        `${row?.getAttribute("data-footer-density") ?? "?"}${row?.getAttribute("data-footer-overflow") ?? ""}`,
        row ? Math.round(row.getBoundingClientRect().height) : -1,
        send ? Math.round(send.getBoundingClientRect().bottom) : null,
        document.querySelector('[data-testid="composer-stop"]') ? 1 : 0,
        window.innerWidth
      ])
      if (!st.stop) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
  return async () =>
    window.evaluate(() => {
      const st = (window as unknown as { __h2rec: { f: [string, number, number | null, number, number][]; stop: boolean } }).__h2rec
      st.stop = true
      return st.f
    })
}
const levelDirChanges = (levels: string[]) => {
  let n = 0
  let dir = 0
  for (let i = 1; i < levels.length; i += 1) {
    const d = Math.sign(STEPS.indexOf(levels[i] as (typeof STEPS)[number]) - STEPS.indexOf(levels[i - 1] as (typeof STEPS)[number]))
    if (!d) continue
    if (dir && d !== dir) n += 1
    dir = d
  }
  return n
}

/** 等 n 个 rAF（按帧等，不按毫秒猜）。 */
const waitFrames = (window: Page, n: number) =>
  window.evaluate(
    (k) =>
      new Promise<void>((resolve) => {
        let i = 0
        const f = () => (++i >= k ? resolve() : requestAnimationFrame(f))
        requestAnimationFrame(f)
      }),
    n
  )
/** 侧栏落定（宽度连续 6 帧不变）+ 底栏落定（settle）。替代固定 sleep。 */
async function settleSidebar(window: Page) {
  await expect
    .poll(
      () =>
        window.evaluate(
          () =>
            new Promise<boolean>((resolve) => {
              // 用 setTimeout 采样（每 16ms 一次、连续 6 次不变），不靠 rAF：拖窗后偶发 rAF 一段时间不回调，
              // 整个 evaluate 挂住、poll 10s 超时（#228 neo ② H2 去偶发，r10 2/40）。单次最多 600ms 就交回 poll 重试。
              const nav = () => document.querySelector("[data-nav-card]")?.getBoundingClientRect().width ?? -1
              const first = nav()
              let i = 0
              const deadline = setTimeout(() => resolve(false), 600)
              const f = () => {
                if (nav() !== first) {
                  clearTimeout(deadline)
                  return resolve(false)
                }
                if (++i >= 6) {
                  clearTimeout(deadline)
                  return resolve(true)
                }
                setTimeout(f, 16)
              }
              setTimeout(f, 16)
            })
        ),
      { timeout: 10_000, intervals: [50] }
    )
    .toBe(true)
  await settle(window)
}
/** 「一直跑」桩（e2e-stub「slow hold」：不自己结束，直到 Stop）——整段检查期间都在跑，不靠一轮慢回复的长度碰运气（#228 neo ②）。 */
const HOLD = "slow hold a b c"

for (const lang of ["zh", "en"] as const) {
  test(`#228 H2（${lang}）：CU 运行中拖窗跨 768（侧栏自动收 / 展）、逐步扫宽（快 / 慢拖每 2px 停 200ms）与点侧栏开关 —— 级别逐帧单向不回弹、每帧一行、发送钮不越界`, async () => {
    const testInfo = test.info()
    test.setTimeout(300_000)
    const { app, window, roErrors } = await boot(lang, { cu: true })
    try {
      const input = window.getByTestId("composer-input")
      await expect(window.getByTestId("composer-send")).toHaveAttribute("aria-label", /^(Send|发送)$/, { timeout: 30_000 })
      await sendComposer(window, input, HOLD)
      await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
      await settle(window)
      // ladder：同方向逐宽落定的静态级（拖窗 / 扫宽才有；点开关没有窗宽变化，不传）
      const check = async (label: string, act: () => Promise<void>, ladder?: Map<number, string>) => {
        await expect(window.getByTestId("composer-stop"), `${label} 检查前在跑`).toBeVisible()
        const stop = await recordFrames(window)
        await act()
        await settleSidebar(window)
        await waitFrames(window, 10)
        const f = await stop()
        const ran = f.filter((x) => x[3] === 1)
        const levels = ran.map((x) => x[0]).filter((k, i, a) => i === 0 || a[i - 1] !== k)
        // jojo M1 口径（与 jojo 门 jh2v 一致）：每帧 = 当前窗宽 + 侧栏目标态的静态级，768 停靠时静态级本身就是 3e、766 收起后升回，
        // 所以按窗宽是否跨过自动收起断点（iw < 768）切段，每段内级别单向；iw < 768 任何一帧不出现 3e。
        const segs: string[][] = []
        let segNarrow: boolean | null = null
        for (const x of ran) {
          const narrow = x[4] < NARROW_SIDEBAR_PX
          if (narrow !== segNarrow) {
            segs.push([])
            segNarrow = narrow
          }
          const s = segs[segs.length - 1]
          if (s[s.length - 1] !== x[0]) s.push(x[0])
        }
        const narrow3e = ran.filter((x) => x[4] < NARROW_SIDEBAR_PX && x[0].startsWith("3e")).map((x) => `${x[0]}@${x[4]}`)
        // #228 跟进 ⑤（F-d）：逐帧对照静态梯。分段单向抓不到「跨段回弹」（段 1 停在 3d、段 2 先跳到更远的级再往回走），
        // 这里不按段：每一帧都要落在「进入这一宽时的级 → 这一宽的静态级」之间，且每次换级都朝这一宽的静态级走、不越过。
        // 换宽后的第一帧允许是上一宽的判定（rAF 先于 RO，帧里读到的级是上一帧按上一宽判的）。终态 = 终点宽的静态级。
        const ladderBad: string[] = []
        let ladderEnd: string | null = null
        if (ladder) {
          const ix = (k: string) => STEPS.indexOf(k as (typeof STEPS)[number])
          const within = (v: number, a: number, b: number) => v >= Math.min(a, b) && v <= Math.max(a, b)
          let entry = ix(ran[0]![0])
          // 停滞：换宽后第一帧之后，该升级（同宽静态级比当前级更宽松）却一帧没动，每宽最多容 2 帧（闸门 tail 两帧）。
          // 「hook 不传 ahead」时拖窄跨 768 会在 740 / 760 / 764 停在 3d 七到十帧、766 停在 768 的静态级上几帧才往回走——这一停不看是不是 3e。
          // 该降级却停着不算：断点带里降级由 150ms 闸门压着（leo F-d 已接受，左组被裁不换行、send 不动），768 那一下 3d 停 2–3 帧再落 3e 是设计内的。
          let stall = 0
          let stallLv = ""
          const flushStall = (w: number) => {
            if (stall > 2) ladderBad.push(`停滞 ${stallLv}@${w}×${stall}≠${ladder.get(w)}`)
            stall = 0
          }
          for (let k = 1; k < ran.length; k += 1) {
            const [lv, , , , iw] = ran[k]!
            const [pv, , , , piw] = ran[k - 1]!
            if (iw !== piw) {
              flushStall(piw)
              entry = ix(pv)
            }
            const t = ladder.get(iw)
            if (t == null) {
              ladderBad.push(`?@${iw}`)
              continue
            }
            if (iw === piw && lv === pv && ix(t) < ix(lv)) {
              if (stall === 0) stallLv = lv
              stall += 1
            }
            const c = ix(lv)
            const p = ix(pv)
            const okFor = (target: string | undefined) => {
              if (target == null) return false
              const ti = ix(target)
              // 落在进入级与目标级之间；这一帧若换了级，只能朝目标走、不越过
              return within(c, entry, ti) && (c === p || ((c - p) * (ti - p) > 0 && Math.abs(c - p) <= Math.abs(ti - p)))
            }
            const lag = iw !== piw
            if (!okFor(t) && !(lag && okFor(ladder.get(piw)))) ladderBad.push(`${pv}→${lv}@${piw}/${iw}≠${t}`)
          }
          const last = ran[ran.length - 1]!
          flushStall(last[4])
          if (last[0] !== ladder.get(last[4])) ladderEnd = `${last[0]}@${last[4]}≠${ladder.get(last[4])}`
        }
        const line = JSON.stringify({ label, frames: f.length, running: ran.length, levels, segs, narrow3e: narrow3e.length, ladder: ladder ? Object.fromEntries(ladder) : undefined, ladderBad: ladderBad.slice(0, 12), ladderBadN: ladderBad.length, ladderEnd, maxRowH: Math.max(...f.map((x) => x[1])), maxSendB: Math.max(...f.map((x) => x[2] ?? 0)) })
        console.log(`[composer-733-oneline] ${line}`)
        await testInfo.attach(label, { body: line, contentType: "application/json" })
        expect(ran.length, `${label} 全程在跑 ${line}`).toBe(f.length)
        expect(f.length, `${label} 有帧 ${line}`).toBeGreaterThan(5)
        expect(
          segs.reduce((n, s) => n + levelDirChanges(s), 0),
          `${label} 跨 768 前后各段级别单向 ${line}`
        ).toBe(0)
        if (ladder) {
          expect(ladderBad, `${label} 逐帧对照静态梯：每帧在进入级与同宽静态级之间、换级只朝静态级走不越过 ${line}`).toEqual([])
          expect(ladderEnd, `${label} 终态 = 终点宽静态级 ${line}`).toBeNull()
        }
        expect(narrow3e, `${label} iw<768 无 3e ${line}`).toEqual([])
        for (const x of f) {
          expect(x[1], `${label} 每帧一行 ${line}`).toBeLessThanOrEqual(46)
          expect(x[2] ?? 0, `${label} 发送钮底 ≤ ${SEND_MAX_733} ${line}`).toBeLessThanOrEqual(SEND_MAX_733 + 0.5)
        }
      }
      const prep = async (w: number) => {
        await window.setViewportSize({ width: w, height: 480 })
        await settleSidebar(window)
      }
      /**
       * 静态梯：从 a 出发、同方向依次落到 widths 里每一宽（每宽 settleSidebar），记各宽静态级，再跳回 a。
       * 回滞带里静态级和起步级有关（同一宽从 3d 下来还是 3e，取决于从哪来），所以要求「梯的起步级 = 跳回 a 后的级」
       * （检查就从跳回后的状态起步，走同一条路）；不等就从跳回后的状态再建一次（最多 3 次）。
       */
      const ladderOf = async (a: number, widths: number[]) => {
        await prep(a)
        let start = await stepOf(window)
        for (let attempt = 0; ; attempt += 1) {
          const m = new Map<number, string>([[a, start]])
          for (const x of widths) {
            await prep(x)
            m.set(x, await stepOf(window))
          }
          await prep(a)
          const back = await stepOf(window)
          if (back === start) return m
          expect(attempt, `ladder ${a}→${widths.at(-1)} 起步级稳定（${start} / 跳回 ${back}）`).toBeLessThan(2)
          start = back
        }
      }
      // jojo 裁定：CU 开着、运行中窄宽（800 侧栏展开 = 3d）chip 进溢出菜单（§10 第 1 条），状态在菜单小节里看得到
      await prep(800)
      if ((await window.getByTestId("composer-footer-row").getByTestId("computer-use-chip").count()) === 0) {
        await window.getByTestId("composer-overflow").click()
        await expect(window.getByTestId("composer-overflow-footer-items").getByTestId("computer-use-chip"), "运行中 CU 在溢出菜单里").toBeVisible()
        await window.keyboard.press("Escape")
        await expect(window.getByTestId("composer-overflow-footer-items")).toHaveCount(0)
      }
      for (const [a, b] of [
        [800, 740],
        [740, 800],
        [780, 760],
        [760, 780],
        [776, 764],
        [764, 776]
      ] as const) {
        const ladder = await ladderOf(a, [b])
        await check(
          `H2-drag-${a}-${b}-${lang}`,
          async () => {
            await window.setViewportSize({ width: b, height: 480 })
          },
          ladder
        )
      }
      // jojo 9b 逐步扫宽（每步等 3 帧）与慢拖（每 2px 停 200ms，jojo 门的口径）：跨 768（776↔760），断点上方不先降一级再被侧栏收起推回。
      // 不靠时间：意图信号按窗宽 / 侧栏状态判，停多久结果都一样。
      for (const [mode, dwell] of [
        ["sweep", 0],
        ["slow", 200]
      ] as const) {
        for (const [a, b] of [
          [776, 760],
          [760, 776]
        ] as const) {
          const dir = Math.sign(b - a)
          const widths: number[] = []
          for (let x = a + dir * 2; dir > 0 ? x <= b : x >= b; x += dir * 2) widths.push(x)
          const ladder = await ladderOf(a, widths)
          await check(
            `H2-${mode}-${a}-${b}-${lang}`,
            async () => {
              for (const x of widths) {
                await window.setViewportSize({ width: x, height: 480 })
                if (dwell) await window.waitForTimeout(dwell)
                else await waitFrames(window, 3)
              }
            },
            ladder
          )
        }
      }
      // 点侧栏开关（宽窗，停靠）：收 / 展各一次
      for (const w of [1100, 900, 800]) {
        await prep(w)
        for (const dir of ["collapse", "expand"]) {
          await check(`H2-toggle-${w}-${dir}-${lang}`, async () => {
            await window.getByTestId("sidebar-toggle").click()
          })
        }
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
      await window.getByTestId("composer-stop").click()
      await expect(window.getByTestId("composer-send")).toBeVisible({ timeout: 10_000 })
    } finally {
      await closeForRelaunch(app)
    }
  })
}

// #228 jojo M1（门的口径）：慢拖每 2px 停 200ms 跨 768 双向，zh/en × 运行中 / idle。
// 静态梯 = 同方向每 2px 落定（settle）的级别；慢拖每一帧的级别只能是「这一步 / 上一步」窗宽的静态级（换级那一两帧的尾随复核），
// 停够 200ms 后 = 这一步的静态级；iw < 768（侧栏目标已收起）任何一帧不出现 3e。
for (const lang of ["zh", "en"] as const) {
  test(`#228 H2 慢拖（${lang}）：每 2px 停 200ms 跨 768 双向，运行中 / idle —— 每帧 = 同宽静态级、iw<768 无 3e`, async () => {
    const testInfo = test.info()
    test.setTimeout(300_000)
    const { app, window, roErrors } = await boot(lang, { cu: true })
    try {
      const input = window.getByTestId("composer-input")
      const step = async (w: number) => {
        await window.setViewportSize({ width: w, height: 480 })
      }
      const level = () =>
        window.evaluate(() => {
          const r = document.querySelector('[data-testid="composer-footer-row"]')
          return `${r?.getAttribute("data-footer-density") ?? "?"}${r?.getAttribute("data-footer-overflow") ?? ""}`
        })
      const HI = 780
      const LO = 756
      for (const mode of ["running", "idle"] as const) {
        if (mode === "running") {
          await expect(window.getByTestId("composer-send")).toHaveAttribute("aria-label", /^(Send|发送)$/, { timeout: 30_000 })
          await sendComposer(window, input, HOLD)
          await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
        }
        for (const [a, b] of [
          [HI, LO],
          [LO, HI]
        ] as const) {
          const dir = Math.sign(b - a)
          const widths: number[] = []
          for (let x = a + dir * 2; dir > 0 ? x <= b : x >= b; x += dir * 2) widths.push(x)
          // 静态梯（同方向、每步落定）
          await step(a)
          await settleSidebar(window)
          const ladder = new Map<number, string>([[a, await level()]])
          for (const x of widths) {
            await step(x)
            await settleSidebar(window)
            ladder.set(x, await level())
          }
          // 慢拖
          await step(a)
          await settleSidebar(window)
          expect(await level(), `${mode} ${a} 起点 = 静态`).toBe(ladder.get(a))
          const stop = await recordFrames(window)
          const ends: Array<[number, string]> = []
          for (const x of widths) {
            await step(x)
            await window.waitForTimeout(200)
            ends.push([x, await level()])
          }
          await settleSidebar(window)
          const f = await stop()
          const label = `H2-slow200-${mode}-${a}-${b}-${lang}`
          const bad: string[] = []
          let prevW = a
          const allowedPrev = new Map<number, number>()
          for (const x of widths) {
            allowedPrev.set(x, prevW)
            prevW = x
          }
          for (const x of f) {
            const iw = x[4]
            const ok = new Set([ladder.get(iw), ladder.get(allowedPrev.get(iw) ?? iw)])
            if (!ok.has(x[0])) bad.push(`${x[0]}@${iw}`)
            if (iw < NARROW_SIDEBAR_PX && x[0].startsWith("3e")) bad.push(`3e@${iw}`)
          }
          const endBad = ends.filter(([x, d]) => d !== ladder.get(x)).map(([x, d]) => `${d}@${x}≠${ladder.get(x)}`)
          const line = JSON.stringify({ label, frames: f.length, ladder: Object.fromEntries(ladder), endBad, bad: bad.slice(0, 12), badN: bad.length, maxRowH: Math.max(...f.map((x) => x[1])), maxSendB: Math.max(...f.map((x) => x[2] ?? 0)) })
          console.log(`[composer-733-oneline] ${line}`)
          await testInfo.attach(label, { body: line, contentType: "application/json" })
          if (mode === "running") expect(f.every((x) => x[3] === 1), `${label} 全程在跑 ${line}`).toBe(true)
          expect(bad, `${label} 每帧 = 这一步 / 上一步的静态级，iw<768 无 3e ${line}`).toEqual([])
          expect(endBad, `${label} 停够 200ms = 同宽静态级 ${line}`).toEqual([])
          for (const x of f) {
            expect(x[1], `${label} 每帧一行 ${line}`).toBeLessThanOrEqual(46)
            expect(x[2] ?? 0, `${label} 发送钮底 ≤ ${SEND_MAX_733} ${line}`).toBeLessThanOrEqual(SEND_MAX_733 + 0.5)
          }
        }
        if (mode === "running") {
          await window.getByTestId("composer-stop").click()
          await expect(window.getByTestId("composer-send")).toBeVisible({ timeout: 10_000 })
          await settle(window)
        }
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

// #228 跟进 ②（leo F-b）：K12 / k8m 托盘进入条件（产品 §10.3）并进 CI——之前只有 mike 本地 harness（e2e/mike-k/k8m.spec.ts）。
// 733×480：审批 + 排队 2 + 附图 → 展开托盘 → 马上发 → 停止（运行中）：托盘转为单行条；send / stop / 排队芯片整颗 bottom ≤ 430 且
// ≤ 状态栏 top − 13、5/5；缩略图整张在验收条下（有验收条时）、输入上。1024 / 1440 不进挤压态（data-tray-squeezed 不在）、send 5/5。
// 托盘展开 + 运行中 + 审批时审批三键 0/5 为存量（main 同，§10.3 接受条件），这里不断言。
for (const lang of ["zh", "en"] as const) {
  test(`#228 K12（${lang}）：733×480 托盘展开 + 运行中 + 审批 + 排队 → 马上发 → 停止：托盘单行条、send ≤430 5/5、缩略图整张；1024 / 1440 不挤压`, async () => {
    test.setTimeout(180_000)
    const { app, window, roErrors } = await boot(lang, {})
    try {
      const composer = window.getByTestId("composer-input")
      const tray = window.getByTestId("composer-attachment-tray")
      await sendComposer(window, composer, "please write a note")
      await expect(window.getByTestId("approval-allow")).toBeVisible({ timeout: 15_000 })
      await resize(window, 733, 480)
      for (const i of [1, 2]) {
        await composer.click()
        await window.keyboard.type(`${lang === "en" ? "queued line" : "排队的一句"} ${i}`)
        await composer.press("Enter")
        await expect(window.getByTestId("queued-followups-docked")).toHaveAttribute("data-count", String(i), { timeout: 5_000 })
      }
      await attachImage(window, "tray.png")
      // 展开托盘（紧凑态那颗「1 张图片 / 1 image」）
      await tray.getByRole("button", { name: /1 张图片|1 image/ }).first().click()
      await settle(window)
      const thumbClear = async (label: string) => {
        const form = await box(window.locator("form[data-composer]"))
        const chips = window.locator('[data-testid="composer-asset-chip"]')
        expect(await chips.count(), `${label}: attachment chip`).toBeGreaterThan(0)
        const frame = window.locator('[data-testid="composer-review-frame"]')
        const frameB = (await frame.count()) > 0 && (await frame.isVisible()) ? await box(frame) : null
        const t = await box(chips.first())
        const dbg = JSON.stringify({ form, frame: frameB, thumb: t })
        if (frameB) expect(t.y, `${label}: thumb top ≥ review frame bottom ${dbg}`).toBeGreaterThanOrEqual(frameB.y + frameB.height - 0.5)
        expect(t.y + t.height, `${label}: thumb bottom ≤ form top ${dbg}`).toBeLessThanOrEqual(form.y + 0.5)
        expect(t.height, `${label}: thumb 整张（≥ 40）${dbg}`).toBeGreaterThanOrEqual(40)
        await hit5(chips.first(), `${label} thumb`)
      }
      // 运行中 + 审批 + 托盘展开：停止钮整颗在状态栏之上、5/5
      await expectActionClear(window, "composer-stop", `K12 ${lang} 733 running+approval+tray expanded`)
      // 马上发（真实坐标点击）
      const collapsed = window.getByTestId("queued-collapsed")
      if (await collapsed.isVisible().catch(() => false)) await collapsed.click()
      const sendNow = window.getByTestId("queued-user-turn").first().getByTestId("queued-send-now")
      const sb = await box(sendNow)
      await window.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2)
      await expect(window.getByTestId("queued-user-turn")).toHaveCount(1, { timeout: 5_000 })
      await settle(window)
      await expectActionClear(window, "composer-stop", `K12 ${lang} 733 after send-now`)
      await snap(window, `K12-${lang}-733-after-send-now`)
      // 停止（运行中）：审批走掉、队列停着 → 托盘转单行条，send 不越界
      const stopB = await box(window.getByTestId("composer-stop"))
      await window.mouse.click(stopB.x + stopB.width / 2, stopB.y + stopB.height / 2)
      await expect(window.getByTestId("approval-allow")).toHaveCount(0, { timeout: 15_000 })
      await expect(window.getByTestId("composer-send")).toBeVisible({ timeout: 10_000 })
      for (const wait of [800, 3000]) {
        await window.waitForTimeout(wait === 800 ? 800 : 2200)
        await settle(window)
        const label = `K12 ${lang} 733 stopped +${wait}ms`
        await expect(tray, `${label}: 托盘转为单行条`).toHaveAttribute("data-tray-strip", "true")
        await expectActionClear(window, "composer-send", label)
        const chip = window.getByTestId("composer-queue-chip")
        if (await chip.isVisible().catch(() => false)) await expectActionClear(window, "composer-queue-chip", label)
        await thumbClear(label)
        await expectConversationAndForm(window, label)
      }
      await snap(window, `K12-${lang}-733-stopped`)
      for (const [w, h] of [[1024, 670], [1440, 920]] as const) {
        await resize(window, w, h)
        await settle(window)
        const label = `K12 ${lang} ${w} stopped`
        await expect(tray, `${label}: 不进挤压态`).not.toHaveAttribute("data-tray-squeezed", "true")
        await expectActionClear(window, "composer-send", label)
        await thumbClear(label)
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}

// #228 跟进 ④（leo F-c）：mike 临时 hyst harness（e2e/mike-k/hyst.spec.ts，不提交）里 CU 开着的两条并进正式 spec。
// 1px 扫宽（只扫侧栏已收起的 760 ↔ 560 段，窗宽与行宽同步变）找 3a↔3b 交界、回滞 ≥ 8；再在交界带里每个代表宽度、
// 从带上 / 带下两个方向进带，各跑 3 轮短回复，rAF 逐帧记「级 | 发送钮状态 | 电脑操控 chip 是否在 DOM」。
// 断言按 jojo #228 口径 3：开轮窗口（停止键在）内至多 1 次换级、收轮窗口（回到发送）内至多 1 次换级（=单向、窗口内不回跳）；
// 每帧单行、发送 / 停止钮底不越界；每轮前后发送钮 5/5。另加 leo F-c：交界带内整体级别方向变化 0 次（回滞带里收轮不升回）。
// 原 :158 要求 3 轮里只出现过一个级——开跑那一帧右组多出停止键 / 运行点放不下而降一级是内容驱动、单向的，不算闪。
// jojo 已裁定为预期（§10 + 口径 3）：运行中 CU 等 chip 进溢出菜单（3a → 3b），收轮后停在回滞带不升回。
for (const lang of ["zh", "en"] as const) {
  test(`#228 回滞 / 防闪（${lang}，CU 开）：1px 扫宽 3a↔3b 交界回滞 ≥8；交界带内两向进带各 3 轮——开轮 / 收轮各至多 1 次换级、整体不回头、每帧单行、send 5/5`, async () => {
    const testInfo = test.info()
    test.setTimeout(300_000)
    const H = 480
    const HI = 760
    const LO = 560
    const { app, window, roErrors } = await boot(lang, { cu: true })
    const sample = () =>
      window.evaluate(
        () =>
          new Promise<{ s: string; inner: number }>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const row = document.querySelector('[data-testid="composer-footer-row"]') as HTMLElement
                const cs = getComputedStyle(row)
                resolve({
                  s: `${row.getAttribute("data-footer-density")}${row.getAttribute("data-footer-overflow") ?? ""}`,
                  inner: Math.round((row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 100) / 100
                })
              })
            )
          )
      )
    const idle = () =>
      window.waitForFunction(() => /^(Send|发送)$/.test(document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""), undefined, { timeout: 30_000 })
    const turn = async () => {
      await sendComposer(window, window.getByTestId("composer-input"), lang === "en" ? "short turn" : "短一轮")
      await window
        .waitForFunction(() => !/^(Send|发送)$/.test(document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""), undefined, { timeout: 10_000 })
        .catch(() => undefined)
      await idle()
      await window.waitForTimeout(400)
      await hit5(window.getByTestId("composer-send"), `${lang} 收轮后 send`)
    }
    try {
      await sendComposer(window, window.getByTestId("composer-input"), lang === "en" ? "hello there" : "你好")
      await expect(window.locator("body")).toContainText("stub-ok", { timeout: 20_000 })
      await idle()
      await window.setViewportSize({ width: HI, height: H })
      await settleSidebar(window)
      // 1px 扫宽：记每次换级（降 / 升）时的窗宽与行宽
      type T = { dir: "down" | "up"; x: number; s: string; inner: number; from?: string }
      const tr: T[] = []
      let prev: { s: string; inner: number } | null = null
      const go = async (x: number, dir: "down" | "up") => {
        await window.setViewportSize({ width: x, height: H })
        const r = await sample()
        if (!prev || r.s !== prev.s) tr.push({ dir, x, ...r, from: prev?.s })
        prev = r
      }
      for (let x = HI; x >= LO; x -= 1) await go(x, "down")
      for (let x = LO; x <= HI; x += 1) await go(x, "up")
      const down = [...tr].reverse().find((t) => t.dir === "down" && t.from === "3a" && t.s === "3b")
      const up = tr.find((t) => t.dir === "up" && t.from === "3b" && t.s === "3a")
      const bline = JSON.stringify({ lang, down, up, transitions: tr.map((t) => `${t.dir}:${t.from}>${t.s}@${t.x}/${t.inner}`) })
      console.log(`[composer-733-oneline] hyst-bounds ${bline}`)
      await testInfo.attach(`hyst-bounds-${lang}`, { body: bline, contentType: "application/json" })
      expect(down, `扫宽找到 3a→3b 降级点 ${bline}`).toBeTruthy()
      expect(up, `扫宽找到 3b→3a 升级点 ${bline}`).toBeTruthy()
      expect.soft(up!.inner - down!.inner, `3a↔3b 回滞（升级点行宽 − 降级点行宽）≥ 8 ${bline}`).toBeGreaterThanOrEqual(8)
      // 交界带：两个方向进带，各跑 3 轮
      const xs = [down!.x, Math.round((down!.x + up!.x) / 2), up!.x - 1, up!.x]
      for (const x of xs) {
        for (const from of ["above", "below"] as const) {
          await window.setViewportSize({ width: from === "above" ? up!.x + 40 : down!.x - 40, height: H })
          await settleSidebar(window)
          await window.setViewportSize({ width: x, height: H })
          await settleSidebar(window)
          const start = await stepOf(window)
          await window.evaluate(() => {
            const w = window as unknown as { __hy?: { f: [string, string, number, number, number][]; run: boolean } }
            const st = { f: [] as [string, string, number, number, number][], run: true }
            w.__hy = st
            const loop = () => {
              if (!st.run) return
              const row = document.querySelector('[data-testid="composer-footer-row"]')
              const act = document.querySelector('[data-testid="composer-send"],[data-testid="composer-stop"]')
              st.f.push([
                `${row?.getAttribute("data-footer-density") ?? "?"}${row?.getAttribute("data-footer-overflow") ?? ""}`,
                document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? "stop",
                document.querySelector('[data-testid="computer-use-chip"]') ? 1 : 0,
                row ? Math.round(row.getBoundingClientRect().height) : -1,
                act ? Math.round(act.getBoundingClientRect().bottom) : -1
              ])
              requestAnimationFrame(loop)
            }
            requestAnimationFrame(loop)
          })
          await hit5(window.getByTestId("composer-send"), `${lang} x=${x} 开轮前 send`)
          for (let k = 0; k < 3; k += 1) await turn()
          const f = await window.evaluate(() => {
            const st = (window as unknown as { __hy: { f: [string, string, number, number, number][]; run: boolean } }).__hy
            st.run = false
            return st.f
          })
          const levels = f.map((x) => x[0]).filter((k, i, a) => i === 0 || a[i - 1] !== k)
          // 口径 3 窗口：按「停止键在不在」切成开轮窗口 / 收轮窗口（第一段是开轮前的静止段）；
          // 第 k 帧的换级算进第 k 帧所在窗口。每个窗口至多 1 次换级（单向、窗口内不出现已绘制的回跳）。
          const wins: Array<{ run: boolean; levels: string[]; changes: number }> = []
          for (let k = 0; k < f.length; k += 1) {
            const [s, label] = f[k]!
            const run = label === "stop"
            const last = wins[wins.length - 1]
            if (!last || last.run !== run) wins.push({ run, levels: [s], changes: k > 0 && f[k - 1]![0] !== s ? 1 : 0 })
            else if (last.levels[last.levels.length - 1] !== s) {
              last.levels.push(s)
              last.changes += 1
            }
          }
          const winBad = wins.filter((g) => g.changes > 1).map((g) => `${g.run ? "开轮" : "收轮"}:${g.levels.join(">")}`)
          const turns = wins.filter((g) => g.run).length
          const maxRowH = Math.max(...f.map((r) => r[3]))
          const maxActB = Math.max(...f.map((r) => r[4]))
          const line = JSON.stringify({ lang, x, from, start, frames: f.length, levels, turns, winBad, maxRowH, maxActB, wins: wins.map((g) => `${g.run ? "R" : "I"}:${g.levels.join(">")}`).slice(0, 16), chip: [...new Set(f.map((r) => `${r[0]}|${r[2]}`))] })
          console.log(`[composer-733-oneline] hyst-flicker ${line}`)
          await testInfo.attach(`hyst-flicker-${lang}-${x}-${from}`, { body: line, contentType: "application/json" })
          expect.soft(f.length, `${lang} x=${x} from=${from} 有帧 ${line}`).toBeGreaterThan(30)
          expect.soft(levels[0], `${lang} x=${x} from=${from} 记录起点 = 进带后静态级 ${line}`).toBe(start)
          expect.soft(levelDirChanges(levels), `${lang} x=${x} from=${from} 整体级别不回头（方向变化 0 次）${line}`).toBe(0)
          expect.soft(turns, `${lang} x=${x} from=${from} 录到 3 轮开轮 ${line}`).toBe(3)
          expect.soft(winBad, `${lang} x=${x} from=${from} 口径 3：开轮 / 收轮窗口内各至多 1 次换级 ${line}`).toEqual([])
          expect.soft(maxRowH, `${lang} x=${x} from=${from} 每帧单行（行高 ≤ 46）${line}`).toBeLessThanOrEqual(46)
          expect.soft(maxActB, `${lang} x=${x} from=${from} 发送 / 停止钮底 ≤ ${SEND_MAX_733} ${line}`).toBeLessThanOrEqual(SEND_MAX_733 + 0.5)
        }
      }
      expect(roErrors, "no ResizeObserver loop").toEqual([])
    } finally {
      await closeForRelaunch(app)
    }
  })
}
