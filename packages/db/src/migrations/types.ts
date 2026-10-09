/**
 * SQLite 迁移描述：版本号、说明、SQL 或按列存在性执行的 apply。
 */
import type { DatabaseSync } from "node:sqlite"

export type Migration = {
  version: number
  name: string
  sql?: string
  apply?: (sqlite: DatabaseSync) => void
}
