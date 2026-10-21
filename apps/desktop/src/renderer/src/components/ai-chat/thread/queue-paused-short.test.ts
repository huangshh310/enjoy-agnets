/**
 * luna #170（锁）：窄（说明行 < 35rem）时暂停原因不再另写长短两种说法，只按一条规则——
 * 去掉中间「排队的 {n} 条先不发 / so {n} queued messages are on hold」（排队行自己写着条数），留原因 + 句尾。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

// 同 p3-gate-leftovers：@renderer 别名要 register 钩子，动态取。
const view = await import("./queue-paused-view.ts")

const tr = (cat: Record<string, unknown>) => (path: string, vars?: Record<string, string | number>) =>
  String(cat[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
const zh = tr(zhChat as never)
const en = tr(enChat as never)
const provider = { kind: "named" as const, name: "DeepSeek" }
// resend = 失败那条还在卡上（#169 pendingFailed "card"）。
const v = (t: typeof zh, reason: "stopped" | "engineSwitched" | "error" | "quota", count: number, resend = false) =>
  view.queuePausedView({ reason, count, composerHasContent: false, pendingFailed: resend ? "card" : null, provider, t })

test("窄句：每种原因 × 中英 × 失败卡露着与否，都是「原因 + 句尾」", () => {
  const expected: Array<[string, string, string]> = [
    ["stopped", "你停止了上一轮。", "You stopped the last turn."],
    ["engineSwitched", "你换了助手，上一轮停了。", "You switched assistants, so the last turn stopped."],
    ["error", "上一条没发出去。", "Your last message didn't go through."],
    ["quota", "DeepSeek 额度用完了。充值后点继续。", "DeepSeek is out of credit. Top up, then press Continue."]
  ]
  for (const [reason, z, e] of expected) {
    assert.equal(v(zh, reason as never, 2).shortText, z, reason)
    assert.equal(v(en, reason as never, 2).shortText, e, reason)
  }
  // 失败卡上「再发一次」露着：出错句后接「先发上面这条」；额度整句换成「充值后先发上面这条」。
  assert.equal(v(zh, "error", 2, true).shortText, "上一条没发出去。先发上面这条。")
  assert.equal(v(en, "error", 2, true).shortText, "Your last message didn't go through. Send the one above first.")
  assert.equal(v(zh, "quota", 2, true).shortText, "DeepSeek 额度用完了。充值后先发上面这条。")
  assert.equal(v(en, "quota", 2, true).shortText, "DeepSeek is out of credit. Top up, then send the one above.")
  // 称呼走同一条 fillProviderFace：没有名字时「模型服务」贴中文不留空格，英文句首大写。
  const generic = view.queuePausedView({ reason: "quota", count: 2, composerHasContent: false, pendingFailed: null, provider: { kind: "generic" } as never, t: zh })
  assert.equal(generic.shortText, "模型服务额度用完了。充值后点继续。")
  // 停止 / 换助手是中性暂停，不说「失败卡」；但 #169 起失败那条没发时句尾说完下一步「…再点继续」，窄句照说（不删下一步）。
  assert.equal(v(en, "stopped", 2).shortText, "You stopped the last turn.")
  assert.equal(v(en, "stopped", 2, true).shortText, "You stopped the last turn. Send the one above first, then press Continue.")
  assert.equal(v(zh, "stopped", 2, true).shortText, "你停止了上一轮。先发上面这条，发出去后再点继续。")
})

test("窄句不说条数：N=1 / N=3 一样，不出现「排队的 N 条 / queued message(s)」；宽句照旧带条数", () => {
  for (const reason of ["stopped", "engineSwitched", "error", "quota"] as const) {
    for (const resend of [false, true]) {
      for (const t of [zh, en]) {
        const one = v(t, reason, 1, resend)
        const three = v(t, reason, 3, resend)
        assert.equal(one.shortText, three.shortText, `${reason} ${resend}`)
        assert.doesNotMatch(three.shortText, /3|排队的|queued|on hold|\{/)
        assert.match(three.text, /3/)
        assert.notEqual(three.text, three.shortText)
      }
    }
  }
})

test("句尾不改：窄句的句尾和宽句的句尾是同一句（luna 锁定的句尾）", () => {
  assert.ok(v(zh, "quota", 2).text.endsWith("充值后点继续。"))
  assert.ok(v(en, "quota", 2).text.endsWith("Top up, then press Continue."))
  assert.ok(v(en, "quota", 2, true).text.includes("Top up, then send the one above."))
  assert.ok(v(zh, "quota", 2, true).text.includes("充值后先发上面这条"))
  assert.ok(v(en, "error", 2, true).text.includes("Send the one above first."))
  assert.ok(v(zh, "error", 2, true).text.includes("先发上面这条"))
})

test("每个带条数的 queuePaused 原因 key 都有一个 …Short（中英），且不带 {n}", () => {
  const reasonKeys = ["Stopped", "EngineSwitched", "Error", "Quota", "ResendFirst", "QuotaResend"]
  for (const cat of [zhChat, enChat] as Record<string, unknown>[]) {
    for (const k of reasonKeys) {
      const short = cat[`queuePaused${k}Short`]
      assert.equal(typeof short, "string", k)
      assert.doesNotMatch(short as string, /\{n\}/, k)
    }
  }
  assert.ok(!/[\u4e00-\u9fff]/.test(reasonKeys.map((k) => (enChat as any)[`queuePaused${k}Short`]).join("")))
})

test("接线：宽（≥35rem）显示全句、窄显示窄句；窄句仍 line-clamp-2，两个都带 title 全文", () => {
  const row = readFileSync(new URL("./queue-paused-row.tsx", import.meta.url), "utf8")
  assert.match(row, /data-testid="queue-paused-reason"\s+className=\{cx\(\s+"hidden [^"]*@\[35rem\]:block"/)
  assert.match(row, /data-testid="queue-paused-reason-short"\s+className=\{cx\(\s+"line-clamp-2 [^"]*@\[35rem\]:hidden"/)
  assert.equal(row.match(/title=\{view\.text\}/g)?.length, 2)
  assert.match(row, /\{view\.shortText\}/)
})

test("英文暂停占位符（luna #170 锁）", () => {
  assert.equal((enChat as any).placeholderRunningPaused, "Queue paused. Enter adds to it, Continue sends it. {mod}+Enter sends now…")
})
