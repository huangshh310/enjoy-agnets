/**
 * 人话映射：原因 / 超时码 / Dock 来源。禁止回原始 code。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { en } from "../../../i18n/catalogs/en/index.ts"
import { translate } from "../../../i18n/lookup.ts"
import {
  automationSourceCopy,
  catchUpApprovalTimeoutMinutes,
  catchUpWhenCopy,
  errorCodeCopy,
  errorCodeTip,
  isNeutralErrorCode,
  missedExpandLabel,
  skipReasonCopy,
  skipReasonTip
} from "./missed-copy.ts"

const zhT = (path: string, vars?: Record<string, string | number>) => translate(zh, path, vars)
const enT = (path: string, vars?: Record<string, string | number>) => translate(en, path, vars)

test("跳过原因是人话，不是工程码", () => {
  assert.equal(skipReasonCopy("system_sleep", zhT), "电脑睡眠")
  assert.equal(skipReasonCopy("app_not_running", zhT), "应用未运行")
  assert.equal(skipReasonCopy("previous_still_running", zhT), "上次仍在运行")
  assert.equal(skipReasonCopy("system_sleep", enT), "computer asleep")
  assert.equal(skipReasonCopy("unknown_code", zhT), "已错过")
  assert.equal(skipReasonCopy("system_sleep", zhT).includes("system_sleep"), false)
  assert.match(skipReasonTip("system_sleep", zhT), /睡着/)
  assert.match(skipReasonTip("app_not_running", zhT), /没开/)
  assert.match(skipReasonTip("previous_still_running", zhT), /还没结束/)
})

test("超时与重启打断走中性句，不读 lastError", () => {
  assert.equal(isNeutralErrorCode("catch_up_approval_timeout"), true)
  assert.equal(isNeutralErrorCode("interrupted_by_restart"), true)
  assert.equal(isNeutralErrorCode("timeout"), false)
  assert.equal(errorCodeCopy("catch_up_approval_timeout", zhT), "补跑等待确认超时，未运行")
  assert.equal(errorCodeCopy("interrupted_by_restart", zhT), "补跑被重启打断，未运行")
  assert.equal(errorCodeCopy("catch_up_approval_timeout", zhT)?.includes("catch_up"), false)
  assert.equal(errorCodeCopy("interrupted_by_restart", zhT)?.includes("interrupted"), false)
  assert.equal(errorCodeCopy("other", zhT), null)
  assert.equal(
    errorCodeTip("catch_up_approval_timeout", zhT),
    `${catchUpApprovalTimeoutMinutes()} 分钟内没人确认，已自动取消`
  )
  assert.match(errorCodeTip("interrupted_by_restart", zhT) ?? "", /重启/)
})

test("折叠条展开/收起跟开合走两套文案", () => {
  assert.equal(missedExpandLabel(false, zhT), "展开")
  assert.equal(missedExpandLabel(true, zhT), "收起")
  assert.equal(missedExpandLabel(false, enT), "Show")
  assert.equal(missedExpandLabel(true, enT), "Hide")
})

test("未跑成的补跑只写计划或取消时间，不写实际", () => {
  const timeout = catchUpWhenCopy({
    code: "catch_up_approval_timeout",
    scheduled: "今天 08:00",
    actual: "今天 12:00",
    hasCancelTime: true,
    t: zhT
  })
  assert.equal(timeout, "计划 今天 08:00 · 今天 12:00 取消")
  assert.equal(timeout.includes("实际"), false)
  const interrupted = catchUpWhenCopy({
    code: "interrupted_by_restart",
    scheduled: "今天 08:00",
    actual: "今天 08:00",
    hasCancelTime: false,
    t: zhT
  })
  assert.equal(interrupted, "计划 今天 08:00")
  assert.equal(interrupted.includes("实际"), false)
  assert.equal(
    catchUpWhenCopy({
      scheduled: "今天 08:00",
      actual: "今天 09:12",
      hasCancelTime: true,
      t: zhT
    }),
    "计划 今天 08:00 · 实际 今天 09:12"
  )
})

test("Dock 来源句：补跑与准点", () => {
  assert.equal(
    automationSourceCopy({ automationName: "晨间待办整理", isCatchUp: true }, zhT),
    "来自自动化「晨间待办整理」的补跑"
  )
  assert.equal(
    automationSourceCopy({ automationName: "晨间待办整理", isCatchUp: false }, zhT),
    "来自自动化「晨间待办整理」"
  )
  assert.match(
    automationSourceCopy({ automationName: "Morning", isCatchUp: true }, enT) ?? "",
    /Catch-up.*Morning/
  )
  assert.equal(automationSourceCopy({ automationName: "  ", isCatchUp: true }, zhT), null)
})
