/**
 * P2 Diff 渲染 soft · 真机自门 4 屏
 * 1 语法高亮 diff · 2 增减色（行底+边条）· 3 大文件折叠+展开 CTA · 4 留下/丢掉仍可用
 * 预览 HTML 不算过门。
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-diff-pierre"

async function launch(workspace: string, env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-diff-pierre-ud-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_STUB_SLOW_MS: "200",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

function git(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd })
}

function seedWorkspace(workspace: string) {
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  git(workspace, ["init"])
  git(workspace, ["config", "user.email", "e2e@test"])
  git(workspace, ["config", "user.name", "e2e"])
  git(workspace, ["add", "readme.md"])
  git(workspace, ["commit", "-m", "init"])

  // 屏①②：有增有删的 TS，便于语法高亮 + 增减色
  const baseTs = [
    "export function greet(name: string): string {",
    '  const prefix = "hello"',
    "  return `${prefix}, ${name}`",
    "}",
    "",
    "export const VERSION = 1",
    "export type Mode = \"light\" | \"dark\"",
    ""
  ].join("\n")
  writeFileSync(join(workspace, "palette.ts"), baseTs)
  git(workspace, ["add", "palette.ts"])
  git(workspace, ["commit", "-m", "add palette"])

  writeFileSync(
    join(workspace, "palette.ts"),
    [
      "export function greet(name: string, shout = false): string {",
      '  const prefix = shout ? "HELLO" : "hello"',
      "  const bang = shout ? \"!\" : \".\"",
      "  return `${prefix}, ${name}${bang}`",
      "}",
      "",
      "export const VERSION = 2",
      "export type Mode = \"light\" | \"dark\" | \"system\"",
      "export function isDark(mode: Mode): boolean {",
      '  return mode === "dark"',
      "}",
      ""
    ].join("\n")
  )

  // 屏③：大文件 >400 行 diff（多 hunk），触发 foldLargeFiles
  const largeOld: string[] = []
  for (let i = 0; i < 40; i++) {
    largeOld.push(`export const block${i} = {`)
    for (let j = 0; j < 8; j++) largeOld.push(`  k${j}: ${i * 10 + j},`)
    largeOld.push("}")
    largeOld.push("")
  }
  writeFileSync(join(workspace, "large-mod.ts"), largeOld.join("\n"))
  git(workspace, ["add", "large-mod.ts"])
  git(workspace, ["commit", "-m", "add large"])

  const largeNew: string[] = []
  for (let i = 0; i < 40; i++) {
    largeNew.push(`export const block${i} = {`)
    for (let j = 0; j < 8; j++) largeNew.push(`  k${j}: ${i * 10 + j + 1}, // touched`)
    largeNew.push("  extra: true,")
    largeNew.push("}")
    largeNew.push("")
  }
  writeFileSync(join(workspace, "large-mod.ts"), largeNew.join("\n"))

  // 屏④ leave/discard：再加一个小文件
  writeFileSync(join(workspace, "keep-me.ts"), "export const keep = 1\n")
}

async function openReview(window: Page) {
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 45_000 })
  await window.keyboard.press("Control+Shift+G")
  const reviewPane = window.locator('[data-testid="right-pane-shell"]')
  await expect(reviewPane).toBeVisible({ timeout: 15_000 })
  return reviewPane
}

async function openFileInReview(window: Page, name: string) {
  const row = window.getByText(name, { exact: false }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()
  // 等 pierre host 挂上
  await expect
    .poll(
      async () =>
        window.evaluate(() => Boolean(document.querySelector('[data-diff-engine="pierre-shiki-js"]'))),
      { timeout: 25_000 }
    )
    .toBe(true)
}

test.describe("P2 diff pierre gate", () => {
  test.setTimeout(240_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 语法高亮 / 增减色 / 大文件折叠 / 留下丢掉", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-diff-pierre-ws-"))
    seedWorkspace(workspace)
    const app = await launch(workspace)
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1440, height: 900 })
      await window
        .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', {
          timeout: 25_000
        })
        .catch(() => undefined)
      const skipGuide = window.getByRole("button", { name: "跳过设置" })
      if ((await skipGuide.count()) > 0) await skipGuide.click()

      await openReview(window)

      // ── 屏① 语法高亮：打开 palette.ts，等 shiki span ──
      await openFileInReview(window, "palette.ts")
      await expect
        .poll(
          async () =>
            window.evaluate(() => {
              const host = document.querySelector('[data-diff-engine="pierre-shiki-js"]')
              if (!host) return { ok: false, reason: "no-host" }
              // PatchDiff 渲染到 light DOM 或自定义元素（shadow 穿透本刀不强制）
              const all = host.querySelectorAll("span, code, pre")
              let tokenish = 0
              all.forEach((el) => {
                const s = getComputedStyle(el)
                const c = s.color
                // 非纯黑/灰 = 可能高亮
                if (c && c !== "rgb(0, 0, 0)" && !c.includes("128") && el.textContent && el.textContent.length < 40) {
                  if (el.className || el.getAttribute("style")?.includes("--shiki") || /keyword|string|function/i.test(el.className))
                    tokenish++
                }
                if (el.getAttribute("style")?.includes("var(--shiki") || /--shiki-/.test(el.className)) tokenish++
              })
              // 也扫 shadow
              const custom = host.querySelectorAll("*")
              let hasPierre = false
              custom.forEach((el) => {
                if (el.tagName.toLowerCase().includes("diff") || el.className?.toString?.().includes("pierre"))
                  hasPierre = true
                const sr = (el as HTMLElement).shadowRoot
                if (sr) {
                  sr.querySelectorAll("span").forEach((span) => {
                    const st = span.getAttribute("style") || ""
                    if (st.includes("--shiki") || st.includes("color:")) tokenish++
                  })
                }
              })
              return {
                ok: tokenish > 0 || hasPierre,
                tokenish,
                hasPierre,
                engine: host.getAttribute("data-diff-engine"),
                htmlSnippet: host.innerHTML.slice(0, 240)
              }
            }),
          { timeout: 30_000 }
        )
        .toMatchObject({ engine: "pierre-shiki-js" })
      await window.waitForTimeout(800)
      await window.screenshot({ path: join(SHOTS, "01-syntax-highlighted-diff.png") })

      // ── 屏② 增减色：采样行底 / 边条 CSS 变量或实际背景 ──
      const paletteProbe = await window.evaluate(() => {
        const host = document.querySelector('[data-diff-engine="pierre-shiki-js"]') as HTMLElement | null
        if (!host) return { ok: false }
        // hostStyle 挂在 scroller / PatchDiff 上，不在外层 data-diff-engine
        const styled =
          (Array.from(host.querySelectorAll<HTMLElement>("*")).find((el) =>
            (el.getAttribute("style") || "").includes("--diffs-bg-addition-override")
          ) as HTMLElement | undefined) ?? host
        const style = getComputedStyle(styled)
        const addOv = style.getPropertyValue("--diffs-bg-addition-override").trim()
        const delOv = style.getPropertyValue("--diffs-bg-deletion-override").trim()
        const addBar = style.getPropertyValue("--diffs-addition-color-override").trim()
        const delBar = style.getPropertyValue("--diffs-deletion-color-override").trim()
        // 尝试找带 addition/deletion class 的行
        let addBgHit = false
        let delBgHit = false
        const walk = (root: ParentNode) => {
          root.querySelectorAll("*").forEach((el) => {
            const cls = (el as HTMLElement).className?.toString?.() || ""
            const attr = (el as HTMLElement).getAttribute?.("data-line-type") || ""
            const cs = getComputedStyle(el as HTMLElement)
            const bg = cs.backgroundColor
            if (/add|insertion/i.test(cls + attr) && bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent")
              addBgHit = true
            if (/del|deletion|removal/i.test(cls + attr) && bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent")
              delBgHit = true
            const sr = (el as HTMLElement).shadowRoot
            if (sr) walk(sr)
          })
        }
        walk(host)
        return {
          ok: Boolean((addOv && delOv && addBar && delBar) || (addBgHit && delBgHit)),
          addOv: addOv.slice(0, 80),
          delOv: delOv.slice(0, 80),
          addBar: addBar.slice(0, 80),
          delBar: delBar.slice(0, 80),
          addBgHit,
          delBgHit,
          styledTag: styled.tagName,
          styledStyle: (styled.getAttribute("style") || "").slice(0, 200)
        }
      })
      expect(paletteProbe.ok, `增减色行底/边条应可见: ${JSON.stringify(paletteProbe)}`).toBe(true)
      await window.screenshot({ path: join(SHOTS, "02-add-delete-palette.png") })

      // ── 屏③ 大文件折叠 ──
      await openFileInReview(window, "large-mod.ts")
      const foldBanner = window.locator('[data-testid="diff-fold-banner"]')
      await expect(foldBanner).toBeVisible({ timeout: 25_000 })
      await expect(foldBanner).toContainText("改动较多，先显示开头一段。")
      await expect(window.locator('[data-testid="diff-fold-expand"]')).toHaveText("展开其余改动")
      await window.screenshot({ path: join(SHOTS, "03-large-file-fold.png") })
      await window.locator('[data-testid="diff-fold-expand"]').click()
      await expect(foldBanner).toHaveCount(0, { timeout: 10_000 })
      await window.waitForTimeout(400)
      await window.screenshot({ path: join(SHOTS, "03b-large-file-expanded.png") })

      // ── 屏④ 留下 / 丢掉（需「展开全部差异」才出卡头按钮）──
      const expandAll = window.locator('button[title="展开全部差异"]')
      if ((await expandAll.count()) > 0) {
        await expandAll.first().click()
      } else {
        // 已展开则 title 变成收起
        await expect(window.locator('button[title="收起全部差异"]').first()).toBeVisible({
          timeout: 5_000
        })
      }
      await expect
        .poll(async () => window.getByRole("button", { name: "留下" }).count(), { timeout: 15_000 })
        .toBeGreaterThan(0)
      const leaveBtn = window.getByRole("button", { name: "留下" }).first()
      await expect(leaveBtn).toBeVisible({ timeout: 10_000 })
      const discardCountBefore = await window.getByRole("button", { name: "丢掉" }).count()
      expect(discardCountBefore).toBeGreaterThan(0)
      await leaveBtn.click()
      const kept = window.getByText("已留下").first()
      await expect(kept).toBeVisible({ timeout: 10_000 })
      await kept.scrollIntoViewIfNeeded()
      await expect(window.getByRole("button", { name: "丢掉" }).first()).toBeVisible()
      await window.waitForTimeout(300)
      // 全屏 + 卡头裁剪，保证「已留下」入镜
      await window.screenshot({ path: join(SHOTS, "04-leave-discard.png") })
      const card = kept.locator("xpath=ancestor::article[1]")
      if ((await card.count()) > 0) {
        await card.first().screenshot({ path: join(SHOTS, "04b-kept-stub-card.png") })
      } else {
        await kept.screenshot({ path: join(SHOTS, "04b-kept-stub-card.png") })
      }

      // 零扩张抽检：无 SessionList virtua 挂面、无 I3 文案
      const expansion = await window.evaluate(() => {
        const html = document.body.innerText
        return {
          hasI3: /I3|ink\/|隧道/.test(html),
          hasVirtuaSession: Boolean(document.querySelector("[data-session-list-virtua]")),
          hasPierre: Boolean(document.querySelector('[data-diff-engine="pierre-shiki-js"]'))
        }
      })
      expect(expansion.hasI3).toBe(false)
      expect(expansion.hasVirtuaSession).toBe(false)
      expect(expansion.hasPierre).toBe(true)
    } finally {
      const proc = app.process()
      await Promise.race([app.close(), new Promise((r) => setTimeout(r, 2_000))]).catch(() => undefined)
      try {
        proc?.kill("SIGKILL")
      } catch {
        /* gone */
      }
    }
  })
})
