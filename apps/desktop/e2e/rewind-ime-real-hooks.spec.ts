/**
 * #167 实机 CONDITIONAL 必修 ① ②（luna 清单 10 / 11 / 14），真 hook 复现：
 * ① 组字中重来 → 等写回；组字结束后写回落地，光标停在用户打的字末尾（原话在下一行），不跳到原话末尾。
 * ② 组字中重来 → 切走（原话并进原会话草稿）→ 切回（组字还没结束，框里是旧组字稿）→ 组字结束把旧组字稿写进 store
 *    → 恢复的原话不能没了。
 * 页面是 rewind-ime-harness.tsx 现打包，headless Chrome 跑（不启动 Electron）；找不到 Chrome 就跳过。
 */
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const ORIG = "orig tenZ"

function chromePath(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  ]
  return candidates.find((p) => p && existsSync(p)) ?? null
}

async function bundle(): Promise<string> {
  const require = createRequire(join(process.cwd(), "package.json"))
  const esbuild = createRequire(require.resolve("vite"))("esbuild") as typeof import("esbuild")
  const out = await esbuild.build({
    entryPoints: [join(process.cwd(), "e2e/rewind-ime-harness.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    tsconfig: join(process.cwd(), "tsconfig.web.json"),
    define: { "process.env.NODE_ENV": '"development"' },
    loader: { ".svg": "dataurl", ".png": "dataurl" },
    logLevel: "silent"
  })
  return out.outputFiles[0]!.text
}

async function openHarness(): Promise<{ page: Page; close: () => Promise<void> }> {
  const exe = chromePath()
  test.skip(!exe, "no Chrome/Chromium executable for the real-hook harness")
  const { chromium } = await import("playwright")
  const browser = await chromium.launch({ executablePath: exe!, headless: true, args: ["--no-sandbox"] })
  const page = await browser.newPage()
  const js = await bundle()
  await page.route("http://rewind-ime.test/**", (route) =>
    route.request().url().endsWith("/harness.js")
      ? route.fulfill({ contentType: "text/javascript", body: js })
      : route.fulfill({ contentType: "text/html", body: readFileSync(join(process.cwd(), "e2e/rewind-ime-harness.html"), "utf8") })
  )
  await page.goto("http://rewind-ime.test/")
  await page.waitForFunction(() => Boolean((window as unknown as { __rewind?: unknown }).__rewind) && Boolean(document.querySelector("textarea")))
  return { page, close: () => browser.close() }
}

test("必修 ①（清单 10）：组字结束后延迟写回落地，光标停在用户打的字末尾", async () => {
  test.setTimeout(90_000)
  const { page, close } = await openHarness()
  try {
    const r = await page.evaluate(async (orig) => {
      const { useChatStore, pending } = (window as any).__rewind
      const el = document.querySelector("textarea") as HTMLTextAreaElement
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
      useChatStore.setState({ sessionId: "s1", composer: "" })
      await sleep(30)
      el.focus()
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
      el.value = "我在打字"
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "我在打字", isComposing: true }))
      el.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "我在打字" }))
      await sleep(30)
      pending.recordPendingRewind("s1", orig, [])
      const first = pending.settlePendingRewind("s1")
      pending.ensurePendingRewindLoop()
      ;(window as any).__sets.length = 0
      el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: el.value }))
      await sleep(500)
      return { first, value: el.value, caret: [el.selectionStart, el.selectionEnd], sets: (window as any).__sets, left: pending.listPendingRewindSessions() }
    }, ORIG)
    console.log("[rewind-ime ①]", JSON.stringify(r))
    expect(r.first).toBe("waiting")
    expect(r.value).toBe(`我在打字\n${ORIG}`)
    expect(r.left).toEqual([])
    expect(r.caret).toEqual([4, 4])
  } finally {
    await close()
  }
})

test("必修 ②（清单 11 / 14）：组字中切走再切回，组字结束后恢复的原话还在", async () => {
  test.setTimeout(90_000)
  const { page, close } = await openHarness()
  try {
    const r = await page.evaluate(async (orig) => {
      const { useChatStore, pending, ime, switchSession } = (window as any).__rewind
      const el = document.querySelector("textarea") as HTMLTextAreaElement
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
      const log: string[] = []
      useChatStore.setState({ sessionId: "s1", composer: "" })
      await sleep(30)
      el.focus()
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
      el.value = "打的字"
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "打的字", isComposing: true }))
      el.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "打的字" }))
      await sleep(30)
      pending.recordPendingRewind("s1", orig, [])
      log.push(`settle s1 composing: ${pending.settlePendingRewind("s1")}`)
      pending.ensurePendingRewindLoop()
      await sleep(120)
      switchSession("s2")
      await sleep(150)
      log.push(`s1 draft: ${JSON.stringify(useChatStore.getState().getSessionDraft("s1")?.text)}`)
      switchSession("s1")
      await sleep(150)
      log.push(`back in s1 (composing=${ime.isComposerComposing()}): dom=${JSON.stringify(el.value)} store=${JSON.stringify(useChatStore.getState().composer)}`)
      log.push(`record before end: ${JSON.stringify(pending.readPendingRewind("s1"))}`)
      el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: el.value }))
      await sleep(500)
      return { value: el.value, store: useChatStore.getState().composer, log, left: pending.listPendingRewindSessions() }
    }, ORIG)
    console.log("[rewind-ime ②]", JSON.stringify(r))
    expect(r.value).toContain(ORIG)
    expect(r.store).toContain(ORIG)
    expect(r.value).toBe(`打的字\n${ORIG}`)
    expect(r.left).toEqual([])
  } finally {
    await close()
  }
})
