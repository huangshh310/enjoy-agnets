/**
 * CU-P1-A 闸接线：prefs SoT 投影 appKey[]、二次确认硬拒绝写簿、allow_always 不写会话表。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { listDesktopAlwaysAllowAppKeys } from "./builtin-tools/computer-use/desktop-always-allow-entries.ts"
import { toSubagentUserDecision } from "./approval-gate.ts"

const CALC = "com.apple.calculator"

test("投影 helper 只吐裸 appKey，兼容旧 string[] 并丢掉脏键", () => {
  assert.deepEqual(
    listDesktopAlwaysAllowAppKeys([
      { appKey: CALC, displayName: "计算器" },
      { appKey: "desktop_act:*", displayName: "any" },
      "com.apple.Notes",
      "18422",
      "*"
    ]),
    [CALC, "com.apple.Notes"]
  )
  assert.deepEqual(listDesktopAlwaysAllowAppKeys([]), [])
})

test("approvalPolicyFromPrefs 把 SoT 对象数组投影进闸", () => {
  const src = readFileSync(new URL("./open-coding-stream-input.ts", import.meta.url), "utf8")
  assert.match(src, /listDesktopAlwaysAllowAppKeys\(input\.prefs\.desktopAlwaysAllowAppKeys\)/)
  assert.match(src, /desktopAlwaysAllowAppKeys:/)
  assert.match(src, /desktopAdvancedCoords: input\.prefs\.desktopAdvancedCoords === true/)
  assert.match(src, /lookupDesktopObservation: peekDesktopObservation/)
  assert.doesNotMatch(src, /sessionApprovedTools\.add/)
})

test("无稳 key / pid 不得写入持久簿", () => {
  const entries = readFileSync(
    new URL("./builtin-tools/computer-use/desktop-always-allow-entries.ts", import.meta.url),
    "utf8"
  )
  assert.match(entries, /if \(!isStableDesktopAppKey\(appKey\)\) return null/)
  const ledger = readFileSync(
    new URL("./builtin-tools/computer-use/desktop-always-allow-ledger.ts", import.meta.url),
    "utf8"
  )
  assert.match(ledger, /upsertDesktopAlwaysAllowEntry/)
  assert.doesNotMatch(ledger, /args\.pid|row\.pid/)
})

test("二次确认路径硬拒绝写簿，不调用落盘", () => {
  const ledger = readFileSync(
    new URL("./builtin-tools/computer-use/desktop-always-allow-ledger.ts", import.meta.url),
    "utf8"
  )
  assert.match(ledger, /if \(desktopActNeedsSecondConfirm\(args\)\) return null/)
  assert.match(ledger, /rememberDesktopAlwaysAllowFromArgs/)
  const args = readFileSync(
    new URL("../../renderer/src/components/ai-chat/thread/approval/desktop-approval-args.ts", import.meta.url),
    "utf8"
  )
  assert.match(args, /wouldAlwaysAllow = !secondConfirm && isStableDesktopAppKey\(appKey\)/)
  assert.match(args, /canAlwaysAllow: wouldAlwaysAllow && !bypassesSessionAllow/)
})

test("allow_always 不写会话表；子循环折成 allow", () => {
  const src = readFileSync(new URL("./agent-runner.ts", import.meta.url), "utf8")
  assert.match(src, /if \(decision === "allow_always"\) \{\s*applyDesktopAlwaysAllow\(pending\)\s*return/)
  assert.match(src, /desktopActNeedsSecondConfirm\(pending\.args\)/)
  assert.match(src, /rememberDesktopAlwaysAllowFromArgs/)
  assert.match(src, /allow_always 只写持久簿，不写会话表/)
  assert.equal(toSubagentUserDecision("allow_always"), "allow")
  assert.equal(toSubagentUserDecision("allow_session"), "allow_session")
})
