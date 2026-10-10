/**
 * 精选 MCP 身份：只允许精选安装写入 curated_preset_id。
 */
import { addColumnIfMissing } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const mcpCuratedMigration: Migration = {
  version: 16,
  name: "mcp-curated",
  apply(sqlite) {
    addColumnIfMissing(sqlite, "mcp_servers", "curated_preset_id", "TEXT")
  }
}
