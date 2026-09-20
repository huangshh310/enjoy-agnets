/**
 * Enjoy #/mcp → ACP session/new mcpServers。未信任 / deny / 解析失败的丢掉。
 * 本机 stdio 解析成绝对路径；SSH 用远端 `command -v`，禁止把本机 abs 塞给远端 CLI。
 */
import type { AcpMcpServer } from "@enjoy-agents/agent-harness/acp-mcp"
import { reportHostMcp } from "./host-mcp-report.ts"

export async function projectHostMcp(input: {
  enabled: boolean
  ssh: boolean
  lookupRemoteBin?: (bin: string) => Promise<string | undefined>
}): Promise<AcpMcpServer[]> {
  return (await reportHostMcp(input)).servers
}
