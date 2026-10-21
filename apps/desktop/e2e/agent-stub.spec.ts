/**
 * 无真实 Key 的窗口流：stub 发聊天、停止、刷新恢复、审批、知识索引、工作流、导入资产。
 */
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("stub Agent：发送、停止、恢复、审批、知识、工作流、导入", async () => {
  const app = await launchStubApp("# e2e workspace\nhello knowledge\n", 180_000)
  if (!app) return
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello stub")
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("attached body")
    })
    await window.waitForSelector('[data-testid="composer-asset-chip"]', { timeout: 8_000 })
    await sendComposer(window, composer, "read this")
    await window.waitForFunction(() => document.body.innerText.includes("attached:note.txt"), undefined, {
      timeout: 20_000
    })

    await sendComposer(window, composer, "please go slow now")
    await window.waitForSelector('[data-testid="composer-stop"]', { timeout: 8_000 })
    await window.locator('[data-testid="composer-stop"]').click()
    await window.locator('[data-testid="composer-stop"]').waitFor({ state: "detached", timeout: 8_000 })

    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
      timeout: 15_000
    })

    await window.reload()
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.locator('[data-testid="message-more"]').first().click({ timeout: 8_000 })
    await window.locator('[data-testid="extract-object"]').click({ timeout: 8_000 })
    await window.waitForFunction(() => document.body.innerText.includes("stub-card"), undefined, {
      timeout: 12_000
    })

    // TTFO 大盘只在开发者文案档出现（#142）；这里临时打开再关上
    await window.evaluate(() => {
      localStorage.setItem("enjoy-agents-dev-copy", "1")
      location.hash = "#/observability"
    })
    await window.waitForFunction(() => document.body.innerText.includes("TTFO"), undefined, {
      timeout: 8_000
    })
    await window.evaluate(() => {
      localStorage.removeItem("enjoy-agents-dev-copy")
    })

    await window.evaluate(() => {
      location.hash = "#/knowledge"
    })
    await window.waitForSelector('[data-testid="knowledge-add-index"]', { timeout: 8_000 })
    await window.locator('[data-testid="knowledge-add-index"]').click()
    await window.locator('[data-testid="knowledge-index-root"]').click({ timeout: 8_000 })
    await window.locator('[data-testid="knowledge-index-confirm"]').click()
    await window.locator('[data-testid="knowledge-index-confirm"]').waitFor({ state: "detached", timeout: 15_000 })
    const search = window.locator('[data-testid="knowledge-search-input"]')
    await search.fill("hello knowledge")
    await window.locator('[data-testid="knowledge-search-submit"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("readme.md"), undefined, {
      timeout: 15_000
    })

    await window.evaluate(() => {
      location.hash = "#/"
    })
    await composer.waitFor({ timeout: 12_000 })
    await sendComposer(window, composer, "hello knowledge")
    await window.waitForFunction(() => document.body.innerText.includes("readme.md"), undefined, {
      timeout: 20_000
    })

    await window.evaluate(() => {
      location.hash = "#/workflows"
    })
    await window.waitForSelector('[data-testid="workflow-start"]', { timeout: 8_000 })
    if ((await window.locator('[data-testid="workflow-dag"]').count()) === 0) {
      await window.locator('[data-testid="workflow-create"]').click()
      await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 8_000 })
    }
    await window.locator('[data-testid="workflow-start"]').click()
    await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 12_000 })

    await window.evaluate(() => {
      location.hash = "#/media"
    })
    await window.waitForSelector('[data-testid="page-media"]', { timeout: 8_000 })
    await window.locator('[data-testid="media-file-input"]').setInputFiles({
      name: "e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("imported")
    })
    await window.waitForFunction(() => document.body.innerText.includes("e2e.txt"), undefined, {
      timeout: 12_000
    })
    const card = window.locator("article").filter({ hasText: "e2e.txt" }).first()
    await card.click()
    await card.getByTestId("asset-export").click({ force: true })
    await window.waitForFunction(
      () => document.body.innerText.includes("Exported to") || document.body.innerText.includes("已导出到"),
      undefined,
      { timeout: 12_000 }
    )
    await window.getByRole("button", { name: /STT & Audio|语音转写/ }).click()
    await window.waitForFunction(
      () => document.body.innerText.includes("Translate") || document.body.innerText.includes("翻译"),
      undefined,
      { timeout: 8_000 }
    )

    await window.evaluate(() => {
      location.hash = "#/mcp"
    })
    await window.waitForSelector('[data-testid="mcp-add-server"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-add-server"]').click()
    await window.locator('[data-testid="mcp-save-server"]').click({ timeout: 8_000 })
    await window.locator('[data-testid="mcp-save-server"]').waitFor({ state: "detached", timeout: 8_000 })
    await window.locator('[data-testid="mcp-trust"]').click()
    await window.locator('[data-testid="mcp-trust-confirm"]').click()
    await window.waitForSelector('[data-testid="mcp-open-app"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-open-app"]').click()
    await window.waitForSelector('[data-testid="mcp-app-frame"]', { timeout: 15_000 })
    const appFrame = window.frameLocator('[data-testid="mcp-app-frame"]')
    await appFrame.locator('[data-testid="mcp-app-ready"]').waitFor({ timeout: 8_000 })
    await appFrame.locator('[data-testid="mcp-app-log"]').evaluate((el: HTMLElement) => el.click())
    await expect(window.locator('[data-testid="mcp-app-log-text"]')).toContainText("app-log-ok", {
      timeout: 12_000
    })
  } finally {
    await closeApp(app)
  }
})

test("本会话总是允许：同会话跨轮不弹卡，新会话与归档后仍要问", async () => {
  const app = await launchStubApp("# e2e session allow\n", 180_000, { lang: "zh" })
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 900 })
    const composer = window.locator('[data-testid="composer-input"]')
    await sendWriteAndAllowSession(window, composer)
    const firstId = await firstSessionId(window)
    expect(firstId.length).toBeGreaterThan(0)

    await sendWriteExpectExecuted(window, composer)
    await sendWriteExpectExecuted(window, composer)

    await window.locator('[data-testid="sidebar-new-session"]').click()
    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-session"]')).toBeVisible({ timeout: 20_000 })
    await window.locator('[data-testid="approval-deny"]').click({ timeout: 8_000, force: true })
    await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0, { timeout: 12_000 })

    // 新会话先关卡再归档：归档必须清掉第一会话的 allow，恢复后再问。
    await archiveSessionById(window, firstId)
    await window.evaluate(() => {
      location.hash = "#/settings/archived"
    })
    await expect(window.getByText("已归档的聊天").first()).toBeVisible({ timeout: 8_000 })
    await window.locator('[data-testid="archived-row-restore"]').click({ timeout: 8_000 })
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await expect(sessionRowById(window, firstId)).toBeVisible({ timeout: 8_000 })
    await sessionRowById(window, firstId).click()
    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-session"]')).toBeVisible({ timeout: 20_000 })
  } finally {
    await closeApp(app)
  }
})

test("命令夹具：本会话允许 ls 后 ls 不弹卡、ls -la 再弹卡；run code / long / pipe 只允许一次", async () => {
  const app = await launchStubApp("# e2e shell fixtures\n", 240_000, { lang: "zh" })
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 900 })
    const composer = window.locator('[data-testid="composer-input"]')
    const allowOnce = window.locator('[data-testid="approval-allow"]')
    const allowSession = window.locator('[data-testid="approval-session"]')
    const alwaysApp = window.locator('[data-testid="approval-always-app"]')

    await sendComposer(window, composer, "run bash ls")
    await expect(allowSession).toBeVisible({ timeout: 20_000 })
    await allowSession.click({ timeout: 8_000, force: true })
    await waitRanCount(window, "ls", 1)

    // 同一条完全相同的命令：不弹卡直接（假）执行。
    await sendComposer(window, composer, "run bash ls")
    await waitRanCount(window, "ls", 2)
    await expect(allowOnce).toHaveCount(0)
    await expect(allowSession).toHaveCount(0)

    // 同前缀不同命令：仍要问。
    await sendComposer(window, composer, "run bash ls -la")
    await expect(allowSession).toBeVisible({ timeout: 20_000 })
    await allowOnce.click({ timeout: 8_000, force: true })
    await waitRanCount(window, "lsla", 1)

    for (const [trigger, key] of [
      ["run code", "code"],
      ["run long", "long"],
      ["run pipe", "pipe"]
    ] as const) {
      await sendComposer(window, composer, trigger)
      await expect(allowOnce).toBeVisible({ timeout: 20_000 })
      await expect(allowSession).toHaveCount(0)
      await expect(alwaysApp).toHaveCount(0)
      await allowOnce.click({ timeout: 8_000, force: true })
      await waitRanCount(window, key, 1)
    }
  } finally {
    await closeApp(app)
  }
})

test("重新生成非最后一条：确认删掉后面几轮、重跑点的那一轮；审批 / 命令轮重新生成不误报「有新内容」", async () => {
  const app = await launchStubApp("# e2e regenerate middle\n", 240_000, { lang: "zh" })
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 900 })
    const composer = window.locator('[data-testid="composer-input"]')
    const regen = window.getByRole("button", { name: "重新生成回复" })
    const banner = window.locator('[data-testid="thread-error-banner"]')
    const dialog = window.locator('[data-testid="regenerate-confirm-dialog"]')
    const allowOnce = window.locator('[data-testid="approval-allow"]')
    const countText = (re: string) =>
      window.evaluate((source) => document.body.innerText.match(new RegExp(source, "g"))?.length ?? 0, re)

    // 1) 两轮纯文本：重新生成第一条。
    await sendComposer(window, composer, "hello")
    await expect.poll(() => countText("stub-ok hello(?! two)")).toBe(1)
    await sendComposer(window, composer, "hello two")
    await expect.poll(() => countText("stub-ok hello two")).toBe(1)
    await expect(regen).toHaveCount(2, { timeout: 10_000 })
    await regen.first().click({ force: true })
    await expect(dialog).toBeVisible({ timeout: 8_000 })
    await expect(dialog).toContainText("1 轮")
    await window.locator('[data-testid="regenerate-confirm"]').click()
    // 后面那轮删掉，第一轮重跑完；没有「有新内容」红卡。
    await expect.poll(() => countText("stub-ok hello two"), { timeout: 20_000 }).toBe(0)
    await expect.poll(() => countText("stub-ok hello(?! two)"), { timeout: 20_000 }).toBe(1)
    await expect(regen).toHaveCount(1, { timeout: 20_000 })
    await expect(window.getByText("有新内容")).toHaveCount(0)
    await expect(banner).toHaveCount(0)

    // 2) 审批轮（write_file）是最后一条：不弹确认，直接重跑这一轮（再出审批卡）。
    await sendComposer(window, composer, "please write a note")
    await allowOnce.click({ timeout: 15_000, force: true })
    await expect.poll(() => countText("stub-ok allowed write"), { timeout: 15_000 }).toBe(1)
    await regen.last().click({ force: true })
    await expect(dialog).toHaveCount(0)
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await expect(banner).toHaveCount(0)
    await allowOnce.click({ timeout: 8_000, force: true })
    await expect.poll(() => countText("stub-ok allowed write"), { timeout: 15_000 }).toBe(1)

    // 3) 命令轮（bash ls）是最后一条：同样不误报。
    await sendComposer(window, composer, "run bash ls")
    await allowOnce.click({ timeout: 20_000, force: true })
    await waitRanCount(window, "ls", 1)
    await regen.last().click({ force: true })
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await expect(banner).toHaveCount(0)
    await allowOnce.click({ timeout: 8_000, force: true })
    await expect.poll(() => countText("stub-ok ran ls\\b"), { timeout: 15_000 }).toBe(1)

    // 4) 审批轮在中间（后面还有命令轮）：确认删 1 轮，重跑写文件这一轮，命令轮不再出现。
    const writeRegen = regen.nth(1)
    // 上一轮 run.end 落下前按钮是 disabled，force 点下去什么也不发生（CI 39551224529 偶发）。
    await expect(writeRegen).toBeEnabled()
    await writeRegen.click({ force: true })
    await expect(dialog).toContainText("1 轮")
    await window.locator('[data-testid="regenerate-confirm"]').click()
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await allowOnce.click({ timeout: 8_000, force: true })
    await expect.poll(() => countText("stub-ok allowed write"), { timeout: 15_000 }).toBe(1)
    await expect.poll(() => countText("stub-ok ran ls\\b"), { timeout: 15_000 }).toBe(0)
    await expect(window.getByText("有新内容")).toHaveCount(0)
    await expect(banner).toHaveCount(0)
  } finally {
    await closeApp(app)
  }
})

test("run long 命令卡：默认与 733×480 下拒绝 / 运行与 Composer 都在窗口内，展开 / 收起可用", async () => {
  const app = await launchStubApp("# e2e long command card\n", 240_000, { lang: "zh" })
  if (!app) return
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    const allowOnce = window.locator('[data-testid="approval-allow"]')
    const deny = window.locator('[data-testid="approval-deny"]')
    const command = window.locator('[data-testid="approval-command"]')
    const toggle = window.locator('[data-testid="approval-command-toggle"]')

    // 短命令：不出展开链接。
    await sendComposer(window, composer, "run bash ls")
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await expect(command).toBeVisible()
    await expect(toggle).toHaveCount(0)
    await shot(window, "run-bash-ls-light")
    await forceStubTheme(window, "dark")
    await shot(window, "run-bash-ls-dark")
    await forceStubTheme(window, "light")
    await allowOnce.click({ timeout: 8_000, force: true })
    await waitRanCount(window, "ls", 1)

    await sendComposer(window, composer, "run long")
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await expect(toggle).toHaveText("展开全部（共 4205 字）")
    await expect(command).toHaveAttribute("data-expanded", "false")
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    await expectCommandReadable(window, "run long default collapsed")
    await shot(window, "run-long-light")
    await shot(window, "large-runlong")

    await toggle.click()
    await expect(command).toHaveAttribute("data-expanded", "true")
    await expect(toggle).toHaveText("收起")
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    await shot(window, "run-long-expanded-light")
    await forceStubTheme(window, "dark")
    await shot(window, "run-long-expanded-dark")
    await toggle.click()
    await expect(command).toHaveAttribute("data-expanded", "false")
    await shot(window, "run-long-dark")
    await forceStubTheme(window, "light")

    await window.setViewportSize({ width: 733, height: 480 })
    await shot(window, "small-runlong-collapsed")
    await logBoxes(window, "run long 733x480 collapsed")
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    // 小窗：命令区不被压缩（至少 2 行），「展开全部」不滚动就看得见，同时按钮可见。
    await expectCommandReadable(window, "run long 733x480 collapsed")
    await expectUnclipped(toggle)
    await expectUnclipped(allowOnce)
    await expectUnclipped(deny)
    await shot(window, "small-runlong-collapsed")
    await toggle.click()
    await expect(command).toHaveAttribute("data-expanded", "true")
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    await expectCommandReadable(window, "run long 733x480 expanded")
    await expectUnclipped(allowOnce)
    await shot(window, "small-runlong-expanded")
    await toggle.click()
    await expect(command).toHaveAttribute("data-expanded", "false")
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    await expectUnclipped(toggle)

    await allowOnce.click({ timeout: 8_000, force: true })
    await waitRanCount(window, "long", 1)
    await sendComposer(window, composer, "run bash ls")
    await expect(allowOnce).toBeVisible({ timeout: 20_000 })
    await expectFullyInViewport(window, [allowOnce, deny, composer])
    await expectCommandReadable(window, "run bash ls 733x480")
    await expectUnclipped(allowOnce)
    await expectUnclipped(deny)
    await expectUnclipped(window.locator('[data-testid="approval-session"]'))
    await shot(window, "small-bashls")
    // 大窗再看一眼 run bash ls。
    await window.setViewportSize({ width: 1280, height: 800 })
    await expectCommandReadable(window, "run bash ls 1280x800")
    await shot(window, "large-bashls")
  } finally {
    await closeApp(app)
  }
})

/** 命令区可读：可见高度 ≥ min(实际行数, 2) × 行高，且上下沿都没被裁（elementFromPoint 命中自己）。 */
async function expectCommandReadable(window: Page, label: string) {
  const pre = window.locator('[data-testid="approval-command"]')
  await expect(pre).toBeVisible({ timeout: 10_000 })
  const m = await pre.evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight)
    return { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, lineHeight }
  })
  const lines = Math.max(1, Math.round(m.scrollHeight / m.lineHeight))
  console.log(`[command-area] ${label} ${JSON.stringify({ ...m, lines })}`)
  expect(m.clientHeight).toBeGreaterThanOrEqual(Math.min(lines, 2) * m.lineHeight - 1)
  await expectUnclipped(pre)
}

/** 调试与报告：Dock / 卡片 / 命令区 / 底栏 / Composer 的高度。 */
async function logBoxes(window: Page, label: string) {
  const boxes = await window.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), height: Math.round(r.height) }
    }
    return {
      viewport: innerHeight,
      dock: pick('[data-testid="permission-dock"]'),
      card: pick('[data-testid="permission-dock"] article'),
      block: pick('[data-testid="approval-command-block"]'),
      toggle: pick('[data-testid="approval-command-toggle"]'),
      footer: pick('[data-testid="permission-dock"] footer'),
      composer: pick('[data-testid="composer-input"]')
    }
  })
  console.log(`[boxes] ${label} ${JSON.stringify(boxes)}`)
}

/** 不滚动就能看见：元素上沿与下沿处的 elementFromPoint 都落在它自己身上（没被滚动容器裁掉、没被盖住）。 */
async function expectUnclipped(locator: ReturnType<Page["locator"]>) {
  await expect(locator).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(() =>
      locator.evaluate((el) => {
        const r = el.getBoundingClientRect()
        if (r.height < 1 || r.width < 1) return false
        const x = r.left + Math.min(6, r.width / 2)
        return [r.top + 1.5, r.bottom - 1.5].every((y) => {
          const hit = document.elementFromPoint(x, y)
          return Boolean(hit && (hit === el || el.contains(hit)))
        })
      })
    )
    .toBe(true)
}

/** 整个元素都在视口内（不是只露一角）。 */
async function expectFullyInViewport(window: Page, locators: Array<ReturnType<Page["locator"]>>) {
  const viewport = await window.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  for (const locator of locators) {
    await expect(locator).toBeVisible({ timeout: 10_000 })
    const box = await locator.boundingBox()
    expect(box, "boundingBox").not.toBeNull()
    if (!box) continue
    expect(box.height).toBeGreaterThan(0)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5)
  }
}

/** 仅本机设 ENJOY_E2E_SHOTS_DIR 时截图给 luna；CI 不写盘。 */
async function shot(window: Page, name: string) {
  const dir = process.env.ENJOY_E2E_SHOTS_DIR
  if (!dir) return
  await window.waitForTimeout(250)
  await window.screenshot({ path: join(dir, `${name}.png`) }).catch(() => undefined)
}

async function forceStubTheme(window: Page, theme: "light" | "dark") {
  await window.evaluate((next) => {
    document.documentElement.classList.toggle("dark", next === "dark")
    document.documentElement.dataset.theme = next
    window.dispatchEvent(new CustomEvent("boardui:theme-change", { detail: next }))
  }, theme)
}

/** 数正文里 `stub-ok ran <key>`（\b 防 ls 吃到 lsla）。 */
async function waitRanCount(window: Page, key: string, count: number) {
  await window.waitForFunction(
    ({ key, count }) =>
      (document.body.innerText.match(new RegExp(`stub-ok ran ${key}\\b`, "g"))?.length ?? 0) >= count,
    { key, count },
    { timeout: 20_000 }
  )
}

async function launchStubApp(
  readme: string,
  timeoutMs = 90_000,
  opts?: { lang?: "zh" | "en" }
): Promise<ElectronApplication | null> {
  test.setTimeout(timeoutMs)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return null
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-"))
  writeFileSync(join(workspace, "readme.md"), readme)
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      // 未设 CHAT_READY 不再注入 ollama；本文件都要能发，显式种 key。
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ...(opts?.lang ? { ENJOY_E2E_LANG: opts.lang } : {})
    }
  })
}

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow({ timeout: 45_000 })
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  await window
    .locator('button:has-text("跳过设置"), button:has-text("Skip setup"), [data-testid="composer-input"]')
    .first()
    .waitFor({ timeout: 20_000 })
  const skipGuide = window.getByRole("button", { name: /跳过设置|Skip setup/ })
  if ((await skipGuide.count()) > 0) await skipGuide.click()
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
  return window
}

async function sendWriteAndAllowSession(window: Page, composer: ReturnType<Page["locator"]>) {
  await sendComposer(window, composer, "please write a note")
  await window.locator('[data-testid="approval-session"]').click({ timeout: 15_000, force: true })
  await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
    timeout: 15_000
  })
}

async function sendWriteExpectExecuted(window: Page, composer: ReturnType<Page["locator"]>) {
  const before = await countAllowedWrite(window)
  await sendComposer(window, composer, "please write a note")
  await window.waitForFunction(
    (prev) => (document.body.innerText.match(/stub-ok allowed write/g)?.length ?? 0) > prev,
    before,
    { timeout: 15_000 }
  )
  await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0)
}

async function countAllowedWrite(window: Page): Promise<number> {
  return window.evaluate(() => document.body.innerText.match(/stub-ok allowed write/g)?.length ?? 0)
}

async function firstSessionId(window: Page): Promise<string> {
  const row = window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').first()
  await expect(row).toBeVisible({ timeout: 8_000 })
  return (await row.getAttribute("data-session-id")) ?? ""
}

function sessionRowById(window: Page, sessionId: string) {
  return window.locator(
    `[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${sessionId}"]`
  )
}

async function archiveSessionById(window: Page, sessionId: string) {
  const row = sessionRowById(window, sessionId)
  await row.scrollIntoViewIfNeeded()
  await row.hover()
  await row.locator('[data-testid="session-row-menu"]').click()
  await window.locator('[data-testid="session-row-menu-archive"]').click()
  const confirm = window.locator('[data-testid="confirm-dialog-confirm"]')
  if ((await confirm.count()) > 0) await confirm.click()
  await expect(window.locator('[data-testid="session-archived-toast"]')).toBeVisible({ timeout: 12_000 })
}

async function closeApp(app: ElectronApplication) {
  const proc = app.process()
  await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
