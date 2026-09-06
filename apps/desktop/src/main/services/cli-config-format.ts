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
  input: { baseUrl: string; apiKey: string; profileName: string }
): string {
  const base = stripEnjoyTomlBlock(existing).trimEnd()
  const block = [
    ENJOY_TOML_BEGIN,
    `# provider: ${sanitizeTomlComment(input.profileName)}`,
    `model_provider = "custom"`,
    `base_url = "${escapeTomlString(input.baseUrl)}"`,
    `api_key = "${escapeTomlString(input.apiKey)}"`,
    ENJOY_TOML_END,
    ""
  ].join("\n")
  return base ? `${base}\n\n${block}` : block
}
