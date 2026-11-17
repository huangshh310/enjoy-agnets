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
async function boot(lang: Lang, cu = false, prompt = "please write a note", waitApproval = true) {
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
    await sendComposer(page, composer, prompt)
    if (waitApproval) await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 20_000 })
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

type Frame = Record<string, unknown> & {
  t: number; clip: boolean; strip: boolean; h: number; w: number; trayH: number | null; clusterH: number | null
  gap: number | null; misses: string[]; actionMisses: string[]; late: boolean; squeezed: boolean; appr: boolean; sendB: number | null; stopB: number | null
}

/**
 * base 既有越线豁免（leo #230 门 M1/M2，jojo 条件③，host / neo 预审 ci-4b2df151.md）：只在「审批出现 q2」用例显式开启（tag `${lang}-q2-appear-release`）。
 * 只豁免 composer-send / composer-stop 的「>430」「>top−13」两类；逐帧 bottom ≤ KNOWN_BASE_SEND_CAP + 0.5，越线帧数 ≤ KNOWN_BASE_MAX_FRAMES（写死，不在运行时量 base）。
 * 三钮 / covered / 5 点命中 / 排队芯片 / 排队坞、释放过渡 ≤3 / covered 0 / stripFlipsAfter ≤1、clip 全程 off、late、reclip、终态 ≤430 / ≤top−13 / 5/5 全部照常断言。
 * 出处：base d4ad6b93 同 spec 同路径真跑（2026-11-16 ~21:50 PST，mike；733×480，very slow 桩，批准后 600ms+settle）：
 *   zh 53 帧中 actionBad 48、en 54 帧中 actionBad 48，send / stop bottom 均 446（barTop 443）；
 *   原始帧 JSON 与长窗探针：/workspace/enjoy-docs/shots/p2-composer-733-approval/base-q2-approval-appear/。
 */
const KNOWN_BASE_LABEL = /^(zh|en)-q2-appear-release$/
const KNOWN_BASE_EXEMPT = /^composer-(send|stop):>(430|top-13)\(/
/** base d4ad6b93 实测 send / stop 最大 bottom（px）。 */
const KNOWN_BASE_SEND_CAP = 446
/** base d4ad6b93 实测 actionBad 帧数 48（zh / en）的上界，leo M2 写死 ≤50。 */
const KNOWN_BASE_MAX_FRAMES = 50
type KnownBase = { reason: string }

/**
 * 逐帧录「已绘制」态：rAF 里 post 一个 MessageChannel 任务，任务在本帧 rendering steps（rAF → 布局 → RO → 绘制）之后跑，
 * 读到的就是本帧真正画出来的 DOM（rAF 回调本身在 RO 之前，读到的是 RO 提交前的态，会把同帧已修正的判定误记成晚一帧）。
 * 每帧记：审批三钮 5 点命中；send / stop / 排队芯片 / 排队坞按钮 5 点命中 + bottom ≤430（733×480）+ ≤ 状态栏 top−13；
 * 对话列内任何按钮中心是否被托盘接走（covered）；late = footer 已越过裁切线（gap < −0.5）但 data-tray-approval-clip 还没 on（判定晚帧，C3）。
 */
async function startFrames(page: Page) {
  await page.evaluate(() => {
    const state = { stop: false, frames: [] as unknown[] }
    ;(globalThis as any).__apclipFrames = state
    const five = (el: Element) => {
      const r = el.getBoundingClientRect()
      const pts = [[r.left + 5, r.top + 5], [r.right - 5, r.top + 5], [r.left + 5, r.bottom - 5], [r.right - 5, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]]
      return pts.every(([x, y]) => { const hit = document.elementFromPoint(x!, y!); return !!hit && (hit === el || el.contains(hit)) })
    }
    const tick = (t: number) => {
      const tray = document.querySelector('[data-testid="composer-attachment-tray"]')
      const misses: string[] = []
      for (const id of ["approval-session", "approval-deny", "approval-allow"]) {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (el && !five(el)) misses.push(id)
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
      // send / stop / 排队：每帧都要 5/5、≤430（733×480）、≤ 状态栏 top−13（jojo §11）。
      const actionMisses: string[] = []
      const bar = document.querySelector('[data-testid="status-context-meter"]')?.closest("[data-toast-clearance]")
      const barTop = bar?.getBoundingClientRect().top ?? null
      const actionEls = [
        ...["composer-send", "composer-stop", "composer-queue-chip"].map((id) => [id, document.querySelector(`[data-testid="${id}"]`)] as const),
        ...Array.from(document.querySelectorAll('[data-testid="queued-followups-docked"] [data-testid="queued-collapsed"]')).map((e, i) => [`queued-collapsed-${i}`, e] as const)
      ]
      for (const [id, el] of actionEls) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.height <= 0 || r.width <= 0) continue
        if (id.startsWith("composer-")) {
          if (innerWidth === 733 && innerHeight === 480 && r.bottom > 430.5) actionMisses.push(`${id}:>430(${r.bottom})`)
          if (barTop != null && r.bottom > barTop - 13 + 0.5) actionMisses.push(`${id}:>top-13(${r.bottom}/${barTop})`)
        }
        if (!five(el)) actionMisses.push(`${id}:5pt`)
      }
      const bottomOf = (id: string) => {
        const r = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect()
        return r && r.height > 0 && r.width > 0 ? r.bottom : null
      }
      const art = conv?.querySelector('[data-testid="permission-dock"] article')
      const thread = conv?.querySelector(":scope > [data-thread-root]")
      const slack = (e: Element | null | undefined) => e ? Math.max(0, e.getBoundingClientRect().height - (parseFloat(getComputedStyle(e).minHeight) || 0)) : 0
      const cluster = document.querySelector("form[data-composer]")?.parentElement?.getBoundingClientRect()
      const footer = conv?.querySelector('[data-testid="permission-dock"] article > footer')?.getBoundingClientRect()
      const clip = tray?.getAttribute("data-tray-approval-clip") === "true"
      const gap = shell && footer && footer.height > 0 ? shell.bottom - footer.bottom : null
      state.frames.push({
        t,
        clip,
        strip: tray?.getAttribute("data-tray-strip") === "true",
        squeezed: tray?.getAttribute("data-tray-squeezed") === "true",
        slot: tray?.getAttribute("data-tray-slot") ?? null,
        review: !!document.querySelector('[data-testid="composer-review-frame"]'),
        h: innerHeight,
        w: innerWidth,
        trayH: tray ? tray.getBoundingClientRect().height : null,
        shellH: shell?.height ?? null,
        floor: conv ? getComputedStyle(conv).minHeight : null,
        clusterH: cluster?.height ?? null,
        gap,
        need: conv && footer ? footer.bottom - conv.getBoundingClientRect().top - slack(thread) - slack(art) : null,
        dock: document.querySelector('[data-testid="queued-followups-docked"]')?.getAttribute("data-mode") ?? null,
        barTop,
        appr: !!document.querySelector('[data-testid="approval-allow"]'),
        sendB: bottomOf("composer-send"),
        stopB: bottomOf("composer-stop"),
        misses,
        actionMisses,
        late: gap != null && gap < -0.5 && !clip
      })
    }
    const afterPaint = (t: number) => {
      const ch = new MessageChannel()
      ch.port1.onmessage = () => tick(t)
      ch.port2.postMessage(0)
    }
    const loop = (t: number) => {
      afterPaint(t)
      if (!state.stop) requestAnimationFrame(loop)
    }
    // 先同步记一帧当前已绘制态，再逐帧记。
    tick(performance.now())
    requestAnimationFrame(loop)
  })
}

type FrameOpts = {
  /** data-tray-approval-clip 翻转次数上限。 */
  maxTransitions?: number
  /** 审批三钮 / covered 坏帧上限：进入转条 ≤3（jojo §11），其余 0。 */
  maxBad?: number
  /** 进入转条：单向收缩（strip 只翻一次、转条后托盘不回 108、簇高不回升 > 1px）。 */
  entry?: boolean
  /** 释放：过渡帧（clip off 后任何可点物不合规）≤3、covered 0。 */
  release?: boolean
  /** 仅「审批出现 q2」批准后段：send/stop 越线为 base 既有，按 base 实测封顶（帧数 ≤ base、逐帧 ≤ BASE_SEND_CAP），其余照常。 */
  knownBaseActionBad?: KnownBase
}

async function endFrames(page: Page, info: TestInfo, label: string, opts: FrameOpts = {}) {
  const { maxTransitions = 0, maxBad = 0, entry = false, release = false, knownBaseActionBad } = opts
  await page.waitForTimeout(50)
  const fs = await page.evaluate(() => { const s = (globalThis as any).__apclipFrames; s.stop = true; return s.frames }) as Frame[]
  const changes = fs.filter((f, i) => i > 0 && f.clip !== fs[i - 1]!.clip).length
  const stripChanges = fs.filter((f, i) => i > 0 && f.strip !== fs[i - 1]!.strip).length
  const bad = fs.filter((f) => f.misses.length > 0)
  const actionBad = fs.filter((f) => f.actionMisses.length > 0)
  const late = fs.filter((f) => f.late)
  // 释放后又被裁回（off → on 出现在某次 on → off 之后）
  let reclip = 0
  let releasedOnce = false
  fs.forEach((f, i) => {
    if (i === 0) return
    const p = fs[i - 1]!
    if (p.clip && !f.clip) releasedOnce = true
    if (!p.clip && f.clip && releasedOnce) reclip += 1
  })
  const firstClip = fs.findIndex((f) => f.clip)
  const firstClipped = fs.findIndex((f) => f.gap != null && f.gap < -0.5)
  const badMs = bad.length ? bad[bad.length - 1]!.t - bad[0]!.t : 0
  const summary = { label, frames: fs.length, changes, stripChanges, bad: bad.length, badMs: Math.round(badMs), actionBad: actionBad.length, late: late.length, reclip, firstClip, firstClipped }
  await info.attach(label, { body: JSON.stringify({ summary, bad, actionBad, late, frames: fs }), contentType: "application/json" })
  if (shots) writeFileSync(join(shots, `${label}-frames.json`), JSON.stringify({ summary, bad, actionBad, late, frames: fs }))
  console.log(`APCLIP ${label} frames=${fs.length} transitions=${changes} bad=${bad.length} badMs=${summary.badMs} actionBad=${actionBad.length} late=${late.length} reclip=${reclip} firstClip=${firstClip} firstClipped=${firstClipped}`)
  expect(bad.length, `${label} painted 5-point misses ${JSON.stringify(bad)}`).toBeLessThanOrEqual(maxBad)
  expect(changes, `${label} no painted reversal`).toBeLessThanOrEqual(maxTransitions)
  // 豁免只剥掉 send/stop 的 >430 / >top−13 两项；5 点命中、排队芯片 / 排队坞仍逐帧判。
  const actMiss = (f: Frame) => knownBaseActionBad ? f.actionMisses.filter((m) => !KNOWN_BASE_EXEMPT.test(m)) : f.actionMisses
  if (knownBaseActionBad) {
    const maxSend = Math.max(0, ...fs.flatMap((f) => [f.sendB ?? 0, f.stopB ?? 0]))
    console.log(`APCLIP ${label} KNOWN-BASE actionBad=${actionBad.length} firstBad=${fs.findIndex((f) => f.actionMisses.length > 0)} lastBad=${fs.map((f) => f.actionMisses.length > 0).lastIndexOf(true)} frames=${fs.length} maxSend=${maxSend} capFrames=${KNOWN_BASE_MAX_FRAMES} capSend=${KNOWN_BASE_SEND_CAP} (${knownBaseActionBad.reason}) kinds=${JSON.stringify([...new Set(actionBad.flatMap((f) => f.actionMisses.map((m) => m.replace(/\(.*$/, ""))))])}`)
    test.info().annotations.push({ type: "known-base", description: `${label}: ${knownBaseActionBad.reason} actionBad=${actionBad.length}≤${KNOWN_BASE_MAX_FRAMES} maxSend=${maxSend}≤${KNOWN_BASE_SEND_CAP}` })
    expect(label, `known-base exemption only for q2 approval-appear release`).toMatch(KNOWN_BASE_LABEL)
    expect(fs.every((f) => !f.clip), `${label} known-base segment must not involve approval clip`).toBe(true)
    const other = fs.filter((f) => actMiss(f).length > 0)
    expect(other.length, `${label} non-exempt send/stop/queue misses ${JSON.stringify(other.map((f) => actMiss(f)))}`).toBe(0)
    expect(actionBad.length, `${label} send/stop over-line frames ≤ ${KNOWN_BASE_MAX_FRAMES} (base d4ad6b93: 48)`).toBeLessThanOrEqual(KNOWN_BASE_MAX_FRAMES)
    fs.forEach((f, i) => {
      expect(f.sendB ?? 0, `${label} send bottom ≤${KNOWN_BASE_SEND_CAP}.5 @${i}`).toBeLessThanOrEqual(KNOWN_BASE_SEND_CAP + 0.5)
      expect(f.stopB ?? 0, `${label} stop bottom ≤${KNOWN_BASE_SEND_CAP}.5 @${i}`).toBeLessThanOrEqual(KNOWN_BASE_SEND_CAP + 0.5)
    })
  } else {
    expect(actionBad.length, `${label} send/stop/queue every frame ≤430, ≤top−13, 5/5 ${JSON.stringify(actionBad)}`).toBe(0)
  }
  // C3：判定不晚于第一帧被裁——任何已绘制帧里 footer 越线时 data-tray-approval-clip 必须已 on。
  expect(late.length, `${label} decision late (clipped but clip attr off) ${JSON.stringify(late)}`).toBe(0)
  expect(reclip, `${label} re-clipped after release`).toBe(0)
  if (entry) {
    expect(stripChanges, `${label} strip flips once`).toBeLessThanOrEqual(1)
    const s0 = fs.findIndex((f) => f.strip)
    expect(s0, `${label} reached strip`).toBeGreaterThanOrEqual(0)
    const after = fs.slice(s0)
    expect(after.every((f) => f.strip), `${label} no strip⇄108`).toBe(true)
    for (let i = 1; i < after.length; i++) {
      expect(after[i]!.clusterH! - after[i - 1]!.clusterH!, `${label} monotonic shrink @${s0 + i}`).toBeLessThanOrEqual(1)
      expect(after[i]!.trayH!, `${label} tray never back to 108 @${s0 + i}`).toBeLessThan(100)
    }
    // 坏帧（三钮未满 5/5）只能出现在转条第一帧起的连续过渡里，且第一帧已是 clip on（坏帧 = 纯 CSS 高度过渡）。
    for (const b of bad) expect(b.clip, `${label} bad frame must already be clip on`).toBe(true)
  }
  // 释放（jojo §11 / §9）：过渡帧 = clip off 起任何一项可点物不满足（三钮 / covered / send·stop·排队）的帧，≤3；covered 必须 0。
  // 托盘自身的 CSS 高度动画帧（#224 现成过渡，不在本刀可改文件内）单独记 trayAnim，不算坏帧。
  let releaseTransition = 0
  let trayAnim = 0
  if (release) {
    // 释放起点：clip on → off；豁免段（clip 全程 off，条带来自 K12）以审批消失那一帧为起点。
    const off = knownBaseActionBad
      ? fs.findIndex((f, i) => i > 0 && fs[i - 1]!.appr && !f.appr)
      : fs.findIndex((f, i) => i > 0 && fs[i - 1]!.clip && !f.clip)
    expect(off, `${label} released`).toBeGreaterThan(0)
    const tail = fs.slice(off)
    const finalH = fs[fs.length - 1]!.trayH!
    trayAnim = tail.filter((f) => f.trayH != null && Math.abs(f.trayH - finalH) > 0.5).length
    releaseTransition = tail.filter((f) => f.misses.length > 0 || actMiss(f).length > 0).length
    const covered = tail.filter((f) => f.misses.some((m) => m.startsWith("covered:"))).length
    const stripFlipsAfter = tail.filter((f, i) => i > 0 && f.strip !== tail[i - 1]!.strip).length
    console.log(`APCLIP ${label} releaseTransition=${releaseTransition} covered=${covered} trayAnim=${trayAnim} stripFlipsAfter=${stripFlipsAfter} finalTrayH=${finalH} finalStrip=${fs[fs.length - 1]!.strip} squeezed=${fs[fs.length - 1]!.squeezed}`)
    expect(releaseTransition, `${label} release transition ≤3 frames`).toBeLessThanOrEqual(3)
    expect(covered, `${label} release never covers clickable`).toBe(0)
    // 释放后 strip 至多翻一次（条 → 108，或 K12 接手保持条），不出现条 → 108 → 条
    expect(stripFlipsAfter, `${label} release strip flips`).toBeLessThanOrEqual(1)
  }
  const at = fs.find((f, i) => i > 0 && f.clip !== fs[i - 1]!.clip)
  return { changes, bad: bad.length, frames: fs.length, releaseTransition, trayAnim, fs, atHeight: (at?.h as number | undefined) ?? null }
}

test.beforeAll(() => { test.skip(!existsSync(mainEntry), "out missing; build desktop first") })

/**
 * 真机逐 px 释放（上行）/ 进入（下行）窗高，leo ② 口径：q0 521 / 504，q2 555 / 502。
 * q2 释放点取决于释放前一帧排队坞的模式（useDockTight 的回行模式线由折叠时那一刻的列高决定，属 K6 / 排队坞，不在本刀）：
 * 坞已回行模式（all，需求 131）→ 555；坞仍折叠（collapsed，需求 87）→ 513。两种都按实测内容需求放、放后不被裁回。
 */
const SWITCH_AT: Record<string, { up: number; down: number }> = {
  q0: { up: 521, down: 504 },
  "q2-all": { up: 555, down: 502 },
  "q2-collapsed": { up: 513, down: 502 }
}
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
      await endFrames(page, info, `${tag}-expand-entry`, { maxTransitions: 1, maxBad: 3, entry: true })
      expect(strip.tray!.height).toBeGreaterThanOrEqual(52)
      expect(strip.tray!.height).toBeLessThanOrEqual(56)
      await startFrames(page)
      await collapse().click()
      await check(page, info, `${tag}-strip-collapse`, true)
      await expand().click()
      await check(page, info, `${tag}-strip-expand`, true)
      await endFrames(page, info, `${tag}-toggle`)
      // 高往返（含 502–521）：480 → 600 → 480 逐 px。q0 释放 521 / 进入 504（实测）；
      // q2 拉高时排队坞从折叠回到行模式，列内容需求变大，释放点高于 521（按需求放，放后不被裁回）。每个方向恰好切一次。
      const switchAt: Record<string, number | null> = {}
      let releaseDock = "none"
      for (const [direction, heights] of [
        ["up", Array.from({ length: 121 }, (_, i) => 480 + i)],
        ["down", Array.from({ length: 121 }, (_, i) => 600 - i)]
      ] as const) {
        await startFrames(page)
        for (const h of heights) { await page.setViewportSize({ width: 733, height: h }); await page.waitForTimeout(32) }
        await settle(page)
        const r = await endFrames(page, info, `${tag}-height-${direction}`, { maxTransitions: 1 })
        if (direction === "up") {
          const i = r.fs.findIndex((f, k) => k > 0 && r.fs[k - 1]!.clip && !f.clip)
          releaseDock = String(r.fs[i - 1]?.dock ?? "none")
        }
        expect(r.changes, `${tag} ${direction} exactly one transition`).toBe(1)
        switchAt[direction] = r.atHeight
      }
      console.log(`APCLIP ${tag} height switch ${JSON.stringify(switchAt)}`)
      expect(switchAt.up! - switchAt.down!, `${tag} hysteresis ≥ 8px window height`).toBeGreaterThanOrEqual(8)
      // leo ②：逐 px 实测释放 / 进入窗高（±1 容取整）。q2 释放点取决于拉高途中排队坞是否先回到行模式
      // （zh / CU 在 511 / 509 回行模式 → 按内容需求 131 晚放到 555；en 无 CU 时坞一直折叠 → 需求 87、513 放），两种都不被裁回。
      const want = SWITCH_AT[count ? `q2-${releaseDock}` : "q0"]!
      console.log(`APCLIP ${tag} release dock mode=${releaseDock} want=${JSON.stringify(want)}`)
      expect(Math.abs(switchAt.up! - want.up), `${tag} release at ${switchAt.up} ≈ ${want.up} (dock ${releaseDock})`).toBeLessThanOrEqual(1)
      expect(Math.abs(switchAt.down! - want.down), `${tag} enter at ${switchAt.down} ≈ ${want.down}`).toBeLessThanOrEqual(1)
      await check(page, info, `${tag}-after-height`, true)
      // 审批挂着拉宽须放、拉窄须重进；无 strip 且托盘 108。
      for (const [w, h] of [[1024, 670], [1440, 920]]) {
        await startFrames(page)
        await resize(page, w!, h!)
        const wide = await check(page, info, `${tag}-${w}`, false)
        expect(wide.tray!.height).toBe(108)
        expect(wide.clip).toBeNull()
        expect(wide.actions.every((a) => a.rect!.bottom <= wide.barTop! - 19 + 0.5)).toBe(true)
        await endFrames(page, info, `${tag}-to-${w}`, { maxTransitions: 1, release: w === 1024 })
      }
      await startFrames(page)
      await resize(page, 733, 480)
      await check(page, info, `${tag}-back-733`, true)
      await endFrames(page, info, `${tag}-to-733`, { maxTransitions: 1, maxBad: 3, entry: true })
      // 宽屏回来后排队坞可能是行模式（需求 > 地板）：慢拉高到 600，最多切一次、零坏帧（释放后不被裁回）。
      await startFrames(page)
      for (let h = 480; h <= 600; h += 2) { await page.setViewportSize({ width: 733, height: h }); await page.waitForTimeout(32) }
      await settle(page)
      const tall = await endFrames(page, info, `${tag}-height-up-after-wide`, { maxTransitions: 1 })
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
        await endFrames(page, info, `${tag}-queue-expand`)
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
      await endFrames(page, info, `${tag}-release`, { maxTransitions: 1, release: true })
      const after = await geometry(page)
      expect(after.clip).toBeNull()
      for (const a of after.actions) expect(a.hits.every((h) => h.ok), `${tag} release ${a.id} ${JSON.stringify(a.hits)}`).toBe(true)
      expect(after.thumb.hits.every((h) => h.ok), `${tag} release thumb`).toBe(true)
      if (shots) { writeFileSync(join(shots, `${tag}-released.json`), JSON.stringify(after, null, 2)); await page.screenshot({ path: join(shots, `${tag}-released.png`) }) }
      expect(errors).toEqual([])
    } finally { await cleanup() }
  })
}

/**
 * 第三条进入路径（jojo §11）：托盘已展开（733×480、运行中、无审批）时审批卡出现 → 裁切 → 转条。
 * 「very slow」桩先慢吐 5 词（约 7.5s）再停写盘审批，期间排队 / 加图 / 展开。≤3 坏帧、单向收缩、每帧 send/stop/排队合规、判定首帧即 on；
 * 之后批准 → 释放（托盘长回 ≤3 过渡帧、不盖任何可点项）。
 */
const APPEAR_H = Number(process.env.APCLIP_APPEAR_H ?? 480)
for (const [lang, count] of [["zh", 0], ["zh", 2], ["en", 0], ["en", 2]] as Array<[Lang, number]>) {
  test(`B′ 托盘已展开时审批出现（${lang} q${count}）：转条 ≤3 帧、判定首帧 on，批准后释放 ≤3 帧不盖可点项`, async () => {
    const info = test.info()
    test.setTimeout(180_000)
    const { page, errors, cleanup } = await boot(lang, false, "very slow", false)
    const tag = `${lang}-q${count}-appear`
    try {
      await expect(page.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
      for (let i = 0; i < count; i++) {
        await page.getByTestId("composer-input").fill(`${lang === "zh" ? "排队" : "queued"} ${i + 1}`)
        await page.getByTestId("composer-input").press("Enter")
      }
      await page.getByTestId("composer-attach").setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: PNG })
      await expect(page.getByTestId("composer-asset-chip")).toHaveCount(1)
      const tray = page.getByTestId("composer-attachment-tray")
      await resize(page, 733, APPEAR_H)
      await tray.getByTitle(lang === "zh" ? "展开附件检视面板" : "Expand attachment panel").click()
      await settle(page)
      expect(await page.getByTestId("approval-allow").count(), `${tag} approval must not be up yet (very slow head)`).toBe(0)
      const before = await geometry(page)
      console.log(`APCLIP ${tag}-before ${JSON.stringify({ tray: before.tray, strip: before.strip, clip: before.clip })}`)
      expect(before.clip).toBeNull()
      // q2：排队芯片行让 Composer 更高，733×480 无审批时 K12 已先转条（data-tray-squeezed）——审批出现时已是条带，不经过裁切进入。
      const k12Before = before.strip === "true"
      // M1：豁免启用条件按路径写死：只有 q2 在审批出现前已被 K12 转条；q0 或其他路径命中 K12 预转条即判红（不让运行时条件扩大豁免面）。
      expect(k12Before, `${tag} K12 pre-strip before approval expected only for q2`).toBe(count === 2)
      if (k12Before) {
        const sq = await page.getByTestId("composer-attachment-tray").getAttribute("data-tray-squeezed")
        expect(sq, `${tag} strip before approval must be K12`).toBe("true")
      }
      await startFrames(page)
      await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 20_000 })
      if (count) await expect(page.getByTestId("queued-followups-docked")).toHaveAttribute("data-count", String(count))
      const strip = await check(page, info, `${tag}-strip`, k12Before ? null : true)
      expect(strip.strip).toBe("true")
      expect(strip.tray!.height).toBeLessThanOrEqual(56)
      const entry = await endFrames(page, info, `${tag}-entry`, { maxTransitions: 1, maxBad: 3, entry: true })
      if (count === 2) {
        // M4：q2 下排队芯片行让 Composer 更高，733×480 无审批时 K12 已先转条；审批出现时条带由 K12 画着（stripHeldElsewhere），
        // clip 按设计不进入——整段 clip off、strip 全程来自 K12（squeezed）。裁切判定由 q0 本用例与 B′ 裁切矩阵覆盖。
        expect(entry.fs.every((f) => !f.clip), `${tag} q2 entry clip off throughout`).toBe(true)
        expect(entry.fs.every((f) => f.strip && f.squeezed), `${tag} q2 strip held by K12 through approval appear`).toBe(true)
      } else {
        // M4：q0 审批出现必须真的走裁切判定（clip on），且判定首帧即 on（late=0 已在 endFrames 断言）。
        expect(entry.fs.findIndex((f) => f.clip), `${tag} q0 approval clip actually turns on`).toBeGreaterThanOrEqual(0)
        expect(entry.fs[entry.fs.length - 1]!.clip, `${tag} q0 ends clip on`).toBe(true)
      }
      await startFrames(page)
      await page.getByTestId("approval-allow").click({ timeout: 5_000 })
      await expect(page.getByTestId("approval-allow")).toHaveCount(0, { timeout: 15_000 })
      await page.waitForTimeout(600)
      await settle(page)
      // q2 + K12 先转条：批准写盘后出现待验收框（#224 slot）+ 排队芯片行，send 446 > 430——base d4ad6b93 同路径实测同型（本刀 clip 全程未参与），
      // follow-up 另报。豁免只给本段、只剥 send/stop 越线两项，帧数 / send 按 base 实测封顶；释放检查（过渡 ≤3、covered 0、stripFlipsAfter ≤1）照常。
      const knownBase: KnownBase | undefined = count === 2 ? { reason: "base d4ad6b93 同路径 send/stop 446 越线：#224 slot + 排队芯片行，clip 未参与" } : undefined
      await endFrames(page, info, `${tag}-release`, { maxTransitions: 1, release: true, knownBaseActionBad: knownBase })
      const after = await geometry(page)
      console.log(`APCLIP ${tag}-final ${JSON.stringify({ barTop: after.barTop, actions: after.actions.map((a) => ({ id: a.id, bottom: a.rect!.bottom, margin: a.margin, hits: a.hits.filter((h) => h.ok).length })), strip: after.strip, tray: after.tray?.height })}`)
      expect(after.clip).toBeNull()
      for (const a of after.actions) {
        expect(a.hits.every((h) => h.ok), `${tag} release ${a.id}`).toBe(true)
        expect(a.rect!.bottom, `${tag} release ${a.id} ≤430`).toBeLessThanOrEqual(430.5)
        expect(a.margin!, `${tag} release ${a.id} ≤top−13`).toBeGreaterThanOrEqual(-0.5)
      }
      expect(after.thumb.hits.every((h) => h.ok), `${tag} release thumb`).toBe(true)
      if (shots) { writeFileSync(join(shots, `${tag}-released.json`), JSON.stringify(after, null, 2)); await page.screenshot({ path: join(shots, `${tag}-released.png`) }) }
      expect(errors).toEqual([])
    } finally { await cleanup() }
  })
}
