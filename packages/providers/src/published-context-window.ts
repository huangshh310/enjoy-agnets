/**
 * 厂商价目表点名的上下文窗口。档案和 ACP usage_update.size 都没有时才用。
 * 只认写明的家族：grok-4.6 为 2M，Claude 家族 200k，Gemini 2/3 为 1_048_576，
 * DeepSeek `deepseek-flash` / V4 为 1M。没点名的 id（含 grok-4、grok-4-fast）不猜。
 * https://api-docs.deepseek.com/quick_start/pricing
 */
const RULES: ReadonlyArray<{ pattern: RegExp; window: number }> = [
  { pattern: /grok-4\.6/i, window: 2_000_000 },
  { pattern: /claude|sonnet|opus|haiku/i, window: 200_000 },
  { pattern: /gemini-[23]/i, window: 1_048_576 },
  { pattern: /deepseek-(?:v4(?:\.1)?-)?flash|deepseek-v4-pro/i, window: 1_000_000 }
]

export function publishedContextWindow(modelId: string): number | undefined {
  const id = modelId.trim()
  if (!id) return undefined
  return RULES.find((rule) => rule.pattern.test(id))?.window
}
