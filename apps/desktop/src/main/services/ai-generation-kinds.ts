/**
 * ai.generate 各 kind 的执行体；超时与落库由 ai-generation 包一层。
 */
import type { BrowserWindow } from "electron"
import {
  generateStructuredRepaired,
  streamPlainText,
  streamStructuredPartials,
  toZodSchema
} from "@enjoy-agents/agent-core"
import { AiGenerateInput } from "@enjoy-agents/ipc-contract"
import { createLanguageModel, wrapWithDefaults, type ProviderConfig } from "@enjoy-agents/providers"
import { stampAndSend } from "./event-bus"
import { runEmbeddingKind, runRerankKind } from "./generation-embed"
import { runMediaKind } from "./media-generation"
import { mapStreamPart } from "./stream-parts"
import { getActiveProfile, readSecret } from "./secrets"
import { readPreferences } from "./preferences"
import { toModelMessages } from "./to-model-messages"
import { resumeWorkflow } from "./workflow-runner"
import { assertMediaKindAllowed } from "./media-policy"

export async function executeKind(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>,
  signal: AbortSignal,
  noteFirst: () => void
) {
  if (request.kind === "workflow") {
    await resumeWorkflow(runId)
    return
  }
  if (isMediaKind(request.kind)) {
    assertMediaKindAllowed(request.kind)
    await runMediaKind({
      window,
      runId,
      sessionId: request.sessionId,
      kind: request.kind,
      prompt: request.prompt,
      attachments: request.attachments,
      config: await requireProviderConfig(request.modelId),
      persistChat: Boolean(request.messages?.length),
      abortSignal: signal
    })
    noteFirst()
    return
  }
  if (request.kind === "text" || request.kind === "completion") {
    await streamTextKind(window, runId, request, signal, noteFirst)
    return
  }
  if (request.kind === "structured-object" || request.kind === "structured-array") {
    await runStructured(window, runId, request, signal, noteFirst)
    return
  }
  if (request.kind === "embedding") {
    await runEmbeddingKind(window, runId, request.sessionId, request.prompt)
    return
  }
  if (request.kind === "rerank") {
    await runRerankKind(window, runId, request.sessionId, request.workspaceId, request.prompt)
  }
}

async function streamTextKind(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>,
  signal: AbortSignal,
  noteFirst: () => void
) {
  const config = await requireProviderConfig(request.modelId)
  const messages = request.messages?.length ? toModelMessages(request.messages) : undefined
  const result = streamPlainText({
    model: languageModel(config),
    prompt: request.prompt,
    messages,
    abortSignal: signal
  })
  for await (const part of result.fullStream) {
    const mapped = mapStreamPart(part as Record<string, unknown>, runId)
    if (!mapped) continue
    if (mapped.type === "text.delta") noteFirst()
    stampAndSend(window, mapped, request.sessionId)
  }
}

async function runStructured(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>,
  signal: AbortSignal,
  noteFirst: () => void
) {
  const config = await requireProviderConfig(request.modelId)
  const schema = toZodSchema(request.schemaJson)
  const model = languageModel(config)
  const array = request.kind === "structured-array"
  let last: unknown
  try {
    for await (const partial of streamStructuredPartials({
      model,
      prompt: request.prompt ?? "",
      schema,
      abortSignal: signal,
      array
    })) {
      last = partial
      noteFirst()
      stampAndSend(window, { type: "structured.delta", runId, partial }, request.sessionId)
    }
  } catch {
    last = undefined
  }
  if (last !== undefined) return
  const output = await generateStructuredRepaired({
    model,
    prompt: request.prompt ?? "",
    schema,
    abortSignal: signal,
    array
  })
  stampAndSend(window, { type: "structured.delta", runId, partial: output }, request.sessionId)
}

async function requireProviderConfig(modelId: string): Promise<ProviderConfig> {
  const secret = await readSecret()
  const active = await getActiveProfile()
  if (!secret && !active) throw new Error("No provider key configured.")
  return {
    provider: (active?.kind ?? secret?.provider ?? "custom") as ProviderConfig["provider"],
    apiKey: secret?.apiKey ?? active?.apiKey ?? "",
    modelId,
    baseURL: active?.baseURL ?? secret?.baseURL
  }
}

function languageModel(config: ProviderConfig) {
  return wrapWithDefaults(createLanguageModel(config), {
    instructions: readPreferences().customInstructions
  })
}

function isMediaKind(kind: string): boolean {
  return (
    kind === "image" ||
    kind === "speech" ||
    kind === "transcription" ||
    kind === "translation" ||
    kind === "video" ||
    kind === "realtime-session"
  )
}
