/**
 * leo S1 / luna：迁移同号异名（MIGRATION_VERSION_CONFLICT）时别裸崩——弹人话对话框：
 * 「复制详情」（原始错误 + 版本 + 库路径进剪贴板）/「打开数据文件夹」/「退出」，前两个做完回到对话框，直到退出。
 * 正文不出现「迁移」和原始错误；回车 = 退出。其它打开库的错误照常抛。
 * 语言：库里的语言偏好此时读不到（库打不开），按 ENJOY_E2E_LANG → 系统语言（en*→英文）→ 默认中文。
 */
export type ConflictLocale = "zh" | "en"

export type MessageBoxOptions = {
  type: "error"
  title: string
  message: string
  detail?: string
  buttons: string[]
  defaultId: number
  cancelId: number
  noLink: boolean
}

export type MigrationGuardDeps = {
  open: () => unknown
  showMessageBoxSync: (options: MessageBoxOptions) => number
  writeClipboard: (text: string) => void
  openPath: (path: string) => void
  exit: (code: number) => void
  userDataPath: string
  dbPath: string
  appVersion: string
  locale: ConflictLocale
}

export const BUTTON_COPY = 0
export const BUTTON_OPEN_FOLDER = 1
export const BUTTON_QUIT = 2

const COPY: Record<ConflictLocale, { title: string; message: string; buttons: string[] }> = {
  zh: {
    title: "Enjoy 打不开本地数据",
    message:
      "这份数据来自另一个测试版，和当前版本对不上。数据没有被改动。可以换回原来的版本打开，或把详情发给我们。",
    buttons: ["复制详情", "打开数据文件夹", "退出"]
  },
  en: {
    title: "Enjoy can't open your local data",
    message:
      "This data comes from a different test build and doesn't match this version. Your data has not been changed. You can reopen it with the original version, or send us the details.",
    buttons: ["Copy details", "Open data folder", "Quit"]
  }
}

export function isMigrationConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("MIGRATION_VERSION_CONFLICT")
}

export function conflictLocale(envLang: string | undefined, systemLocale: string): ConflictLocale {
  if (envLang === "zh" || envLang === "en") return envLang
  return systemLocale.toLowerCase().startsWith("en") ? "en" : "zh"
}

export function conflictDialogOptions(locale: ConflictLocale): MessageBoxOptions {
  const copy = COPY[locale]
  return {
    type: "error",
    title: copy.title,
    message: copy.message,
    buttons: copy.buttons,
    defaultId: BUTTON_QUIT,
    cancelId: BUTTON_QUIT,
    noLink: true
  }
}

export function conflictDetails(error: Error, deps: Pick<MigrationGuardDeps, "dbPath" | "appVersion">): string {
  return [
    error.message,
    `app version: ${deps.appVersion}`,
    `platform: ${process.platform} ${process.arch}`,
    `database: ${deps.dbPath}`
  ].join("\n")
}

/** 返回 false 表示已弹框并退出，调用方不要再继续启动。 */
export function openDatabaseOrExit(deps: MigrationGuardDeps): boolean {
  try {
    deps.open()
    return true
  } catch (error) {
    if (!isMigrationConflict(error)) throw error
    const options = conflictDialogOptions(deps.locale)
    const details = conflictDetails(error as Error, deps)
    for (;;) {
      const choice = deps.showMessageBoxSync(options)
      if (choice === BUTTON_COPY) deps.writeClipboard(details)
      else if (choice === BUTTON_OPEN_FOLDER) deps.openPath(deps.userDataPath)
      else break
    }
    deps.exit(1)
    return false
  }
}
