/**
 * 上游协议。同一套 Key / URL 可能走 Chat、Messages 或 Responses，由配置决定。
 */
export const API_STYLES = ["openai", "anthropic", "openai-responses"] as const

export type ApiStyle = (typeof API_STYLES)[number]

export type ApiStyleOption = {
  id: ApiStyle
  name: string
  hint: string
}

export const API_STYLE_OPTIONS: ApiStyleOption[] = [
  { id: "openai", name: "OpenAI Chat Completions", hint: "/v1/chat/completions" },
  { id: "anthropic", name: "Anthropic Messages", hint: "/v1/messages" },
  { id: "openai-responses", name: "OpenAI Responses", hint: "/v1/responses" }
]

export function isApiStyle(value: string | undefined): value is ApiStyle {
  return Boolean(value && (API_STYLES as readonly string[]).includes(value))
}

export function apiStyleLabel(style: ApiStyle): string {
  return API_STYLE_OPTIONS.find((item) => item.id === style)?.name ?? style
}
