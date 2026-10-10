/**
 * 仅 stub + 未打包：发送「huge mcp app」复现超大 MCP App 中性提示。
 */
export const STUB_HUGE_MCP_APP_PROMPT = "huge mcp app"
export const STUB_HUGE_MCP_APP_PROMPT_ZH = "超大 MCP 应用"

export function isStubHugeMcpAppPrompt(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return trimmed === STUB_HUGE_MCP_APP_PROMPT || trimmed === STUB_HUGE_MCP_APP_PROMPT_ZH.toLowerCase()
}

export function shouldEmitHugeMcpApp(prompt: string, packaged = false): boolean {
  return !packaged && isStubHugeMcpAppPrompt(prompt)
}

export function stubHugeMcpAppParts(): Record<string, unknown>[] {
  return [
    {
      type: "mcp.app",
      serverId: "acp",
      resourceUri: "ui://huge-mcp-app",
      phase: "error",
      title: "Huge"
    },
    {
      type: "generation.warning",
      code: "mcp_app_srcdoc_too_large",
      message: "MCP App srcDoc exceeds limit"
    }
  ]
}
