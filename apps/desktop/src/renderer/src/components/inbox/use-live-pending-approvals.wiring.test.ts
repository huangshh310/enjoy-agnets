/**
 * 源码钉（hook 不在 node:test 里渲染）：收件箱 / 侧栏角标除了 Attention 槽，还跟「未决相关事件」的节拍重拉，
 * 节拍在 dispatchAgentEvent 里排在被停那一轮的丢弃之前敲（jojo 54a533a2 B：停止后角标挂着点不掉）。
 * 行为见 main/services/stop-approval-inbox.behavior.test.ts。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("use-live-pending-approvals：节拍进 selector，也进重拉的依赖", () => {
  const src = read("./use-live-pending-approvals.ts")
  assert.match(src, /const pendingEpoch = useInboxPendingEpoch\(\(state\) => state\.epoch\)\r?\n/)
  assert.match(src, /useEffect\(\(\) => \{\r?\n\s+refresh\(\)\r?\n\s+\}, \[refresh, attentionTick, pendingEpoch\]\)/)
})

test("dispatchAgentEvent：先敲节拍，再丢被停那一轮的迟到事件", () => {
  const src = read("../../stores/attention/dispatch-agent-event.ts")
  assert.match(
    src,
    /export function dispatchAgentEvent\(event: StreamEvent\): void \{\r?\n(\s*\/\/[^\r\n]*\r?\n)*\s*noteInboxPendingEvent\(event\)\r?\n\s*\/\/[^\r\n]*\r?\n\s*if \(isLateEventOfStoppedRun\(event\)\) return/
  )
})
