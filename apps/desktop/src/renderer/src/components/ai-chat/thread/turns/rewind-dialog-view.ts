/**
 * 「从这里重来」弹窗的文案与按钮（luna 定稿，按实际行为写）：
 * - Git 工作区（gitRepo === true）且引擎能回滚：取消 · 连文件一起还原（次级描边）· 只改聊天（主按钮，最右）；正文下一行灰字提示。
 * - 明确不是 Git（gitRepo === false）：不给还原按钮，取消 · 从这里重来，正文保留「这个文件夹没用 Git 管理…」。
 * - 不知道是不是 Git（gitRepo === null）或引擎不支持回滚：按不安全处理，隐藏还原按钮（不是置灰），中性正文（luna ②）。
 * - 还原要删本轮开始后新出现的文件：二次确认，最多列 5 个，其余折成「还有 N 个」；拿不到 N 换不带数字的标题（luna ③）。
 * - 还原失败分两种：
 *   - missing：找不到本轮开始前的记录 / 列记录出错，什么都没改 → 灰色兜底句（和正文下的提示灰字样式拉开）。
 *   - partial：还原中途出错（REWIND_RESTORE_FAILED），文件可能只还原了一部分 → 琥珀色提示 +「去审查」（luna ①）。
 * - 「结果 → 弹窗下一步」由 rewindOutcome 纯函数决定；任何 code 都只映射到固定文案键，原始错误文本进不了界面。
 * 全文不出现 检查点 / HEAD / commit / 快照 / checkpoint。
 */

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** 还原失败的种类：missing = 什么都没改；partial = 文件可能只还原了一部分。 */
export type RewindFailure = "missing" | "partial"

export type RewindDialogState =
  | {
      kind: "confirm"
      /** 引擎能不能回滚对话（目前只有 Enjoy 本地）。 */
      canRestoreFiles: boolean
      /** 来自 workspace.changes 的 gitRepo；true = Git，false = 明确不是 Git，null = 还不知道（按不安全处理）。 */
      gitRepo: boolean | null
      /** 上一次「连文件一起还原」没成功的种类。 */
      failure: RewindFailure | null
    }
  | { kind: "untracked"; files: string[] | null }

export type RewindButtonId = "cancel" | "restore-files" | "chat-only" | "start-over" | "delete-and-restore"

export type RewindButton = {
  id: RewindButtonId
  label: string
  variant: "outline" | "default" | "destructive"
}

export type RewindFailureView = {
  kind: RewindFailure
  text: string
  /** partial 才有：跟在琥珀色提示后面的文字按钮「去审查」。 */
  reviewLabel: string | null
  /** 重试跑着的时候「去审查」不能点（leo S1：否则会在弹窗背后打开右栏）。 */
  reviewDisabled: boolean
}

export type RewindDialogView = {
  title: string
  body: string
  /** 正文下的灰字（Git 工作区的「也可以连文件还原」）。 */
  hint: string | null
  /** 还原失败的提示（missing 灰色兜底 / partial 琥珀色 + 去审查）。 */
  failure: RewindFailureView | null
  files: string[]
  moreCount: number
  buttons: RewindButton[]
}

export const REWIND_FILES_SHOWN = 5

/** 弹窗能不能连文件一起还原：引擎支持，且明确是 Git 工作区（null 不知道 → 不安全，不给）。 */
export function rewindCanRestoreFiles(canRestoreFiles: boolean, gitRepo: boolean | null): boolean {
  return canRestoreFiles && gitRepo === true
}

export function rewindDialogView(state: RewindDialogState, t: Translate, busy = false): RewindDialogView {
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
  const failure: RewindFailureView | null =
    state.failure === "partial"
      ? {
          kind: "partial",
          text: t("chat.rewindRestorePartial"),
          reviewLabel: t("chat.rewindGoReview"),
          reviewDisabled: busy
        }
      : state.failure === "missing"
        ? { kind: "missing", text: t("chat.rewindNoCheckpoint"), reviewLabel: null, reviewDisabled: busy }
        : null
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

/** 还原阶段失败的种类；不是还原阶段的失败返回 null。 */
export function rewindFailureKind(code: string): RewindFailure | null {
  if (code === "CHECKPOINT_CONFIRM_REQUIRED") return null
  if (code.startsWith("REWIND_RESTORE_FAILED")) return "partial"
  if (
    code.includes("REWIND_NO_CHECKPOINT") ||
    code.includes("REWIND_NO_WORKSPACE") ||
    code.includes("REWIND_LIST_FAILED") ||
    code.includes("CHECKPOINT")
  ) {
    return "missing"
  }
  return null
}

/** 其它失败 → 固定文案键。不认识的 code（包括被当成 code 传上来的原始错误文本）一律用通用句。 */
export function rewindErrorKey(code: string): string {
  if (code.includes("REWIND_BUSY")) return "chat.rewindBusy"
  if (code.includes("REWIND_PROVIDER_UNSUPPORTED")) return "chat.rewindUnsupported"
  if (code.includes("TRUNCATE_MESSAGE_NOT_FOUND")) return "chat.rewindTruncateMissing"
  if (code.includes("TRUNCATE_STALE_SNAPSHOT")) return "chat.truncateStaleSnapshot"
  if (code.includes("TRUNCATE_TAIL_CHANGED")) return "chat.truncateTailChanged"
  if (code.includes("TRUNCATE_RUN_ACTIVE")) return "chat.truncateRunActive"
  if (rewindFailureKind(code)) return "chat.rewindNoCheckpoint"
  return "chat.rewindFailed"
}

export type RewindRunResult = { ok: true } | { ok: false; code: string; untrackedToDelete?: string[] }

/** 一次重来的结果 → 弹窗下一步。弹窗只照这个改状态，不直接碰 code 文本。 */
export type RewindOutcome =
  | { kind: "close" }
  | { kind: "untracked"; files: string[] | null }
  | { kind: "failure"; failure: RewindFailure }
  | { kind: "error"; messageKey: string }

/** rewindFromUserTurn 抛错（不是返回 ok:false）时用的 code：走通用失败句，原始错误只进日志（leo S7）。 */
export const REWIND_THREW = "REWIND_THREW"

/** 跑一次重来，抛错也收成 { ok:false, code: REWIND_THREW }，不留未处理的 rejection。 */
export async function settleRewind(run: () => Promise<RewindRunResult>): Promise<RewindRunResult> {
  try {
    return await run()
  } catch (error) {
    console.warn(`[rewind] failed: ${REWIND_THREW}`, error)
    return { ok: false, code: REWIND_THREW }
  }
}

export function rewindOutcome(result: RewindRunResult, restoreFiles: boolean): RewindOutcome {
  if (result.ok) return { kind: "close" }
  if (result.code === "CHECKPOINT_CONFIRM_REQUIRED") {
    // 拿不到名单时 N 未知：标题换成不带数字的说法。
    const files = result.untrackedToDelete && result.untrackedToDelete.length > 0 ? result.untrackedToDelete : null
    return { kind: "untracked", files }
  }
  const failure = restoreFiles ? rewindFailureKind(result.code) : null
  if (failure) return { kind: "failure", failure }
  return { kind: "error", messageKey: rewindErrorKey(result.code) }
}
