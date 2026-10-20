/**
 * 从本机助手导入的会话：记来源（引擎 id），切引擎也不清。
 * 导入的会话在 Enjoy 里没有消息，靠这个标记不被当成空「新对话」在离开 / 启动时删掉。
 */
import { addColumnIfMissing } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const sessionImportedFromMigration: Migration = {
  version: 20,
  name: "session-imported-from",
  apply(sqlite) {
    addColumnIfMissing(sqlite, "sessions", "imported_from", "TEXT")
  }
}
