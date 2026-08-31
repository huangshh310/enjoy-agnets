/**
 * 桌面 AiRuntime：生成/中止/恢复走现有 main 服务，stream 读同一回放缓冲。
 */
import type { BrowserWindow } from "electron"
import { createBufferedRuntime, type AiRuntime } from "@enjoy-agents/agent-core"
import { startGeneration, abortGeneration, resumeGeneration } from "./ai-generation"
import { decideApproval } from "./agent-runner"
import { replayEventBuffer, streamReplay } from "./event-bus"
import { createId } from "./ids"

/** start 自带 runId（agent 转发 runAgent）；stream 读 event-bus 同一缓冲。 */
export function createDesktopRuntime(window: BrowserWindow): AiRuntime {
  return {
    start: (request) => startGeneration(window, request),
    abort: (runId) => abortGeneration({ runId }).then(() => undefined),
    resume: (runId) => resumeGeneration(window, { runId }).then(() => undefined),
    decideApproval: (input) => decideApproval(window, input).then(() => undefined),
    stream: (runId) => streamReplay(runId)
  }
}

/** 测试或编排层需要自带 execute 时，复用同一套 runId 规则。 */
export function createIdRuntime(
  window: BrowserWindow,
  execute: Parameters<typeof createBufferedRuntime>[0]["execute"]
): AiRuntime {
  return createBufferedRuntime({
    createRunId: () => createId("run"),
    buffer: replayEventBuffer(),
    execute,
    resume: (runId) => resumeGeneration(window, { runId }).then(() => undefined),
    decideApproval: (input) => decideApproval(window, input).then(() => undefined)
  })
}
