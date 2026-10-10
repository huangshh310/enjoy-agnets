/**
 * E2E stub：ai.generate 不调真实模型。结构化 / 文本 / 生图走固定事件。
 */
import type { BrowserWindow } from "electron"
import { updateRun } from "@enjoy-agents/db"
import { AiGenerateInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { stampAndSend } from "./event-bus"
import { createId } from "./ids"
import { importAsset } from "./asset-service"
import { rememberGenerationRun } from "./persist-run"
import { recordMetric } from "./telemetry-service"

export async function startE2eGeneration(
  window: BrowserWindow,
  request: ReturnType<typeof AiGenerateInput.parse>,
  existingRunId?: string
) {
  const runId = existingRunId ?? createId("run")
  rememberGenerationRun({ runId, request })
  stampAndSend(
    window,
    { type: "run.start", runId, sessionId: request.sessionId, kind: request.kind },
    request.sessionId
  )
  // 先返回 runId，让 renderer 订上事件再吐 structured.delta，否则 Extract 永远等不到 stub-card。
  setTimeout(() => {
    void finishE2eGeneration(window, runId, request)
  }, 0)
  return { runId, kind: request.kind }
}

async function finishE2eGeneration(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>
) {
  const started = Date.now()
  try {
    await emitStubKind(window, runId, request)
    updateRun(getDatabase(), runId, { status: "completed", checkpoint: null })
    recordMetric({
      runId,
      kind: request.kind,
      modelId: request.modelId,
      status: "completed",
      durationMs: Date.now() - started,
      ttfoMs: 1
    })
    stampAndSend(
      window,
      { type: "run.end", runId, kind: request.kind, turn: { workflow: "todo", attention: "complete" } },
      request.sessionId
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateRun(getDatabase(), runId, { status: "failed", error: message, checkpoint: null })
    recordMetric({
      runId,
      kind: request.kind,
      modelId: request.modelId,
      status: "failed",
      durationMs: Date.now() - started
    })
    stampAndSend(
      window,
      {
        type: "run.error",
        runId,
        kind: request.kind,
        message,
        turn: { workflow: "todo", attention: "error" }
      },
      request.sessionId
    )
  }
}

async function emitStubKind(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>
) {
  if (request.kind === "structured-object" || request.kind === "structured-array") {
    stampAndSend(
      window,
      {
        type: "structured.delta",
        runId,
        partial:
          request.kind === "structured-array"
            ? [{ title: "stub-card" }]
            : { title: "stub-card", summary: "from e2e stub", items: ["one"] }
      },
      request.sessionId
    )
    return
  }
  if (request.kind === "image") {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
    const asset = await importAsset({
      name: "stub.png",
      mediaType: "image/png",
      bytesBase64: png.toString("base64")
    })
    stampAndSend(
      window,
      {
        type: "asset.created",
        runId,
        assetId: asset.id,
        mediaType: "image/png",
        name: "stub.png",
        size: png.byteLength
      },
      request.sessionId
    )
    return
  }
  const text = request.kind === "translation" ? "stub-translated" : "stub-title"
  stampAndSend(window, { type: "text.delta", runId, text }, request.sessionId)
}
