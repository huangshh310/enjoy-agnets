/**
 * MCP 服务器配置指纹：叶子文件，node:test 可直接 value-import。
 */
export function mcpServerConfigFingerprint(server: {
  transport?: string | null
  command?: string | null
  url?: string | null
  envRef?: string | null
}): string {
  return [server.transport ?? "", server.command ?? "", server.url ?? "", server.envRef ?? ""].join("\0")
}
