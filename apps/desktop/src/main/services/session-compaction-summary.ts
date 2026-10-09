/**
 * 压缩摘要：优先用当前档案的 fast/主模型 generateText，失败回落 undefined。
 */
import { generateText } from "ai"
import { createLanguageModel, languageConfigFromProfile } from "@enjoy-agents/providers"
import type { MessageLike } from "@enjoy-agents/agent-core/compaction"
import { getActiveProfile } from "./secrets"

/** 尝试调用已配置模型写事实摘要；失败时让调用方走规则抽取。 */
export async function generateAiSummary(olderMessages: MessageLike[]): Promise<string | undefined> {
  try {
    const profile = await getActiveProfile()
    if (!profile?.apiKey?.trim()) return undefined

    const model = createLanguageModel(languageConfigFromProfile(profile, profile.fastModelId || profile.modelId))

    const textToSummarize = olderMessages
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n\n")

    const res = await generateText({
      model,
      abortSignal: AbortSignal.timeout(8000),
      instructions: [
        "You compact prior chat history into a factual summary for the next model turn.",
        "Keep: user goals, constraints, technical decisions, file paths, fixed/open bugs, remaining todos.",
        "Drop: greetings, verbose logs, repeated steps.",
        "Output concise Markdown bullets. Stay under 300 words."
      ].join("\n"),
      prompt: textToSummarize
    })

    return res.text?.trim() || undefined
  } catch {
    return undefined
  }
}
