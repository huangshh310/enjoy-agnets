/**
 * 「改到这里」确认卡文案与按钮（luna rewind-here 定稿）：
 * - Git 且可还原：单主钮 +「连本轮文件一起还原」勾选（默认关）；勾选后同层风险句，主钮文案变「改到这里并还原文件」。
 * - 非 Git / 不知道 / 引擎不支持文件还原：不给勾选，单主钮「改到这里」；非 Git 正文带诚实说明。
 * - 删未跟踪二次确认：固定人话标题 + 文件名单；主钮「删掉并还原」。
 * - 还原失败：missing 灰兜底 / partial 琥珀 +「去审查」。
 * 全文不出现 检查点 / HEAD / commit / 快照 / checkpoint / rewind / rollback。
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
      /** 勾选「连本轮文件一起还原」；默认关。 */
      restoreFilesChecked: boolean
      /**
       * 本轮是否有可还原的文件记录。true = 勾选可点；false = 勾选禁用 + 诚实说明；
       * null = 尚未预检（Git 下先当可点，失败仍走 missing）。
       */
      fileRestoreAvailable: boolean | null
    }
  | { kind: "untracked"; files: string[] | null }

export type RewindButtonId = "cancel" | "confirm" | "delete-and-restore"

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

export type RewindCheckboxView = {
  checked: boolean
  label: string
  hint: string
  /** 勾选开后才出现的风险句。 */
  risk: string | null
  disabled: boolean
  /** 勾选禁用时的诚实说明（无本轮记录）。 */
  note: string | null
}

export type RewindDialogView = {
  title: string
  body: string
  /** 非 Git / 中性态不再用独立 hint；Git 勾选副文在 checkbox.hint。 */
  hint: string | null
  checkbox: RewindCheckboxView | null
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
      body: n === 1 ? t("chat.rewindConfirmUntrackedBodyOne") : t("chat.rewindConfirmUntrackedBody"),
      hint: null,
      checkbox: null,
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
    const available = state.fileRestoreAvailable
    const checkboxDisabled = available === false
    const checked = checkboxDisabled ? false : state.restoreFilesChecked
    return {
      title: t("chat.rewindDialogTitle"),
      body: t("chat.rewindBody"),
      hint: null,
      checkbox: {
        checked,
        label: t("chat.rewindRestoreFiles"),
        hint: t("chat.rewindBodyRestoreHint"),
        risk: checked ? t("chat.rewindRestoreFilesRisk") : null,
        disabled: checkboxDisabled,
        note: checkboxDisabled ? t("chat.rewindNoCheckpointNote") : null
      },
      failure,
      files: [],
      moreCount: 0,
      buttons: [
        cancel,
        {
          id: "confirm",
          label: checked ? t("chat.rewindConfirmWithFiles") : t("chat.rewindChatOnly"),
          variant: "default"
        }
      ]
    }
  }

  return {
    title: t("chat.rewindDialogTitle"),
    body: state.gitRepo === false ? t("chat.rewindBodyNotGit") : t("chat.rewindBodyChatOnly"),
    hint: null,
    checkbox: null,
    failure,
    files: [],
    moreCount: 0,
    buttons: [cancel, { id: "confirm", label: t("chat.rewindStartOver"), variant: "default" }]
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

/**
 * 其它失败 → 固定文案键。不认识的 code（包括被当成 code 传上来的原始错误文本）一律用通用句。
 * REWIND_PROVIDER_UNSUPPORTED 也走通用句：入口在不支持的引擎上整个不出，到这里只可能是竞态（luna g159 ⑭）。
 */
export function rewindErrorKey(code: string): string {
  if (code.includes("REWIND_BUSY")) return "chat.rewindBusy"
  if (code.includes("TRUNCATE_MESSAGE_NOT_FOUND")) return "chat.rewindTruncateMissing"
  if (code.includes("TRUNCATE_STALE_SNAPSHOT")) return "chat.truncateStaleSnapshot"
  if (code.includes("TRUNCATE_TAIL_CHANGED")) return "chat.truncateTailChanged"
  if (code.includes("TRUNCATE_RUN_ACTIVE")) return "chat.truncateRunActive"
  if (rewindFailureKind(code)) return "chat.rewindNoCheckpoint"
  return "chat.rewindFailed"
}

export type RewindRunResult =
  | { ok: true; draftSessionId?: string; writebackPending?: boolean }
  | { ok: false; code: string; untrackedToDelete?: string[] }

/**
 * 截断已成功、写回输入框抛错（与 rewind-from-here.ts 的 REWIND_FINISH_FAILED 同值）：原话已存好、会继续放回。
 * 不显示「改到这里失败」——弹窗收掉 + toast。
 */
export const REWIND_FINISH_FAILED_CODE = "REWIND_FINISH_FAILED"

/** 一次重来的结果 → 弹窗下一步。弹窗只照这个改状态，不直接碰 code 文本。 */
export type RewindOutcome =
  /** draftToast：原话进了原来那个会话的草稿（前台已换会话），收窗时提示一句。 */
  | { kind: "close"; draftToast?: boolean; pendingToast?: boolean }
  /** 截断已成功、原话在草稿里：收窗 + toast（不显示失败句）。 */
  | { kind: "rewound-not-restored" }
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
  if (result.ok) {
    if (result.draftSessionId) return { kind: "close", draftToast: true }
    if (result.writebackPending) return { kind: "close", pendingToast: true }
    return { kind: "close" }
  }
  if (result.code === REWIND_FINISH_FAILED_CODE) return { kind: "rewound-not-restored" }
  if (result.code === "CHECKPOINT_CONFIRM_REQUIRED") {
    const files = result.untrackedToDelete && result.untrackedToDelete.length > 0 ? result.untrackedToDelete : null
    return { kind: "untracked", files }
  }
  const failure = restoreFiles ? rewindFailureKind(result.code) : null
  if (failure) return { kind: "failure", failure }
  return { kind: "error", messageKey: rewindErrorKey(result.code) }
}
