/**
 * 检索知识库并把引用发到 UI。只塞片段，不整篇进 prompt。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { stampAndSend } from "./event-bus"
import { searchKnowledge } from "./knowledge-service"

export async function citeKnowledge(options: {
  window: BrowserWindow
  runId: string
  sessionId: string
  workspaceId: string
  query: string
}): Promise<{ messages: ModelMessage[]; sources: CitedSource[] }> {
  const { hits } = await searchKnowledge(options.workspaceId, options.query, 6)
  const sources: CitedSource[] = []
  for (const hit of hits) {
    stampAndSend(
      options.window,
      {
        type: "source.added",
        runId: options.runId,
        sourceId: hit.sourceId || hit.chunkId,
        title: hit.path,
        path: hit.path,
        startLine: hit.startLine,
        endLine: hit.endLine,
        snippet: hit.snippet,
        ...(Number.isFinite(hit.score) ? { score: hit.score } : {})
      },
      options.sessionId
    )
    sources.push({
      sourceId: hit.sourceId || hit.chunkId,
      title: hit.path,
      path: hit.path,
      startLine: hit.startLine,
      endLine: hit.endLine,
      snippet: hit.snippet
    })
  }
  if (hits.length === 0) return { messages: [], sources }
  const lines = hits.map((hit) => `- ${hit.path}:${hit.startLine ?? 0} ${hit.snippet}`)
  return {
    messages: [{ role: "user", content: `Cite these workspace sources:\n${lines.join("\n")}` }],
    sources
  }
}

export type CitedSource = {
  sourceId: string
  title: string
  path: string
  startLine?: number
  endLine?: number
  snippet?: string
}
