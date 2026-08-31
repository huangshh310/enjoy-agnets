/**
 * Google Gemini：默认走官方 @ai-sdk/google；带 /openai 的兼容端点仍走 OpenAI 工厂。
 */
export function usesOfficialGoogle(config: { provider: string; baseURL?: string }): boolean {
  if (config.provider !== "google") return false
  const url = (config.baseURL ?? "").toLowerCase()
  if (!url) return true
  return !url.includes("/openai")
}
