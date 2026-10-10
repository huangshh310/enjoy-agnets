/**
 * 首字前失败码与产出判定。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CLIENT_REQUEST_ID_MAX,
  eventMarksProducedOutput,
  isPreOutputFailureCode,
  PRE_OUTPUT_FAILURE_CODES
} from "./pre-output-failure.ts"

test("PRE_OUTPUT_FAILURE_CODES 含四家供应商码和 no_chat_route", () => {
  assert.deepEqual(PRE_OUTPUT_FAILURE_CODES.options, [
    "credential_invalid",
    "provider_unreachable",
    "provider_forbidden",
    "provider_billing",
    "no_chat_route"
  ])
  for (const code of PRE_OUTPUT_FAILURE_CODES.options) {
    assert.equal(isPreOutputFailureCode(code), true)
  }
  assert.equal(isPreOutputFailureCode("user_aborted"), false)
})

test("开泵前的 source.added 不算产出；开泵后算", () => {
  assert.equal(eventMarksProducedOutput({ type: "source.added" }, false), false)
  assert.equal(eventMarksProducedOutput({ type: "source.added" }, true), true)
  assert.equal(eventMarksProducedOutput({ type: "text.delta" }, false), true)
  assert.equal(eventMarksProducedOutput({ type: "reasoning.delta" }, false), true)
  assert.equal(eventMarksProducedOutput({ type: "tool.start" }, false), true)
  assert.equal(eventMarksProducedOutput({ type: "approval.required" }, false), true)
  assert.equal(eventMarksProducedOutput({ type: "run.error" }, true), false)
})

test("clientRequestId 上限 80", () => {
  assert.equal(CLIENT_REQUEST_ID_MAX, 80)
})
