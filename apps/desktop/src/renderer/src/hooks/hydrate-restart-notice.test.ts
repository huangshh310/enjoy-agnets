import assert from "node:assert/strict"
import { test } from "node:test"
import { RESTART_ABANDONED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import {
  RESTORE_INTERRUPTED_RUNNING,
  RESTORE_NO_MATCHING_CODE
} from "@enjoy-agents/ipc-contract/restore-codes"
import {
  consumeRestartNotice,
  keepRestoreFamilyNotice,
  latestAssistantRestartAbandoned,
  noticeAfterRestartHydrate,
  rememberRestartNotice,
  resetRestartNoticeForTest
} from "./hydrate-restart-notice.ts"

const abandoned = {
  role: "assistant" as const,
  tools: [
    {
      id: "t1",
      name: "write_file",
      state: "output-error" as const,
      result: { code: RESTART_ABANDONED_CODE, decision: "cancelled" }
    }
  ]
}

test.beforeEach(() => {
  resetRestartNoticeForTest()
})

test("冷启动回灌：有记住的真实码才补，不发明 interrupted", () => {
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_1",
      sameSession: false,
      running: false,
      notice: null,
      messages: [{ role: "user", tools: [] }, abandoned]
    }),
    null
  )
  rememberRestartNotice("ses_1", RESTORE_NO_MATCHING_CODE)
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_1",
      sameSession: false,
      running: false,
      notice: null,
      messages: [{ role: "user", tools: [] }, abandoned]
    }),
    RESTORE_NO_MATCHING_CODE
  )
})

test("已展示过则下次冷启动不再补", () => {
  rememberRestartNotice("ses_2", RESTORE_INTERRUPTED_RUNNING)
  consumeRestartNotice("ses_2")
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_2",
      sameSession: false,
      running: false,
      notice: null,
      messages: [abandoned]
    }),
    null
  )
})

test("已有 notice / 同会话 / 仍在跑 不覆盖", () => {
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_3",
      sameSession: false,
      running: false,
      notice: RESTORE_NO_MATCHING_CODE,
      messages: [abandoned]
    }),
    RESTORE_NO_MATCHING_CODE
  )
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_3",
      sameSession: true,
      running: false,
      notice: null,
      messages: [abandoned]
    }),
    null
  )
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_3",
      sameSession: false,
      running: true,
      notice: null,
      messages: [abandoned]
    }),
    null
  )
})

test("最新助手行不是重启放弃则不补", () => {
  rememberRestartNotice("ses_4", RESTORE_INTERRUPTED_RUNNING)
  assert.equal(latestAssistantRestartAbandoned([{ role: "assistant", tools: [] }]), false)
  assert.equal(
    noticeAfterRestartHydrate({
      sessionId: "ses_4",
      sameSession: false,
      running: false,
      notice: null,
      messages: [{ role: "assistant", tools: [] }]
    }),
    null
  )
})

test("idle 只保住回挂家族 notice", () => {
  assert.equal(keepRestoreFamilyNotice(RESTORE_INTERRUPTED_RUNNING), RESTORE_INTERRUPTED_RUNNING)
  assert.equal(keepRestoreFamilyNotice(RESTORE_NO_MATCHING_CODE), RESTORE_NO_MATCHING_CODE)
  assert.equal(keepRestoreFamilyNotice("user_aborted"), null)
  assert.equal(keepRestoreFamilyNotice(null), null)
})
