/**
 * 「从这里重来」弹窗的文案与按钮（luna 定稿，按实际行为写）：
 * - Git 工作区：取消 · 连文件一起还原（次级描边）· 只改聊天（主按钮，最右）；正文下面一行灰字提示可以连文件还原。
 * - 非 Git 工作区（审查面板同一份 gitRepo === false）：不给还原按钮，取消 · 从这里重来。
 * - 还原要删本轮新建的文件：二次确认，最多列 5 个，其余折成「还有 N 个」；拿不到 N 换不带数字的标题。
 * - 还原失败：弹窗里一行灰字兜底，不显示原始错误；聊天没动。
 * 全文不出现 检查点 / HEAD / commit / 快照 / checkpoint。
 */

type Translate = (key: string, vars?: Record<string, string | number>) => string

export type RewindDialogState =
  | {
      kind: "confirm"
      /** 引擎能不能回滚对话（目前只有 Enjoy 本地）。 */
      canRestoreFiles: boolean
      /** 来自 workspace.changes 的 gitRepo；null = 还不知道，按 Git 处理（失败有兜底）。 */
      gitRepo: boolean | null
      /** 上一次「连文件一起还原」没成功。 */
      restoreFailed: boolean
    }
  | { kind: "untracked"; files: string[] | null }

export type RewindButtonId = "cancel" | "restore-files" | "chat-only" | "start-over" | "delete-and-restore"

export type RewindButton = {
  id: RewindButtonId
  label: string
  variant: "outline" | "default" | "destructive"
}

export type RewindDialogView = {
  title: string
  body: string
  /** 正文下的灰字（Git 工作区的「也可以连文件还原」）。 */
  hint: string | null
  /** 还原失败的灰字兜底。 */
  failure: string | null
  files: string[]
  moreCount: number
  buttons: RewindButton[]
}

export const REWIND_FILES_SHOWN = 5

/** 弹窗能不能连文件一起还原：引擎支持，且工作区不是明确的非 Git。 */
export function rewindCanRestoreFiles(canRestoreFiles: boolean, gitRepo: boolean | null): boolean {
  return canRestoreFiles && gitRepo !== false
}

export function rewindDialogView(state: RewindDialogState, t: Translate): RewindDialogView {
  const cancel: RewindButton = { id: "cancel", label: t("common.cancel"), variant: "outline" }
  if (state.kind === "untracked") {
    const files = state.files ?? []
    const n = files.length
    const title =
      n === 0
        ? t("chat.rewindConfirmUntrackedTitleUnknown")
        : n === 1
          ? t("chat.rewindConfirmUntrackedTitleOne")
          : t("chat.rewindConfirmUntrackedTitle", { n })
    const shown = files.slice(0, REWIND_FILES_SHOWN)
    return {
      title,
      body: t("chat.rewindConfirmUntrackedBody"),
      hint: null,
      failure: null,
      files: shown,
      moreCount: n - shown.length,
      buttons: [cancel, { id: "delete-and-restore", label: t("chat.rewindConfirmDelete"), variant: "destructive" }]
    }
  }
  const failure = state.restoreFailed ? t("chat.rewindNoCheckpoint") : null
  if (rewindCanRestoreFiles(state.canRestoreFiles, state.gitRepo)) {
    return {
      title: t("chat.rewindDialogTitle"),
      body: t("chat.rewindBody"),
      hint: t("chat.rewindBodyRestoreHint"),
      failure,
      files: [],
      moreCount: 0,
      buttons: [
        cancel,
        { id: "restore-files", label: t("chat.rewindRestoreFiles"), variant: "outline" },
        { id: "chat-only", label: t("chat.rewindChatOnly"), variant: "default" }
      ]
    }
  }
  return {
    title: t("chat.rewindDialogTitle"),
    body: state.gitRepo === false ? t("chat.rewindBodyNotGit") : t("chat.rewindBodyChatOnly"),
    hint: null,
    failure,
    files: [],
    moreCount: 0,
    buttons: [cancel, { id: "start-over", label: t("chat.rewindStartOver"), variant: "default" }]
  }
}

/** 还原阶段的失败（找不到本轮开始前的记录、还原出错）：弹窗用灰字兜底，不报原始错误。 */
export function isRewindRestoreFailure(code: string): boolean {
  if (code === "CHECKPOINT_CONFIRM_REQUIRED") return false
  return (
    code.includes("REWIND_NO_CHECKPOINT") ||
    code.includes("REWIND_NO_WORKSPACE") ||
    code.includes("CHECKPOINT") ||
    code.startsWith("REWIND_RESTORE_FAILED")
  )
}
