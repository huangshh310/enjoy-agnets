/**
 * 从 MCP App postMessage 回包里取出可展示文本。
 */
export function textFromAppMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const res = result as { text?: unknown }
  if (typeof res.text === "string") return res.text
  return null
}
