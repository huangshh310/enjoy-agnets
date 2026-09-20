/**
 * 会话阶段总结：有 Enjoy 模型走 LLM，否则启发式。菜单要能区分两种。
 */
import { generateText } from "ai"
import { storeSessionRecap } from "@enjoy-agents/ipc-contract/session-recap-kind"
import { stripTitleSource } from "@enjoy-agents/ipc-contract/session-title"
import { createLanguageModel } from "@enjoy-agents/providers"
import { getActiveProfile } from "./secrets"
import { heuristicRecap } from "./session-recap-heuristic"
import { listMessages, patchSession } from "./session-queries"

export { heuristicRecap }

export type GeneratedRecap = {
  recap: string
  heuristic: boolean
}

export async function generateSessionRecap(sessionId: string): Promise<GeneratedRecap> {
  const messages = await listMessages(sessionId)
  if (messages.length === 0) {
    return persistRecap(sessionId, "会话尚未开始交流。", true)
  }

  const promptText = messages
    .slice(-10)
    .map((row) => `[${row.role.toUpperCase()}]: ${stripTitleSource(row.content)}`)
    .join("\n\n")

  const fromModel = await tryModelRecap(promptText)
  return persistRecap(sessionId, fromModel || heuristicRecap(messages), !fromModel)
}

async function persistRecap(
  sessionId: string,
  recap: string,
  heuristic: boolean
): Promise<GeneratedRecap> {
  const stored = storeSessionRecap(recap, heuristic)
  await patchSession({ id: sessionId, recap: stored })
  return { recap: stored, heuristic }
}

async function tryModelRecap(promptText: string): Promise<string> {
  try {
    const profile = await getActiveProfile()
    if (!profile?.apiKey?.trim()) return ""
    const model = createLanguageModel({
      provider: profile.kind,
      apiKey: profile.apiKey,
      baseURL: profile.baseURL,
      modelId: profile.fastModelId || profile.modelId,
      apiStyle: profile.apiStyle
    })
    const res = await generateText({
      model,
      abortSignal: AbortSignal.timeout(10_000),
      instructions:
        "You write a concise 2-3 sentence milestone recap of this agent session in Simplified Chinese. Focus on: primary goal, progress made so far, and next step.",
      prompt: promptText
    })
    return res.text?.trim() || ""
  } catch {
    return ""
  }
}
