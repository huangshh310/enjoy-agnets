import assert from "node:assert/strict"
import { test } from "node:test"
import { clampGitLogLimit, GIT_LOG_DEFAULT_LIMIT, GIT_LOG_MAX_LIMIT } from "./git-log-limit.ts"

test("缺省与非法值回落默认条数", () => {
  assert.equal(clampGitLogLimit(), GIT_LOG_DEFAULT_LIMIT)
  assert.equal(clampGitLogLimit(Number.NaN), GIT_LOG_DEFAULT_LIMIT)
  assert.equal(clampGitLogLimit(Number.POSITIVE_INFINITY), GIT_LOG_DEFAULT_LIMIT)
})

test("条数钳在 1–100", () => {
  assert.equal(clampGitLogLimit(0), 1)
  assert.equal(clampGitLogLimit(-3), 1)
  assert.equal(clampGitLogLimit(3.9), 3)
  assert.equal(clampGitLogLimit(GIT_LOG_MAX_LIMIT + 40), GIT_LOG_MAX_LIMIT)
  assert.equal(clampGitLogLimit(8), 8)
})
