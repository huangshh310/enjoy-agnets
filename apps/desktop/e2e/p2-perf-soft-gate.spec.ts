/**
 * P2 性能品味 soft · 真机自门 4 屏（闲置静止 / 活工作可读 / 减动诚实 / 零扩张）
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-perf-soft"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-perf-soft-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-perf-soft-ws-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_STUB_SLOW_MS: "400",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

/** 采样页面上是否有「闲置装饰」在跑：beam spin / glass float / theme fx infinite */
async function sampleIdleMotion(window: import("@playwright/test").Page) {
  return window.evaluate(() => {
    const beamsOn = [...document.querySelectorAll("[data-beam][data-on]")]
    const glassOrbs = [...document.querySelectorAll(".skin-glass-orb")]
    const themeFx = [...document.querySelectorAll(
      ".theme-switch__meteor, .theme-switch__shooting-star, .theme-switch__aurora, .theme-switch__comets .comet"
    )]
    function animating(el: Element) {
      const styles = getComputedStyle(el)
      const name = styles.animationName
      if (!name || name === "none") return false
      // iteration infinite or long-running
      const iter = styles.animationIterationCount
      return iter === "infinite" || Number(iter) > 1
    }
    // also check ::after for beam (pseudo not in query — use data-on as proxy for lit beam)
    return {
      beamLitCount: beamsOn.length,
      glassOrbAnimating: glassOrbs.filter(animating).length,
      themeFxAnimating: themeFx.filter(animating).length,
      glassOrbCount: glassOrbs.length
    }
  })
}

test.describe("P2 perf soft gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 闲置静止 / 活工作 / 减动 / 零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const app = await launch()
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1440, height: 900 })
      const composer = window.locator('[data-testid="composer-input"]')
      await composer.waitFor({ timeout: 45_000 })

      // ── 屏① 闲置静止：空会话 + focus（有 draft 也不该 beam）──
      await composer.click()
      await composer.fill("草稿不该开 beam")
      await window.waitForTimeout(600)
      let sample = await sampleIdleMotion(window)
      expect(sample.beamLitCount, "focus/draft 不得持运 BorderBeam").toBe(0)
      expect(sample.glassOrbAnimating, "glass orb 不得 perpetual float").toBe(0)
      expect(sample.themeFxAnimating, "theme fx 夜间 infinite 不得闲置持运").toBe(0)
      await window.screenshot({ path: join(SHOTS, "01-idle-still-composer-draft.png") })

      // 设置页闲置
      await window.evaluate(() => {
        window.location.hash = "#/settings/appearance"
      })
      await expect.poll(() => window.evaluate(() => location.hash)).toContain("#/settings")
      await window.waitForTimeout(800)
      sample = await sampleIdleMotion(window)
      expect(sample.beamLitCount).toBe(0)
      expect(sample.glassOrbAnimating).toBe(0)
      expect(sample.themeFxAnimating).toBe(0)
      await window.screenshot({ path: join(SHOTS, "01b-idle-settings-appearance.png") })

      // 关于页
      await window.evaluate(() => {
        window.location.hash = "#/settings/about"
      })
      await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/about")
      await window.waitForTimeout(500)
      sample = await sampleIdleMotion(window)
      expect(sample.beamLitCount).toBe(0)
      await window.screenshot({ path: join(SHOTS, "01c-idle-about.png") })

      // ── 屏② 活工作仍可读：慢 stub 发一条，running 时应有 beam ──
      await window.evaluate(() => {
        window.location.hash = "#/"
      })
      await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/")
      await composer.waitFor({ timeout: 20_000 })
      // 新会话避免草稿态干扰
      const newSession = window.locator('[data-testid="sidebar-new-session"]')
      if (await newSession.count()) {
        await newSession.click()
        await window.waitForTimeout(400)
      }
      await composer.click()
      await composer.fill("slow 测活工作指示 please hold")
      const sendBtn = window.locator('[data-testid="composer-send"]')
      await expect(sendBtn).toBeEnabled({ timeout: 10_000 })
      await sendBtn.click()
      // 优先等 store.running / beam lit；附带诊断
      await expect
        .poll(async () => {
          const diag = await window.evaluate(() => {
            const beam = document.querySelectorAll("[data-beam][data-on]").length
            const stop = document.querySelector('[data-testid="composer-stop"]')
            const body = document.body?.innerText?.slice(0, 200) ?? ""
            return { beam, hasStop: Boolean(stop), body }
          })
          return diag.beam
        }, { timeout: 20_000 })
        .toBeGreaterThan(0)
      await window.screenshot({ path: join(SHOTS, "02-live-work-running.png") })

      // ── 屏③a 停跑后停动 ──
      await expect(window.locator("body")).toContainText("stub-ok", { timeout: 45_000 })
      await expect
        .poll(async () => (await sampleIdleMotion(window)).beamLitCount, { timeout: 15_000 })
        .toBe(0)
      await window.screenshot({ path: join(SHOTS, "03-stopped-still.png") })

      // ── 屏④ 零扩张：composer 仍在、无 virtua 假成功文案 ──
      await expect(composer).toBeVisible()
      const bodyText = await window.locator("body").innerText()
      expect(bodyText).not.toMatch(/已全面流畅|已 virtua|性能大升级/)
      await window.screenshot({ path: join(SHOTS, "04-no-expansion-composer-ok.png") })

      // ── 屏③b 减动诚实：emulate reduce，装饰静帧、live 时可区分（静帧 rim）──
      await window.emulateMedia({ reducedMotion: "reduce" })
      await composer.click()
      await composer.fill("slow 减动下再跑 please hold")
      await composer.press("Enter")
      await expect
        .poll(async () => {
          return window.evaluate(() => {
            const beam = document.querySelector("[data-beam][data-on]")
            if (!beam) return { lit: false, spinning: true }
            const after = getComputedStyle(beam, "::after")
            const name = after.animationName
            return { lit: true, spinning: Boolean(name && name !== "none") }
          })
        }, { timeout: 15_000 })
        .toMatchObject({ lit: true, spinning: false })
      const reduceSample = await window.evaluate(() => {
        const beam = document.querySelector("[data-beam][data-on]")
        if (!beam) return { lit: false, spinning: false }
        const after = getComputedStyle(beam, "::after")
        const name = after.animationName
        return { lit: true, spinning: Boolean(name && name !== "none") }
      })
      expect(reduceSample.spinning, "reduce 下 beam 须静帧").toBe(false)
      await window.screenshot({ path: join(SHOTS, "03b-reduced-motion-live-static-rim.png") })
      await expect(window.locator("body")).toContainText("stub-ok", { timeout: 45_000 })

      writeFileSync(
        join(SHOTS, "gate-sample.json"),
        JSON.stringify({ idleDraftBeam: 0, reduceSpinning: reduceSample.spinning }, null, 2)
      )
    } finally {
      // Electron+stub 偶发 close 挂起；硬超时后靠 process 退出
      await Promise.race([
        app.close().catch(() => null),
        new Promise((r) => setTimeout(r, 5_000))
      ])
      try {
        const pid = (app as { process?: () => { pid?: number } }).process?.()?.pid
        if (pid) process.kill(pid, "SIGKILL")
      } catch {
        /* ignore */
      }
    }
  })
})
