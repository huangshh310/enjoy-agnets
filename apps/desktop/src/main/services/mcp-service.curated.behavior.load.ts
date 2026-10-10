/**
 * 精选 MCP upsert 行为测试：动态加载生产模块，避开 ACP。
 */
export { getDatabase } from "./database.ts"
export { handleMcpUpsert, listServers, upsertServer } from "./mcp-service.ts"
