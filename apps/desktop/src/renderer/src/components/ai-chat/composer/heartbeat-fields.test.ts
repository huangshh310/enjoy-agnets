/**
 * 会话心跳空态走人话预设，不要再甩 cron 占位 `0 9 * * *`。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { scheduleFromCron } from "../../automations/lib/schedule-preset.ts"
import { emptyHeartbeatDraft } from "./heartbeat-draft.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("空心跳草稿是每天 09:00，不是给用户看的 cron 占位", () => {
  const draft = emptyHeartbeatDraft()
  const parsed = scheduleFromCron(draft.cronExpr)
  assert.equal(parsed.preset, "daily")
  assert.equal(parsed.hour, 9)
  assert.equal(parsed.minute, 0)
})

test("心跳表单复用自动化抽屉 ScheduleFields，不再画 cron 输入", () => {
  const fields = readFileSync(join(dir, "heartbeat-fields.tsx"), "utf8")
  assert.match(fields, /ScheduleFields/)
  assert.match(fields, /session-heartbeat-schedule/)
  assert.doesNotMatch(fields, /heartbeatCadence/)
  assert.doesNotMatch(fields, /session-heartbeat-cron/)
  assert.doesNotMatch(fields, /placeholder=\{t\("chat\.heartbeatCadence"\)\}/)
})
