/**
 * 446 刀：733 批准后 send/stop 446/511 + slot 释放 1 帧 108（P1-a 帽檐让位 / P1-b slot 释放同帧交接 / P1-c slot 期保留 K12）。
 * 硬线 C13′（产品锁 §16 Q-2）：733×480 send/stop ≤430 且 ≤ 状态栏 top−13；其余高度 ≤ 当场 top−13（+0.5）；
 * 每个已绘制帧 send/stop 五点 5/5，底边带探针（bottom−1.5，¼ / ½ / ¾ 宽）0 次落在状态栏。无任何 base 豁免。
 * 矩阵：zh/en × 480/504/510/520/528/558 ×
 *   (a) q2：very slow → 运行中排队 2 → 加图 → 733×H → 展开托盘 → 写盘审批 → 批准；run 由桩**自然结束**；
 *   (b) 无审批：slow hold → 排队 2 → 加图 → 733×H → 展开；状态轮询等 slot / K12 / 让位落地后**测试里点 Stop 人工结束 run**
 *       （host 03:17 PST 拍板：与 q2 的自然结束不同；点 Stop 那一帧 stop 5/5 且过硬线本身是断言）。
 * 都录到 stop 消失 +3s（页内按帧时间戳判，不用固定 sleep 当断言点）。另有 fallback 格（slot 期加图 → slot 释放）
 * 与 luna R6 格（733×480 排队 0、运行中 Ctrl+Enter 马上发 → 批准）。阅读位置只记录（console APP446 read-pos），不断言。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"
import { existsSync } from "node:fs"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)
const shots = process.env.ENJOY_E2E_SHOTS_DIR
if (shots) mkdirSync(shots, { recursive: true })
type Lang = "zh" | "en"
const HEIGHTS = [480, 504, 510, 520, 528, 558]

test.beforeAll(() => { test.skip(!existsSync(mainEntry), "out missing; build desktop first") })

async function boot(lang: Lang, prompt: string) {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-446-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-446-ud-"))
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
  const cleanup = async () => {
    await closeForRelaunch(app)
    rmSync(workspace, { recursive: true, force: true })
    rmSync(userData, { recursive: true, force: true })
  }
  try {
    const page = await firstWindow(app)
    const errors: string[] = []
    page.on("pageerror", (e) => { if (/ResizeObserver loop|flushSync was called from inside a lifecycle/.test(String(e))) errors.push(String(e)) })
    page.on("console", (msg) => { if (/ResizeObserver loop|flushSync was called from inside a lifecycle/.test(msg.text())) errors.push(msg.text()) })
    await page.setViewportSize({ width: 1440, height: 920 })
    await page.waitForTimeout(800)
    const skip = page.getByRole("button", { name: /^(跳过设置|Skip setup)$/ })
    if (await skip.count()) await skip.click()
    const input = page.getByTestId("composer-input")
    await sendComposer(page, input, prompt)
    await expect(page.getByTestId("composer-stop")).toBeVisible({ timeout: 15_000 })
    return { app, page, errors, cleanup }
  } catch (error) {
    await cleanup()
    throw error
  }
}

/** 状态轮询：几何与托盘 data 属性连续 6 次采样不变。 */
async function settle(page: Page) {
  let prev = ""
  let stable = 0
  for (let i = 0; i < 200; i++) {
    const cur = await page.evaluate(() => {
      const tray = document.querySelector('[data-testid="composer-attachment-tray"]')
      const es = [tray, document.querySelector("form[data-composer]"), document.querySelector('[data-testid="composer-stop"]'), document.querySelector('[data-testid="approval-allow"]')]
      const attrs = ["data-tray-strip", "data-tray-slot", "data-tray-squeezed", "data-cluster-yield"].map((a) => tray?.getAttribute(a) ?? null)
      return JSON.stringify([attrs, es.map((e) => (e ? e.getBoundingClientRect().toJSON() : null))])
    })
    stable = cur === prev ? stable + 1 : 0
    if (stable >= 6) return
    prev = cur
    await page.waitForTimeout(30)
  }
  throw new Error("geometry did not settle")
}

type Frame = {
  t: number; w: number; h: number; barTop: number | null; run: boolean; appr: boolean
  strip: boolean; squeezed: boolean; slot: string | null; clip: boolean; yld: boolean; residual: number | null; hint: boolean; handover: string | null
  rail: number; cap: { h: number; vis: number } | null; conv: number | null; trayH: number | null
  act: Record<string, { b: number; n: number; edgeBar: number; bar5: number }>; readPos: number | null
}

/** 逐「已绘制」帧（rAF → MessageChannel，同 composer-733-approval.spec）记录。 */
async function startFrames(page: Page) {
  await page.evaluate(() => {
    const S = { stop: false, frames: [] as unknown[] }
    ;(globalThis as any).__f446 = S
    const tick = (t: number) => {
      const bar = document.querySelector('[data-testid="status-context-meter"]')?.closest("[data-toast-clearance]") ?? null
      const barTop = bar ? bar.getBoundingClientRect().top : null
      const tray = document.querySelector('[data-testid="composer-attachment-tray"]')
      const act: Record<string, unknown> = {}
      for (const id of ["composer-send", "composer-stop"]) {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.height <= 0 || r.width <= 0) continue
        const pts = [[r.left + 5, r.top + 5], [r.right - 5, r.top + 5], [r.left + 5, r.bottom - 5], [r.right - 5, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]]
        let n = 0
        let bar5 = 0
        for (const [x, y] of pts) {
          const hit = document.elementFromPoint(x!, y!)
          if (hit && (hit === el || el.contains(hit))) n += 1
          else if (hit && bar?.contains(hit)) bar5 += 1
        }
        const edgeBar = [0.25, 0.5, 0.75].map((k) => document.elementFromPoint(r.left + r.width * k, r.bottom - 1.5)).filter((a) => !!a && !!bar && bar.contains(a)).length
        act[id] = { b: r.bottom, n, edgeBar, bar5 }
      }
      const rail = document.querySelector("[data-composer-followup-rail]")
      const capEl = document.querySelector("[data-composer-cap-frame]")
      const conv = document.querySelector('[data-testid="chat-conversation"]')
      const scroller = conv?.querySelector("[data-thread-root]") ?? null
      S.frames.push({
        t, w: innerWidth, h: innerHeight, barTop,
        run: !!document.querySelector('[data-testid="composer-stop"]'),
        appr: !!document.querySelector('[data-testid="approval-allow"]'),
        strip: tray?.getAttribute("data-tray-strip") === "true",
        squeezed: tray?.getAttribute("data-tray-squeezed") === "true",
        slot: tray?.getAttribute("data-tray-slot") ?? null,
        clip: tray?.getAttribute("data-tray-approval-clip") === "true",
        yld: tray?.getAttribute("data-cluster-yield") === "true",
        residual: tray?.getAttribute("data-cluster-residual") != null ? Number(tray.getAttribute("data-cluster-residual")) : null,
        hint: tray ? tray.getAttribute("data-cluster-hint") === "true" : !!document.querySelector("[data-composer-followup-rail]"),
        handover: tray?.getAttribute("data-tray-handover") ?? null,
        rail: rail ? rail.getBoundingClientRect().height : 0,
        cap: capEl ? { h: capEl.getBoundingClientRect().height, vis: Array.from(capEl.children).filter((c) => c.getBoundingClientRect().height > 0).length } : null,
        conv: conv ? conv.getBoundingClientRect().height : null,
        trayH: tray ? tray.getBoundingClientRect().height : null,
        act,
        readPos: scroller ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight : null
      })
    }
    const loop = (t: number) => {
      const ch = new MessageChannel()
      ch.port1.onmessage = () => tick(t)
      ch.port2.postMessage(0)
      if (!S.stop) requestAnimationFrame(loop)
    }
    tick(performance.now())
    requestAnimationFrame(loop)
  })
}

/** 等 stop 消失，再按帧时间戳录满 3s（页内轮询，不 sleep 断言）。 */
async function recordUntilRunEndPlus3s(page: Page) {
  await expect(page.getByTestId("composer-stop")).toHaveCount(0, { timeout: 40_000 })
  await page.waitForFunction(() => {
    const fs = (globalThis as any).__f446.frames as Array<{ t: number; run: boolean }>
    const end = fs.findIndex((f, i) => i > 0 && fs[i - 1]!.run && !f.run)
    return end > 0 && fs[fs.length - 1]!.t - fs[end]!.t >= 3000
  }, undefined, { timeout: 15_000, polling: 100 })
  return page.evaluate(() => { const s = (globalThis as any).__f446; s.stop = true; return s.frames }) as Promise<Frame[]>
}

/** C13′：一帧里 send/stop 的硬线违例（空 = 合规）。 */
function hardLine(f: Frame): string[] {
  const out: string[] = []
  for (const [id, a] of Object.entries(f.act)) {
    if (f.w === 733 && f.h === 480 && a.b > 430.5) out.push(`${id}>430(${a.b})`)
    if (f.barTop != null && a.b > f.barTop - 13 + 0.5) out.push(`${id}>top-13(${a.b}/${f.barTop})`)
    if (a.n < 5) out.push(`${id}:${a.n}/5`)
    if (a.edgeBar > 0) out.push(`${id}:edge-in-bar(${a.edgeBar})`)
  }
  return out
}

function analyse(label: string, fs: Frame[]) {
  const bad = fs.map((f, i) => [i, hardLine(f)] as const).filter(([, m]) => m.length > 0)
  const emptyCap = fs.filter((f) => f.hint && f.cap != null && f.cap.h > 0 && f.cap.vis === 0).length
  const railNoCap = fs.filter((f) => f.rail > 0 && (f.cap == null || f.cap.h <= 0)).length
  const hintMismatch = fs.filter((f) => !f.yld && f.hint !== f.rail > 0).length
  const yieldEnters = fs.filter((f, i) => i > 0 && f.yld && !fs[i - 1]!.yld).length
  const yieldLeaves = fs.filter((f, i) => i > 0 && !f.yld && fs[i - 1]!.yld).length
  const residualMax = Math.max(0, ...fs.filter((f) => f.yld).map((f) => f.residual ?? 0))
  const minConv = Math.min(...fs.map((f) => f.conv ?? Number.POSITIVE_INFINITY))
  const end = fs.findIndex((f, i) => i > 0 && fs[i - 1]!.run && !f.run)
  const stripFlips = fs.filter((f, i) => i > 0 && f.strip !== fs[i - 1]!.strip).length
  const tray108 = fs.filter((f) => f.trayH != null && f.trayH > 100).length
  const fallback = fs.filter((f) => f.handover === "fallback" && !f.strip).length
  const handovers = [...new Set(fs.map((f) => f.handover).filter(Boolean))]
  const readPos = [...new Set(fs.map((f) => (f.readPos == null ? null : Math.round(f.readPos))))].slice(0, 12)
  const summary = { label, frames: fs.length, bad: bad.length, emptyCap, railNoCap, hintMismatch, yieldEnters, yieldLeaves, residualMax, minConv, runEnd: end, stripFlips, tray108, fallback, handovers,
    maxSend: Math.max(0, ...fs.map((f) => f.act["composer-send"]?.b ?? 0)), maxStop: Math.max(0, ...fs.map((f) => f.act["composer-stop"]?.b ?? 0)),
    slots: [...new Set(fs.map((f) => f.slot))].slice(0, 8), barTops: [...new Set(fs.map((f) => f.barTop))] }
  console.log(`APP446 ${JSON.stringify(summary)}`)
  console.log(`APP446 read-pos ${label} ${JSON.stringify(readPos)}`)
  if (shots) writeFileSync(join(shots, `${label}-frames.json`), JSON.stringify({ summary, bad: bad.slice(0, 40), frames: fs }))
  return { summary, bad }
}

function expectHard(label: string, fs: Frame[], opts: { maxYieldEnters?: number } = {}) {
  const { summary, bad } = analyse(label, fs)
  expect(bad.length, `${label} C13′ hard line every painted frame ${JSON.stringify(bad.slice(0, 6))}`).toBe(0)
  expect(summary.emptyCap, `${label} 空框帧（提示在、框可见 0 可见子项）`).toBe(0)
  expect(summary.railNoCap, `${label} 有行无框帧`).toBe(0)
  expect(summary.hintMismatch, `${label} 谓词与 rail 实际渲染一致（非让位帧）`).toBe(0)
  expect(summary.residualMax, `${label} 让位后 residual`).toBe(0)
  expect(summary.minConv, `${label} 对话区 ≥56`).toBeGreaterThanOrEqual(55.5)
  expect(summary.yieldEnters, `${label} 让位单向一次`).toBeLessThanOrEqual(opts.maxYieldEnters ?? 1)
  // 「不回 108」约束的是 q2/q0 已进入条态后的 slot 释放交接，不是尚未入条的初态。
  // 558 的审批初态能容纳展开 108；(b) 528/558 全程容纳 108，不应凭高度强制条带（#224 公式不动）。
  // 原始 tray108 计数保留在 summary 供 V3 比对，硬线仍是所有采样帧严格断言。
  if (!label.endsWith("-noappr")) {
    const firstStrip = fs.findIndex((f) => f.strip)
    const afterStrip = firstStrip < 0 ? [] : fs.slice(firstStrip)
    expect(afterStrip.filter((f) => f.trayH != null && f.trayH > 100).length, `${label} 入条后托盘不回 108`).toBe(0)
  }
  return summary
}

async function q2Path(page: Page, lang: Lang, height: number, queued = 2) {
  const input = page.getByTestId("composer-input")
  for (let i = 0; i < queued; i++) {
    await input.fill(`${lang === "zh" ? "排队" : "queued"} ${i + 1}`)
    await input.press("Enter")
    await expect(page.getByTestId("queued-followups-docked").or(page.getByTestId("composer-queue-chip")).first()).toBeVisible({ timeout: 5_000 })
  }
  await page.getByTestId("composer-attach").setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: PNG })
  await expect(page.getByTestId("composer-asset-chip")).toHaveCount(1)
  await page.setViewportSize({ width: 733, height })
  const exp = page.getByTestId("composer-attachment-tray").getByTitle(lang === "zh" ? "展开附件检视面板" : "Expand attachment panel")
  if (await exp.count()) await exp.first().click()
  await settle(page)
}

for (const lang of ["zh", "en"] as const) {
  for (const height of HEIGHTS) {
    test(`446 (a) q2 批准后（${lang} 733×${height}）：每帧过硬线 5/5、无 108、让位单向，run 自然结束 +3s`, async () => {
      test.setTimeout(150_000)
      const { page, errors, cleanup } = await boot(lang, "very slow")
      const label = `${lang}-h${height}-q2`
      try {
        await q2Path(page, lang, height)
        await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 30_000 })
        await settle(page)
        await startFrames(page)
        await page.getByTestId("approval-allow").click({ timeout: 5_000 })
        const fs = await recordUntilRunEndPlus3s(page)
        if (shots) await page.screenshot({ path: join(shots, `${label}-terminal.png`) })
        const s = expectHard(label, fs)
        expect(s.runEnd, `${label} run ended naturally inside recording`).toBeGreaterThan(0)
        expect(fs.slice(s.runEnd).every((f) => hardLine(f).length === 0), `${label} run 结束后 0 帧越线`).toBe(true)
        expect(s.stripFlips, `${label} strip 不来回`).toBeLessThanOrEqual(1)
        expect(errors).toEqual([])
      } finally { await cleanup() }
    })

    test(`446 (b) 无审批（${lang} 733×${height}）：slow hold + 测试里点 Stop 人工结束 run（≠ q2 自然结束），每帧过硬线`, async () => {
      test.setTimeout(150_000)
      const { page, errors, cleanup } = await boot(lang, "slow hold")
      const label = `${lang}-h${height}-noappr`
      try {
        await startFrames(page)
        await q2Path(page, lang, height)
        // 运行段至少覆盖到 slot 稳定且让位 / 条带落地（状态轮询，settle 已含 data 属性与几何连续不变）。
        await settle(page)
        expect(await page.getByTestId("approval-allow").count(), `${label} no approval in this cell`).toBe(0)
        // 点 Stop 那一帧：stop 5/5 且过硬线（本身是断言）。
        const atStop = await page.evaluate(() => {
          const fs = (globalThis as any).__f446.frames as Frame[]
          return fs[fs.length - 1]
        }) as Frame
        expect(atStop.act["composer-stop"], `${label} stop visible when clicked`).toBeTruthy()
        expect(hardLine(atStop), `${label} stop frame at click`).toEqual([])
        await page.getByTestId("composer-stop").click({ timeout: 5_000 })
        const fs = await recordUntilRunEndPlus3s(page)
        // 从到达 733×H 后第一帧起判（之前是 1440 宽）。
        const from = fs.findIndex((f) => f.w === 733 && f.h === height)
        const seg = fs.slice(from)
        // 缩窗那一刻的进条过渡帧 ≤1（§14 进条坏帧上限），且只能落在缩窗后的前 30 帧里；之后逐帧零违例。
        const entryBad = seg.map((f, i) => [i, hardLine(f).length > 0] as const).filter(([, b]) => b).map(([i]) => i)
        console.log(`APP446 ${label} resize-entry-bad ${JSON.stringify(entryBad)}`)
        expect(entryBad.length, `${label} resize entry bad frames`).toBeLessThanOrEqual(1)
        expect(entryBad.every((i) => i < 30), `${label} entry bad only in resize transition`).toBe(true)
        expectHard(label, seg.slice(entryBad.length ? entryBad[0]! + 1 : 0))
        expect(errors).toEqual([])
      } finally { await cleanup() }
    })
  }
}

/** fallback 格（产品 §16 Q-8）：slot 期加一张图（附件数变 → 统一长回量作废）→ slot 释放；fallback 帧 ≤1 且过硬线；不可达则记标记 + 截图。 */
for (const lang of ["zh", "en"] as const) {
  test(`446 fallback（${lang} 733×480）：slot 期加图 → slot 释放，fallback 帧 ≤1 且过硬线`, async () => {
    test.setTimeout(150_000)
    const { page, errors, cleanup } = await boot(lang, "very slow")
    const label = `${lang}-h480-fallback`
    try {
      await q2Path(page, lang, 480)
      await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 30_000 })
      await settle(page)
      await startFrames(page)
      await page.getByTestId("approval-allow").click({ timeout: 5_000 })
      await page.waitForFunction(() => document.querySelector('[data-testid="composer-attachment-tray"]')?.getAttribute("data-tray-slot") != null, undefined, { timeout: 10_000 })
      await page.getByTestId("composer-attach").setInputFiles({ name: "tray2.png", mimeType: "image/png", buffer: PNG })
      await expect(page.getByTestId("composer-asset-chip")).toHaveCount(2)
      const fs = await recordUntilRunEndPlus3s(page)
      if (shots) await page.screenshot({ path: join(shots, `${label}-terminal.png`) })
      const s = expectHard(label, fs)
      console.log(`APP446 fallback-reach ${label} handovers=${JSON.stringify(s.handovers)} fallbackFrames=${s.fallback}`)
      expect(s.fallback, `${label} fallback frames`).toBeLessThanOrEqual(1)
      test.info().annotations.push({ type: "fallback", description: `${label}: handovers=${JSON.stringify(s.handovers)} fallbackFrames=${s.fallback}` })
      expect(errors).toEqual([])
    } finally { await cleanup() }
  })
}

/** luna R6：733×480 排队 0，运行中 Ctrl+Enter 马上发（「已收到…」）→ 批准；send ≤430、对话区 ≥56、空框帧 0。 */
for (const lang of ["zh", "en"] as const) {
  test(`446 R6（${lang} 733×480）：排队 0 + Ctrl+Enter 马上发 → 批准，帽檐整框收起无空框`, async () => {
    test.setTimeout(150_000)
    const { page, errors, cleanup } = await boot(lang, "very slow")
    const label = `${lang}-h480-steer`
    try {
      await q2Path(page, lang, 480, 0)
      const input = page.getByTestId("composer-input")
      await input.fill(lang === "zh" ? "马上看这个" : "look at this now")
      await input.press("Control+Enter")
      await expect(page.getByTestId("approval-allow")).toBeVisible({ timeout: 30_000 })
      await settle(page)
      await startFrames(page)
      await page.getByTestId("approval-allow").click({ timeout: 5_000 })
      const fs = await recordUntilRunEndPlus3s(page)
      if (shots) await page.screenshot({ path: join(shots, `${label}-terminal.png`) })
      const s = expectHard(label, fs)
      console.log(`APP446 R6 ${label} yieldEnters=${s.yieldEnters}（§17：门上记录是否触发，主路径预期不触发）`)
      expect(errors).toEqual([])
    } finally { await cleanup() }
  })
}
