/**
 * session.truncateFrom 结果的 zod 合约（#167）：通用三种拒绝码 + 引擎不支持回滚；agent.run 共用的码表不变。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  SessionTruncateErrorCode,
  SessionTruncateFromResult,
  SessionTruncateResult,
  TRUNCATE_ROLLBACK_UNSUPPORTED
} from "./session-truncate.ts"

test("SessionTruncateFromResult：成功带 deleted；四种拒绝码都认；别的一律不合约", () => {
  assert.equal(SessionTruncateFromResult.safeParse({ ok: true, deleted: 2 }).success, true)
  for (const code of ["TRUNCATE_STALE_SNAPSHOT", "TRUNCATE_RUN_ACTIVE", "TRUNCATE_MESSAGE_NOT_FOUND", TRUNCATE_ROLLBACK_UNSUPPORTED]) {
    assert.equal(SessionTruncateFromResult.safeParse({ ok: false, code }).success, true, code)
  }
  for (const bad of [{ ok: true }, { ok: false }, { ok: false, code: "NOPE" }, { ok: true, deleted: 1, extra: 1 }, null, "ok", undefined]) {
    assert.equal(SessionTruncateFromResult.safeParse(bad).success, false, JSON.stringify(bad))
  }
})

test("agent.run 共用的 SessionTruncateResult 不收 TRUNCATE_ROLLBACK_UNSUPPORTED", () => {
  assert.equal(SessionTruncateErrorCode.safeParse(TRUNCATE_ROLLBACK_UNSUPPORTED).success, false)
  assert.equal(SessionTruncateResult.safeParse({ ok: false, code: TRUNCATE_ROLLBACK_UNSUPPORTED }).success, false)
})
