/**
 * #167 实机 CONDITIONAL 必修 ① ②（luna 清单 10 / 11 / 14），真 hook 复现：
 * ① 组字中重来 → 等写回；组字结束后写回落地，光标停在用户打的字末尾（原话在下一行），不跳到原话末尾。
 * ② 组字中重来 → 切走（原话并进原会话草稿）→ 切回（组字还没结束，框里是旧组字稿）→ 组字结束把旧组字稿写进 store
 *    → 恢复的原话不能没了。
 * ③ leo r7 S1：停放的会话回到前台，恢复输入框之后立刻判定（不等轮询）；用户紧接着改了那行 / 清空了 → 不追加、不复活。
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

for (const action of ["edit", "clear"] as const) {
  test(`leo r7 S1：停放的会话切回后立刻判定，用户下一拍前${action === "edit" ? "改了原话那行 → 不再追加" : "清空了 → 原话不复活"}`, async () => {
    test.setTimeout(90_000)
    const { page, close } = await openHarness()
    try {
      const r = await page.evaluate(
        async ({ orig, action }) => {
          const { useChatStore, pending, switchSession } = (window as any).__rewind
          const el = document.querySelector("textarea") as HTMLTextAreaElement
          const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
          const log: string[] = []
          // s1 不在前台时记一条 → 轮询把原话并进 s1 的草稿、记录停放。
          useChatStore.setState({ sessionId: "s2", composer: "" })
          await sleep(30)
          pending.recordPendingRewind("s1", orig, [])
          pending.ensurePendingRewindLoop()
          await sleep(150)
          log.push(`parked: ${JSON.stringify(pending.readPendingRewind("s1"))}`)
          const t0 = performance.now()
          switchSession("s1")
          // 用户最早能动输入框的时候：React 把恢复的稿画进 DOM 之后。远早于 50ms 的轮询。
          while (el.value !== orig && performance.now() - t0 < 40) await sleep(0)
          const shownAt = Math.round(performance.now() - t0)
          log.push(`after switch ${shownAt}ms: record=${JSON.stringify(pending.readPendingRewind("s1") ?? null)} dom=${JSON.stringify(el.value)}`)
          el.focus()
          const next = action === "edit" ? `${el.value} more` : ""
          // 走 React 认的改值方式（原生 setter + input 事件），onChange 照常触发。
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, next)
          el.dispatchEvent(new InputEvent("input", { bubbles: true, data: action === "edit" ? " more" : null }))
          await sleep(400)
          return { shownAt, value: el.value, store: useChatStore.getState().composer, log, left: pending.listPendingRewindSessions() }
        },
        { orig: ORIG, action }
      )
      console.log(`[rewind-ime ③ ${action}]`, JSON.stringify(r))
      expect(r.shownAt, "改动发生在第一拍轮询（50ms）之前").toBeLessThan(40)
      const expected = action === "edit" ? `${ORIG} more` : ""
      expect(r.value).toBe(expected)
      expect(r.store).toBe(expected)
      expect(r.left).toEqual([])
    } finally {
      await close()
    }
  })
}

for (const via of ["alt-left", "sidebar-click"] as const) {
  test(`luna P1：A 组字中经 ${via === "alt-left" ? "Alt+Left" : "点侧栏"} 切到 B → B 框是 B 草稿，compositionend 不盖 B`, async () => {
    test.setTimeout(90_000)
    const { page, close } = await openHarness()
    try {
      const r = await page.evaluate(async () => {
        const { useChatStore, ime, switchSession } = (window as any).__rewind
        const el = document.querySelector("textarea") as HTMLTextAreaElement
        const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
        // Alt+Left 与点侧栏都只改 sessionId，hook 同一条 effect——两条路径共用本用例。
        useChatStore.getState().saveSessionDraft("s_a", { text: "A committed", assets: [], quotedContexts: [] })
        useChatStore.getState().saveSessionDraft("s_b", { text: "B own", assets: [], quotedContexts: [] })
        useChatStore.setState({ sessionId: "s_a", composer: "A committed" })
        await sleep(40)
        el.focus()
        el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
        el.value = "alt"
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "alt", isComposing: true }))
        el.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "alt" }))
        await sleep(40)
        switchSession("s_b")
        await sleep(60)
        const afterSwitch = {
          shown: el.value,
          store: useChatStore.getState().composer,
          composing: ime.isComposerComposing(),
          sessionId: useChatStore.getState().sessionId
        }
        el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "alt" }))
        await sleep(80)
        const afterEnd = {
          shown: el.value,
          store: useChatStore.getState().composer,
          draftB: useChatStore.getState().getSessionDraft("s_b")?.text
        }
        switchSession("s_a")
        await sleep(60)
        const backA = {
          shown: el.value,
          store: useChatStore.getState().composer,
          draftA: useChatStore.getState().getSessionDraft("s_a")?.text
        }
        return { afterSwitch, afterEnd, backA }
      })
      console.log(`[rewind-ime P1 ${via}]`, JSON.stringify(r))
      expect(r.afterSwitch.sessionId).toBe("s_b")
      expect(r.afterSwitch.composing).toBe(false)
      expect(r.afterSwitch.shown).toBe("B own")
      expect(r.afterSwitch.store).toBe("B own")
      expect(r.afterEnd.shown).toBe("B own")
      expect(r.afterEnd.store).toBe("B own")
      expect(r.afterEnd.draftB).toBe("B own")
      expect(r.backA.shown).toBe("A committed")
      expect(r.backA.store).toBe("A committed")
    } finally {
      await close()
    }
  })
}
