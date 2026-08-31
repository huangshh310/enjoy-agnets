/**
 * SQLite 迁移描述：版本号、说明、SQL。
 */
export type Migration = {
  version: number
  name: string
  sql: string
}
