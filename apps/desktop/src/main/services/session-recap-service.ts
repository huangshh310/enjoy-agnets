/**
 * 会话阶段总结 (Session Milestone Recap)：提取历史要点并落库。
 */
import { generateText } from "ai"
import { createLanguageModel } from "@enjoy-agents/providers"
import { getActiveProfile } from "./secrets"
import { listMessages, patchSession } from "./session-queries"

export async function generateSessionRecap(sessionId: string): Promise<string> {
  const messages = await listMessages(sessionId)
  if (messages.length === 0) {
    const emptyRecap = "会话尚未开始交流。"
    await patchSession({ id: sessionId, recap: emptyRecap })
    return emptyRecap
  }

  const promptText = messages
    .slice(-10)
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n")

  let recapText = ""
  try {
    const profile = await getActiveProfile()
    if (profile?.apiKey?.trim()) {
      const model = createLanguageModel({
        provider: profile.kind,
        apiKey: profile.apiKey,
        baseURL: profile.baseURL,
        modelId: profile.fastModelId || profile.modelId,
        apiStyle: profile.apiStyle
      })

      const res = await generateText({
        model,
        abortSignal: AbortSignal.timeout(10000),
        instructions:
          "You write a concise 2-3 sentence milestone recap of this agent session in Simplified Chinese. Focus on: primary goal, progress made so far, and next step.",
        prompt: promptText
      })
      recapText = res.text?.trim() || ""
    }
  } catch {
    // LLM 回退到启发式规则
  }

  if (!recapText) {
    const firstUser = messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? ""
    const count = messages.length
    recapText = `目标：「${firstUser}…」，已推进 ${count} 轮交互。`
  }

  await patchSession({ id: sessionId, recap: recapText })
  return recapText
}
