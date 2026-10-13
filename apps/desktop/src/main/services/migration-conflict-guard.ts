/**
 * leo S1：迁移同号异名（MIGRATION_VERSION_CONFLICT）时别裸崩——弹错误框说明后退出。
 * 其它打开库的错误照常抛。
 */
export type MigrationGuardDeps = {
  open: () => unknown
  showErrorBox: (title: string, content: string) => void
  exit: (code: number) => void
}

export function isMigrationConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("MIGRATION_VERSION_CONFLICT")
}

/** 返回 false 表示已弹框并退出，调用方不要再继续启动。 */
export function openDatabaseOrExit(deps: MigrationGuardDeps): boolean {
  try {
    deps.open()
    return true
  } catch (error) {
    if (!isMigrationConflict(error)) throw error
    deps.showErrorBox(
      "数据库版本冲突",
      `本地数据库记录的迁移与当前版本不一致，为避免损坏数据已停止启动。\n请安装最新版本后再打开，或把下面的信息发给开发者：\n\n${(error as Error).message}`
    )
    deps.exit(1)
    return false
  }
}
