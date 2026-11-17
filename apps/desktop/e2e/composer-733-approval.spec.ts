/** B′：审批 footer 被对话外壳裁切才转 #224 单行条。每条布局保证均用真机矩形 + 五点命中验。 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page, type TestInfo } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)
const shots = process.env.ENJOY_E2E_SHOTS_DIR
if (shots) mkdirSync(shots, { recursive: true })
type Lang = "zh" | "en"

/** 使用 queue-sendnow-approval.spec 的 launchApproval 同款 fixture（vision，无新 stub）。 */
async function boot(lang: Lang, cu = false) {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-apclip-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-apclip-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_STUB_VISION: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ...(cu ? { ENJOY_E2E_CU_READY: "1" } : {})
  })
  try {
    const page = await firstWindow(app)
    const errors: string[] = []
    page.on("pageerror", (e) => { if (/ResizeObserver loop/.test(String(e))) errors.push(String(e)) })
    page.on("console", (msg) => { if (/ResizeObserver loop/.test(msg.text())) errors.push(msg.text()) })
    await page.setViewportSize({ width: 1440, height: 920 })
    await page.waitForTimeout(800)
    const skip = page.getByRole("button", { name: /^(跳过设置|Skip setup)$/ })
    if (await skip.count()) await skip.click()
    const composer = page.getByTestId("composer-input")
    await sendComposer(page, composer, "please write a note")
    await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 20_000 })
    return { app, page, errors, cleanup: async () => {
      await closeForRelaunch(app)
      rmSync(workspace, { recursive: true, force: true })
      rmSync(userData, { recursive: true, force: true })
    } }
  } catch (error) {
    await closeForRelaunch(app)
    rmSync(workspace, { recursive: true, force: true })
    rmSync(userData, { recursive: true, force: true })
    throw error
  }
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  let prev = ""
  let stable = 0
  for (let i = 0; i < 80; i++) {
    const cur = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s)
      const es = [q('[data-testid="composer-attachment-tray"]'), q("form[data-composer]"), q('[data-testid="chat-conversation"]'), q('[data-testid="approval-allow"]')]
      return JSON.stringify(es.map((e) => e ? [e.getAttribute("data-tray-strip"), e.getAttribute("data-tray-approval-clip"), e.getBoundingClientRect().toJSON()] : null))
    })
    stable = cur === prev ? stable + 1 : 0
    if (stable >= 6) return
    prev = cur
    await page.waitForTimeout(16)
  }
  throw new Error("geometry did not settle")
}

async function resize(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await settle(page)
}

/** 四角内缩 5px + 中心；逐点记命中元素，不只测 bottom。 */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelector(s)
    const tid = (id: string) => q(`[data-testid="${id}"]`)
    const rect = (e: Element | null) => e ? e.getBoundingClientRect().toJSON() : null
    const points = (e: Element | null) => {
      if (!e) return []
      const r = e.getBoundingClientRect()
      return [[r.left + 5, r.top + 5], [r.right - 5, r.top + 5], [r.left + 5, r.bottom - 5], [r.right - 5, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]].map(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!)
        return { x, y, ok: !!hit && (hit === e || e.contains(hit)), by: hit ? `${hit.tagName}.${hit.getAttribute("data-testid") ?? ""}.${hit.className} ${(hit.textContent ?? "").slice(0, 30)}` : "none" }
      })
    }
    const geom = (e: Element | null) => ({ rect: rect(e), hits: points(e) })
    const tray = tid("composer-attachment-tray")
    const conv = tid("chat-conversation")
    const bar = tid("status-context-meter")?.closest("[data-toast-clearance]") ?? null
    const barTop = bar?.getBoundingClientRect().top ?? null
    const actions = ["composer-send", "composer-stop"].map((id) => {
      const e = tid(id)
      const r = e?.getBoundingClientRect()
      return { id, ...geom(e), margin: r && barTop != null ? barTop - 13 - r.bottom : null }
    }).filter((a) => a.rect && a.rect.height > 0)
    const approval = ["approval-session", "approval-deny", "approval-allow"].map((id) => ({ id, ...geom(tid(id)) }))
    const thumb = tray?.querySelector('[data-testid="composer-asset-chip"]') ?? null
    const form = q("form[data-composer]")
    const dock = tid("queued-followups-docked")
    const row = tid("composer-footer-row")
    return {
      viewport: { width: innerWidth, height: innerHeight }, barTop,
      tray: rect(tray), strip: tray?.getAttribute("data-tray-strip") ?? null, clip: tray?.getAttribute("data-tray-approval-clip") ?? null,
      form: rect(form), conv: rect(conv), clipShell: rect(conv?.parentElement ?? null), floor: conv ? getComputedStyle(conv).minHeight : null,
      approval, actions, thumb: geom(thumb), image: geom(thumb?.querySelector("img") ?? null),
      footerBottom: rect(conv?.querySelector('[data-testid="permission-dock"] article > footer') ?? null),
      dock: { rect: rect(dock), mode: dock?.getAttribute("data-mode"), count: dock?.getAttribute("data-count"), buttons: Array.from(dock?.querySelectorAll("button") ?? []).map((e) => geom(e)) },
      density: row?.getAttribute("data-footer-density"),
      input: rect(tid("composer-input"))
    }
  })
}

async function check(page: Page, info: TestInfo, label: string, expectedStrip: boolean | null = null) {
  await settle(page)
  const g = await geometry(page)
  console.log(`APCLIP ${label} ${JSON.stringify(g)}`)
  await info.attach(label, { body: JSON.stringify(g, null, 2), contentType: "application/json" })
  if (shots) {
    writeFileSync(join(shots, `${label}.json`), JSON.stringify(g, null, 2))
    await page.screenshot({ path: join(shots, `${label}.png`) })
  }
  for (const a of g.approval) {
    expect(a.rect, `${label} ${a.id} rect`).not.toBeNull()
    expect(a.hits.every((h) => h.ok), `${label} ${a.id} ${JSON.stringify(a.hits)}`).toBe(true)
    expect(a.rect!.top).toBeGreaterThanOrEqual(0)
    expect(a.rect!.right).toBeLessThanOrEqual(g.viewport.width + 0.5)
    expect(a.rect!.bottom).toBeLessThanOrEqual(g.clipShell!.bottom + 0.5)
  }
  for (const a of g.actions) {
    expect(a.hits.every((h) => h.ok), `${label} ${a.id} ${JSON.stringify(a.hits)}`).toBe(true)
    expect(a.margin, `${label} ${a.id} ≤ statusbar top−13`).toBeGreaterThanOrEqual(-0.5)
    if (g.viewport.width === 733 && g.viewport.height === 480) expect(a.rect!.bottom).toBeLessThanOrEqual(430.5)
  }
  expect(g.actions.length).toBeGreaterThan(0)
  expect(g.clipShell!.height, `${label} chat ≥56`).toBeGreaterThanOrEqual(55.5)
  expect(g.thumb.rect).not.toBeNull()
  expect(g.thumb.rect!.bottom).toBeLessThanOrEqual(g.form!.top + 0.5)
  expect(g.thumb.rect!.height).toBeGreaterThanOrEqual(44)
  expect(g.thumb.hits.every((h) => h.ok), `${label} thumb ${JSON.stringify(g.thumb.hits)}`).toBe(true)
  expect(g.image.hits.every((h) => h.ok), `${label} image ${JSON.stringify(g.image.hits)}`).toBe(true)
  expect(g.input!.height).toBeGreaterThanOrEqual(52)
  if (expectedStrip != null) expect(g.strip).toBe(expectedStrip ? "true" : null)
  if (expectedStrip === true) expect(g.clip).toBe("true")
  return g
}

/** 录 rAF：只对下一帧仍存在的审批三钮做 5-point 命中。记录 strip/clip/height，便于数「已绘制翻转」。 */
async function startFrames(page: Page) {
  await page.evaluate(() => {
    const state = { stop: false, frames: [] as Array<Record<string, unknown> & { clip: boolean; misses: string[] }> }
    ;(globalThis as any).__apclipFrames = state
    const tick = () => {
      const tray = document.querySelector('[data-testid="composer-attachment-tray"]')
      const misses: string[] = []
      for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const pts = [[r.left + 5, r.top + 5], [r.right - 5, r.top + 5], [r.left + 5, r.bottom - 5], [r.right - 5, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]]
        if (!pts.every(([x, y]) => { const hit = document.elementFromPoint(x!, y!); return !!hit && (hit === el || el.contains(hit)) })) misses.push(id)
      }
      const conv = document.querySelector('[data-testid="chat-conversation"]')
      const shell = conv?.parentElement?.getBoundingClientRect()
      // 对话列内（含审查卡）任何在外壳可视区内的按钮：中心若被托盘接走即记 covered（不只审批三钮）。
      if (tray && shell) {
        for (const el of Array.from(document.querySelectorAll('[data-testid="chat-conversation"] button, [data-testid="review-gate-card"] button'))) {
          const r = el.getBoundingClientRect()
          if (r.height <= 0 || r.top < shell.top || r.bottom > shell.bottom) continue
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          if (hit && tray.contains(hit)) misses.push(`covered:${el.getAttribute("data-testid") ?? el.textContent?.slice(0, 20)}`)
        }
      }
      const art = conv?.querySelector('[data-testid="permission-dock"] article')
      const thread = conv?.querySelector(":scope > [data-thread-root]")
      const slack = (e: Element | null | undefined) => e ? Math.max(0, e.getBoundingClientRect().height - (parseFloat(getComputedStyle(e).minHeight) || 0)) : 0
      const cluster = document.querySelector("form[data-composer]")?.parentElement?.getBoundingClientRect()
      const footer = conv?.querySelector('[data-testid="permission-dock"] article > footer')?.getBoundingClientRect()
      state.frames.push({
        clip: tray?.getAttribute("data-tray-approval-clip") === "true",
        strip: tray?.getAttribute("data-tray-strip") === "true",
        h: innerHeight,
        w: innerWidth,
        shellH: shell?.height ?? null,
        floor: conv ? getComputedStyle(conv).minHeight : null,
        clusterH: cluster?.height ?? null,
        gap: shell && footer ? shell.bottom - footer.bottom : null,
        need: conv && footer ? footer.bottom - conv.getBoundingClientRect().top - slack(thread) - slack(art) : null,
        dock: document.querySelector('[data-testid="queued-followups-docked"]')?.getAttribute("data-mode") ?? null,
        misses
      })
    }
    const loop = () => {
      tick()
      if (!state.stop) requestAnimationFrame(loop)
    }
    // 先同步记一帧当前已绘制态，再逐帧记。
    tick()
    requestAnimationFrame(loop)
  })
}

/**
 * maxBadFrames：进入转条时（拉窄 / 点展开）表单收回余量有 CSS 过渡（不在本刀可改文件内），产品锁 §3.2 允许 ≤ 数帧过渡、终态 5/5；
 * 条内「收起 / 展开」、排队展开、拉宽释放、高度往返一律 0。
 */
async function endFrames(page: Page, info: TestInfo, label: string, maxTransitions = 0, maxBadFrames = 0) {
  const fs = await page.evaluate(() => { const s = (globalThis as any).__apclipFrames; s.stop = true; return s.frames as Array<Record<string, unknown> & { clip: boolean; misses: string[] }> })
  const changes = fs.filter((f, i) => i > 0 && f.clip !== fs[i - 1]!.clip).length
  const bad = fs.filter((f) => f.misses.length > 0)
  await info.attach(label, { body: JSON.stringify({ changes, bad, frames: fs }), contentType: "application/json" })
  if (shots) writeFileSync(join(shots, `${label}-frames.json`), JSON.stringify({ changes, bad, frames: fs }))
  console.log(`APCLIP ${label} frames=${fs.length} transitions=${changes} bad=${bad.length}`)
  expect(bad.length, `${label} painted 5-point misses ${JSON.stringify(bad)}`).toBeLessThanOrEqual(maxBadFrames)
  expect(changes, `${label} no painted reversal`).toBeLessThanOrEqual(maxTransitions)
  const at = fs.find((f, i) => i > 0 && f.clip !== fs[i - 1]!.clip)
  return { changes, bad: bad.length, frames: fs.length, atHeight: (at?.h as number | undefined) ?? null }
}

test.beforeAll(() => { test.skip(!existsSync(mainEntry), "out missing; build desktop first") })

const CELLS: Array<[Lang, number, boolean]> = [["zh", 0, false], ["zh", 2, false], ["en", 0, false], ["en", 2, false], ["en", 2, true]]
for (const [lang, count, cu] of CELLS) {
  test(`B′ 审批托盘裁切（${lang} q${count}${cu ? " CU" : ""}）：紧凑/展开/收起，条内收起/展开三钮5/5零翻转、队列展开，大小屏释放重进与高502↔521`, async () => {
    const info = test.info()
    test.setTimeout(240_000)
    const { page, errors, cleanup } = await boot(lang, cu)
    const tag = `${lang}-q${count}${cu ? "-cu" : ""}`
    try {
      for (let i = 0; i < count; i++) {
        await page.getByTestId("composer-input").fill(`${lang === "zh" ? "排队" : "queued"} ${i + 1}`)
        await page.getByTestId("composer-input").press("Enter")
        await expect(page.getByTestId("queued-followups-docked")).toHaveAttribute("data-count", String(i + 1))
      }
      await page.getByTestId("composer-attach").setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: PNG })
      await expect(page.getByTestId("composer-asset-chip")).toHaveCount(1)
      const tray = page.getByTestId("composer-attachment-tray")
      const expand = () => tray.getByTitle(lang === "zh" ? "展开附件检视面板" : "Expand attachment panel")
      const collapse = () => tray.getByRole("button", { name: lang === "zh" ? "收起" : "Collapse", exact: true })
      await resize(page, 733, 480)
      const compact = await check(page, info, `${tag}-compact`, false)
      expect(compact.footerBottom!.bottom).toBeLessThanOrEqual(compact.clipShell!.bottom)
      await startFrames(page)
      await expand().click()
      const strip = await check(page, info, `${tag}-expanded-strip`, true)
      await endFrames(page, info, `${tag}-expand-entry`, 1, 3)
      expect(strip.tray!.height).toBeGreaterThanOrEqual(52)
      expect(strip.tray!.height).toBeLessThanOrEqual(56)
      await startFrames(page)
      await collapse().click()
      await check(page, info, `${tag}-strip-collapse`, true)
      await expand().click()
      await check(page, info, `${tag}-strip-expand`, true)
      await endFrames(page, info, `${tag}-toggle`, 0)
      // 高往返（含 502–521）：480 → 600 → 480 逐 px。q0 释放 521 / 进入 504（实测）；
      // q2 拉高时排队坞从折叠回到行模式，列内容需求变大，释放点高于 521（按需求放，放后不被裁回）。每个方向恰好切一次。
      const switchAt: Record<string, number | null> = {}
      for (const [direction, heights] of [
        ["up", Array.from({ length: 121 }, (_, i) => 480 + i)],
        ["down", Array.from({ length: 121 }, (_, i) => 600 - i)]
      ] as const) {
        await startFrames(page)
        for (const h of heights) { await page.setViewportSize({ width: 733, height: h }); await page.waitForTimeout(32) }
        await settle(page)
        const r = await endFrames(page, info, `${tag}-height-${direction}`, 1)
        expect(r.changes, `${tag} ${direction} exactly one transition`).toBe(1)
        switchAt[direction] = r.atHeight
      }
      console.log(`APCLIP ${tag} height switch ${JSON.stringify(switchAt)}`)
      expect(switchAt.up! - switchAt.down!, `${tag} hysteresis ≥ 8px window height`).toBeGreaterThanOrEqual(8)
      await check(page, info, `${tag}-after-height`, true)
      // 审批挂着拉宽须放、拉窄须重进；无 strip 且托盘 108。
      for (const [w, h] of [[1024, 670], [1440, 920]]) {
        await startFrames(page)
        await resize(page, w!, h!)
        const wide = await check(page, info, `${tag}-${w}`, false)
        expect(wide.tray!.height).toBe(108)
        expect(wide.clip).toBeNull()
        expect(wide.actions.every((a) => a.rect!.bottom <= wide.barTop! - 19 + 0.5)).toBe(true)
        await endFrames(page, info, `${tag}-to-${w}`, 1)
      }
      await startFrames(page)
      await resize(page, 733, 480)
      await check(page, info, `${tag}-back-733`, true)
      await endFrames(page, info, `${tag}-to-733`, 1, 3)
      // 宽屏回来后排队坞可能是行模式（需求 > 地板）：慢拉高到 600，最多切一次、零坏帧（释放后不被裁回）。
      await startFrames(page)
      for (let h = 480; h <= 600; h += 2) { await page.setViewportSize({ width: 733, height: h }); await page.waitForTimeout(32) }
      await settle(page)
      const tall = await endFrames(page, info, `${tag}-height-up-after-wide`, 1)
      console.log(`APCLIP ${tag} after-wide release at ${tall.atHeight}`)
      await resize(page, 733, 480)
      await check(page, info, `${tag}-back-480`, true)
      if (count) {
        const dock = page.getByTestId("queued-followups-docked")
        await expect(dock).toHaveAttribute("data-count", "2")
        const before = await geometry(page)
        expect(before.dock.mode).toBe("collapsed")
        expect(before.dock.rect!.height).toBe(28)
        expect(before.dock.buttons[0]!.hits.every((h) => h.ok)).toBe(true)
        await expect(dock).toContainText("2")
        await startFrames(page)
        await dock.locator("button").first().click()
        await check(page, info, `${tag}-queue-expanded`, true)
        await endFrames(page, info, `${tag}-queue-expand`, 0)
      }
      // 收起后的终态（在大屏释放 clip 后，按用户收起回到紧凑；再缩小保持不转）。
      await resize(page, 1440, 920)
      await collapse().click()
      await resize(page, 733, 480)
      await check(page, info, `${tag}-collapsed`, false)
      await expand().click()
      await check(page, info, `${tag}-again-strip`, true)
      // 审批消失即释放：q0 真点「批准」（不带 force），q2 点停止（停止后审批同时消失：idle×审批不可达，删格，保存截图 / JSON 作依据）。
      // 释放过程逐帧：托盘长回不接走对话列任何按钮（含审查卡），最多切一次。
      await startFrames(page)
      if (count === 0) {
        await page.getByTestId("approval-allow").click({ timeout: 5_000 })
        await expect(page.getByTestId("approval-allow")).toHaveCount(0, { timeout: 15_000 })
      } else {
        await page.getByTestId("composer-stop").click()
        await expect(page.getByTestId("approval-allow")).toHaveCount(0, { timeout: 15_000 })
        await expect(page.getByTestId("composer-stop")).toHaveCount(0, { timeout: 15_000 })
      }
      await page.waitForTimeout(600)
      await settle(page)
      await endFrames(page, info, `${tag}-release`, 1)
      const after = await geometry(page)
      expect(after.clip).toBeNull()
      for (const a of after.actions) expect(a.hits.every((h) => h.ok), `${tag} release ${a.id} ${JSON.stringify(a.hits)}`).toBe(true)
      expect(after.thumb.hits.every((h) => h.ok), `${tag} release thumb`).toBe(true)
      if (shots) { writeFileSync(join(shots, `${tag}-released.json`), JSON.stringify(after, null, 2)); await page.screenshot({ path: join(shots, `${tag}-released.png`) }) }
      expect(errors).toEqual([])
    } finally { await cleanup() }
  })
}
