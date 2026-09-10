/**
 * 本机 CLI 配置写入的纯格式工具：TOML 转义与可逆标记块。
 */

export const ENJOY_TOML_BEGIN = "# --- enjoy-agents:begin ---"
export const ENJOY_TOML_END = "# --- enjoy-agents:end ---"

export function backupPathFor(configPath: string): string {
  return `${configPath}.enjoy.bak`
}

export function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
}

export function sanitizeTomlComment(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 80)
}

export function stripEnjoyTomlBlock(text: string): string {
  const start = text.indexOf(ENJOY_TOML_BEGIN)
  if (start < 0) return text
  const finish = text.indexOf(ENJOY_TOML_END, start)
  if (finish < 0) return text.slice(0, start).trimEnd()
  const after = text.slice(finish + ENJOY_TOML_END.length).replace(/^\n/, "")
  const before = text.slice(0, start).trimEnd()
  return `${before}${before && after ? "\n" : ""}${after}`.replace(/^\n/, "")
}

export function mergeCodexToml(
  existing: string,
  input: {
    baseUrl: string
    profileName: string
    model?: string
    wireApi?: "responses" | "chat"
  }
): string {
  const base = stripEnjoyTomlBlock(existing).trimEnd()
  const wireApi = input.wireApi ?? "responses"
  const lines = [
    ENJOY_TOML_BEGIN,
    `# provider: ${sanitizeTomlComment(input.profileName)}`,
    `model_provider = "enjoy"`
  ]
  if (input.model?.trim()) lines.push(`model = "${escapeTomlString(input.model.trim())}"`)
  lines.push(
    `[model_providers.enjoy]`,
    `name = "${escapeTomlString(input.profileName)}"`,
    `base_url = "${escapeTomlString(input.baseUrl)}"`,
    `env_key = "OPENAI_API_KEY"`,
    `wire_api = "${wireApi}"`,
    `requires_openai_auth = false`,
    ENJOY_TOML_END,
    ""
  )
  const block = lines.join("\n")
  return base ? `${base}\n\n${block}` : block
}

export const ENJOY_ENV_BEGIN = "# --- enjoy-agents:begin ---"
export const ENJOY_ENV_END = "# --- enjoy-agents:end ---"

export function stripEnjoyEnvBlock(text: string): string {
  const start = text.indexOf(ENJOY_ENV_BEGIN)
  if (start < 0) return text
  const finish = text.indexOf(ENJOY_ENV_END, start)
  if (finish < 0) return text.slice(0, start).trimEnd()
  const after = text.slice(finish + ENJOY_ENV_END.length).replace(/^\n/, "")
  const before = text.slice(0, start).trimEnd()
  return `${before}${before && after ? "\n" : ""}${after}`.replace(/^\n/, "")
}

export function mergeGeminiEnv(
  existing: string,
  input: { apiKey: string; baseUrl?: string; model?: string }
): string {
  const base = stripEnjoyEnvBlock(existing).trimEnd()
  const lines = [ENJOY_ENV_BEGIN, `GEMINI_API_KEY=${input.apiKey.replace(/\n/g, "")}`]
  if (input.baseUrl?.trim()) {
    lines.push(`GEMINI_API_BASE_URL=${input.baseUrl.trim()}`)
    lines.push(`GEMINI_BASE_URL=${input.baseUrl.trim()}`)
  }
  if (input.model?.trim()) lines.push(`GEMINI_MODEL=${input.model.trim()}`)
  lines.push(ENJOY_ENV_END, "")
  const block = lines.join("\n")
  return base ? `${base}\n\n${block}` : block
}

export function mergeOpenCodeJson(
  existing: string,
  input: { name: string; baseUrl: string; model?: string; npm: string }
): string {
  const parsed = parseJsonObject(existing)
  const providers = isPlainRecord(parsed.provider) ? parsed.provider : {}
  providers.enjoy = {
    npm: input.npm,
    name: input.name,
    options: {
      baseURL: input.baseUrl,
      apiKey: "{env:ENJOY_OPENCODE_KEY}"
    }
  }
  parsed.provider = providers
  if (input.model?.trim()) parsed.model = `enjoy/${input.model.trim()}`
  return `${JSON.stringify(parsed, null, 2)}\n`
}

function parseJsonObject(text: string): Record<string, unknown> {
  if (!text.trim()) return {}
  try {
    const parsed = JSON.parse(text) as unknown
    return isPlainRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
