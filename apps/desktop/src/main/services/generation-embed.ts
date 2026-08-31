/**
 * ai.generate 的 embedding / rerank：走 Knowledge 向量或本地词袋，不再只发 warning。
 */
import type { BrowserWindow } from "electron"
import { embedQuery, embedTexts } from "@enjoy-agents/agent-core"
import { createEmbeddingModel, defaultEmbeddingModelId } from "@enjoy-agents/providers"
import { stampAndSend } from "./event-bus"
import { searchKnowledge } from "./knowledge-service"
import { getActiveProfile, readSecret } from "./secrets"

export async function runEmbeddingKind(
  window: BrowserWindow,
  runId: string,
  sessionId: string,
  prompt: string | undefined
) {
  const texts = (prompt ?? "").split("\n").map((line) => line.trim()).filter(Boolean)
  const model = await embeddingModel()
  if (!model || texts.length === 0) {
    stampAndSend(
      window,
      {
        type: "generation.warning",
        runId,
        code: "embedding",
        message: texts.length === 0 ? "Embedding needs a prompt." : "No embedding model; using Knowledge hashed vectors on index."
      },
      sessionId
    )
    return
  }
  const vectors = texts.length === 1 ? [await embedQuery(model.model, texts[0])] : await embedTexts(model.model, texts)
  const dims = (vectors ?? []).filter(Boolean).map((item) => (item as number[]).length)
  stampAndSend(
    window,
    {
      type: "structured.delta",
      runId,
      partial: { modelId: model.modelId, count: dims.length, dimensions: dims[0] ?? 0 }
    },
    sessionId
  )
}

export async function runRerankKind(
  window: BrowserWindow,
  runId: string,
  sessionId: string,
  workspaceId: string | undefined,
  prompt: string | undefined
) {
  if (!workspaceId || !prompt?.trim()) {
    stampAndSend(
      window,
      {
        type: "generation.warning",
        runId,
        code: "rerank",
        message: "Rerank needs workspaceId and a query prompt. Use Knowledge search with rerank=true."
      },
      sessionId
    )
    return
  }
  const hits = await searchKnowledge(workspaceId, prompt.trim(), 8, true)
  stampAndSend(window, { type: "structured.delta", runId, partial: { hits } }, sessionId)
}

async function embeddingModel() {
  const secret = await readSecret()
  const active = await getActiveProfile()
  if (!secret && !active) return null
  const kind = active?.kind ?? secret?.provider ?? "custom"
  const modelId = defaultEmbeddingModelId(kind, active?.modelId)
  return {
    modelId,
    model: createEmbeddingModel({
      provider: kind,
      apiKey: secret?.apiKey ?? "",
      modelId,
      baseURL: active?.baseURL ?? secret?.baseURL
    })
  }
}
