/**
 * 「改到这里」弹窗运行逻辑（从 rewind-from-here-dialog.tsx 抽出来，好在 node --test 里直接测接线）：
 * - run：同一时间只跑一次；一律经 settleRewind，抛错收成 REWIND_THREW → 通用句，原始错误只进一次日志。
 * - 确认卡：单主钮 + 勾选「连本轮文件一起还原」默认关；主钮按勾选态决定 restoreFiles。
 * - goReview：跑着的时候什么都不做。
 * - model()：组件渲染只照这里给的东西。
 * - 卡住兜底：REWIND_HANG_TIMEOUT_MS 后收成 REWIND_TIMEOUT；超时后 pending 时只有取消能点。
 * - 入口：引擎不支持整项不出；跑着 / 坞待批 → 灰 + 专用 tooltip（不静默丢审批）。
 */
import {
  clearRewindFinishFailedToast,
  scheduleRewindFinishFailedToast
} from "@renderer/hooks/rewind-finish-failed-toast"
import {
  REWIND_THREW,
  rewindDialogView,
  rewindOutcome,
  settleRewind,
  type RewindButton,
  type RewindButtonId,
  type RewindCheckboxView,
  type RewindFailure,
  type RewindRunResult
} from "./rewind-dialog-view"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export type RewindDialogDeps = {
  /** 真正去改到这里（组件里是 rewindFromUserTurn），可能抛错。 */
  rewind: (input: { restoreFiles: boolean; confirmDeleteUntracked?: boolean }) => Promise<RewindRunResult>
  /** 收窗（清回第一步之后调用）。 */
  onClose: () => void
  /** 打开右栏审查。 */
  revealReview: () => void
  /** 卡住兜底的超时（毫秒），默认 REWIND_HANG_TIMEOUT_MS；测试里调小。 */
  timeoutMs?: number
  /** 截断已成功、原话没能放回输入框（在草稿里）：toast。 */
  onRewoundNotRestored?: () => void
  /** 原话放进了原来那个会话的草稿（前台已换会话）：toast。 */
  onSavedToOtherDraft?: () => void
  /** 同会话正在输入：原话已存好、稍后放回输入框：toast（中性，不是失败）。 */
  onWritebackPending?: () => void
  /** 30s 超时后迟到的成功（原话已写回输入框）：toast。 */
  onLateRestored?: () => void
}

/** 重来的 IPC 卡住多久后放开 busy（还原大仓库也够用；之后按钮恢复、弹窗能关）。 */
export const REWIND_HANG_TIMEOUT_MS = 30_000
/** 卡住超时的 code：走通用失败句。 */
export const REWIND_TIMEOUT = "REWIND_TIMEOUT"

export type RewindDialogSnapshot = {
  busy: boolean
  /** undefined = 第一步；数组 / null = 二次确认删新文件（null = 拿不到名单）。 */
  untracked: string[] | null | undefined
  failure: RewindFailure | null
  errorKey: string | null
  /** 正在跑的是哪颗按钮（转圈 +「正在还原…」）；没在跑为 null。 */
  busyButton: RewindButtonId | null
  /** 卡住超时后第一次调用还没回来：只有「取消」能点。 */
  pending: boolean
  /** 「连本轮文件一起还原」勾选；默认关。 */
  restoreFilesChecked: boolean
  /** 本轮是否有可还原文件记录；null = 未预检。 */
  fileRestoreAvailable: boolean | null
}

/** 按钮要的属性：组件直接展开到 <button> / <Button> 上。 */
export type RewindButtonProps = { disabled: boolean; onClick: () => void }

export type RewindDialogModel = {
  stateKind: "confirm" | "untracked"
  title: string
  body: string
  hint: string | null
  checkbox: (RewindCheckboxView & { onCheckedChange: (checked: boolean) => void }) | null
  files: string[]
  moreCount: number
  failure: {
    kind: RewindFailure
    text: string
    /** partial 才有「去审查」。 */
    review: { label: string; buttonProps: RewindButtonProps } | null
  } | null
  /** 已翻译好的错误句；原始错误文本到不了这里。 */
  error: string | null
  /** busy = 这颗按钮正在跑：组件画转圈，label 已换成「正在还原…」。 */
  buttons: Array<RewindButton & { busy: boolean; buttonProps: RewindButtonProps }>
}

export type RewindDialogController = {
  getSnapshot: () => RewindDialogSnapshot
  subscribe: (listener: () => void) => () => void
  setDeps: (deps: RewindDialogDeps) => void
  close: () => void
  setRestoreFilesChecked: (checked: boolean) => void
  setFileRestoreAvailable: (available: boolean | null) => void
  run: (restoreFiles: boolean, confirmDeleteUntracked?: boolean, via?: RewindButtonId) => Promise<void>
  goReview: () => void
  onButton: (id: RewindButtonId) => void
  model: (input: {
    canRestoreFiles: boolean
    gitRepo: boolean | null
    t: Translate
    /** 竞态漏网：确认卡已开而转跑/待批 → 主钮 disabled。 */
    blockReason?: RewindEntryBlockReason | null
  }) => RewindDialogModel
}

const FIRST_STEP: Omit<RewindDialogSnapshot, "busy" | "busyButton" | "pending"> = {
  untracked: undefined,
  failure: null,
  errorKey: null,
  restoreFilesChecked: false,
  fileRestoreAvailable: null
}

export function createRewindDialogController(initialDeps: RewindDialogDeps): RewindDialogController {
  let deps = initialDeps
  let snapshot: RewindDialogSnapshot = { busy: false, busyButton: null, pending: false, ...FIRST_STEP }
  // 同步的「在跑」标记：连点 / 跑着时点去审查，不等重渲染就挡住。超时后仍为 true，直到第一次调用真正回来。
  let running = false
  // 界面上的「转圈」：到点（超时）就放开，好让弹窗能关。
  let spinning = false
  // 每次 run 一个号：超时之后晚到的结果靠它认出来，不再改界面。
  let runSeq = 0
  const listeners = new Set<() => void>()

  function set(patch: Partial<RewindDialogSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }

  /** 取消 / Esc / 遮罩 / 去审查 / 成功：都清回第一步再关。跑着的时候不收窗。 */
  function close() {
    if (spinning) return
    set(FIRST_STEP)
    deps.onClose()
  }

  function setRestoreFilesChecked(checked: boolean) {
    if (snapshot.busy || snapshot.pending) return
    if (snapshot.fileRestoreAvailable === false) return
    set({ restoreFilesChecked: checked, errorKey: null })
  }

  function setFileRestoreAvailable(available: boolean | null) {
    set({
      fileRestoreAvailable: available,
      ...(available === false ? { restoreFilesChecked: false } : {})
    })
  }

  /** 一次结果 → 界面。late = 超时之后才回来的（只认成功和「已截断、原话在草稿里」，其余不改界面）。 */
  function apply(result: RewindRunResult, restoreFiles: boolean, late: boolean) {
    const outcome = rewindOutcome(result, restoreFiles)
    if (outcome.kind === "close") {
      close()
      if (outcome.draftToast) deps.onSavedToOtherDraft?.()
      else if (outcome.pendingToast) deps.onWritebackPending?.()
      else if (late) deps.onLateRestored?.()
    } else if (outcome.kind === "rewound-not-restored") {
      close()
      deps.onRewoundNotRestored?.()
    } else if (late) {
      return
    } else if (outcome.kind === "untracked") {
      set({ untracked: outcome.files })
    } else if (outcome.kind === "failure") {
      set({
        untracked: undefined,
        failure: outcome.failure,
        ...(outcome.failure === "missing" ? { fileRestoreAvailable: false, restoreFilesChecked: false } : {})
      })
    } else {
      set({ errorKey: outcome.messageKey })
    }
  }

  async function run(restoreFiles: boolean, confirmDeleteUntracked?: boolean, via?: RewindButtonId) {
    if (running) return
    running = true
    spinning = true
    const seq = ++runSeq
    set({ busy: true, busyButton: via ?? null, errorKey: null })
    let timer: ReturnType<typeof setTimeout> | undefined
    let hung = false
    try {
      const settled = settleRewind(() => deps.rewind({ restoreFiles, confirmDeleteUntracked }))
      const timedOut = new Promise<RewindRunResult>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, code: REWIND_TIMEOUT }), deps.timeoutMs ?? REWIND_HANG_TIMEOUT_MS)
      })
      const result = await Promise.race([settled, timedOut])
      if (!result.ok && result.code === REWIND_TIMEOUT) {
        hung = true
        set({ pending: true })
        void settled.then((lateResult) => {
          running = false
          set({ pending: false })
          if (seq !== runSeq) return
          if (!lateResult.ok) console.warn(`[rewind] late result: ${lateResult.code}`)
          apply(lateResult, restoreFiles, true)
        })
      }
      if (!result.ok && result.code !== "CHECKPOINT_CONFIRM_REQUIRED" && result.code !== REWIND_THREW) {
        console.warn(`[rewind] failed: ${result.code}`)
      }
      spinning = false
      if (!hung) running = false
      apply(result, restoreFiles, false)
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      spinning = false
      if (!hung) running = false
      set({ busy: false, busyButton: null })
    }
  }

  function goReview() {
    if (running) return
    close()
    deps.revealReview()
  }

  function onButton(id: RewindButtonId) {
    if (id === "cancel") close()
    else if (id === "delete-and-restore") void run(true, true, id)
    else void run(Boolean(snapshot.restoreFilesChecked), undefined, id)
  }

  function model({
    canRestoreFiles,
    gitRepo,
    t,
    blockReason
  }: {
    canRestoreFiles: boolean
    gitRepo: boolean | null
    t: Translate
    blockReason?: RewindEntryBlockReason | null
  }) {
    const { busy, busyButton, untracked, failure, errorKey, pending, restoreFilesChecked, fileRestoreAvailable } =
      snapshot
    const view = rewindDialogView(
      untracked !== undefined
        ? { kind: "untracked", files: untracked }
        : {
            kind: "confirm",
            canRestoreFiles,
            gitRepo,
            failure,
            restoreFilesChecked,
            fileRestoreAvailable
          },
      t,
      busy || pending
    )
    const blocked = Boolean(blockReason) && untracked === undefined
    const result: RewindDialogModel = {
      stateKind: untracked !== undefined ? "untracked" : "confirm",
      title: view.title,
      body: view.body,
      hint: view.hint,
      checkbox: view.checkbox
        ? {
            ...view.checkbox,
            onCheckedChange: (checked) => setRestoreFilesChecked(checked)
          }
        : null,
      files: view.files,
      moreCount: view.moreCount,
      failure: view.failure
        ? {
            kind: view.failure.kind,
            text: view.failure.text,
            review:
              view.failure.kind === "partial" && view.failure.reviewLabel
                ? {
                    label: view.failure.reviewLabel,
                    buttonProps: { disabled: view.failure.reviewDisabled, onClick: goReview }
                  }
                : null
          }
        : null,
      error: errorKey
        ? t(errorKey)
        : blocked
          ? t(blockReason === "pending" ? "chat.rewindBlockedPending" : "chat.rewindBlockedRunning")
          : null,
      buttons: view.buttons.map((button) => {
        const spinningBtn = busy && busyButton === button.id
        const isPrimary = button.id === "confirm" || button.id === "delete-and-restore"
        return {
          ...button,
          label: spinningBtn ? t("chat.rewindRestoring") : button.label,
          busy: spinningBtn,
          // 超时后第一次调用还没回来：只有「取消」能点。竞态跑着/待批：主钮 disabled。
          buttonProps: {
            disabled: busy || (pending && button.id !== "cancel") || (blocked && isPrimary),
            onClick: () => onButton(button.id)
          }
        }
      })
    }
    return result
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setDeps(next) {
      deps = next
    },
    close,
    setRestoreFilesChecked,
    setFileRestoreAvailable,
    run,
    goReview,
    onButton,
    model
  }
}

/**
 * 组件用的 deps：把弹窗的 rewind 接到「这一条用户消息」的重来上（userMessageId 固定为 messageId，参数原样透传），
 * 收窗 = onOpenChange(false)。
 */
export function rewindDialogDeps(input: {
  messageId: string
  rewindFromUserTurn: (input: {
    userMessageId: string
    restoreFiles: boolean
    confirmDeleteUntracked?: boolean
  }) => Promise<RewindRunResult>
  onOpenChange: (open: boolean) => void
  revealReview: () => void
  /** 弹 toast（组件里是 showAppToast）；文案键在这里定，好测。 */
  toast?: (message: string) => void
  t?: Translate
}): RewindDialogDeps {
  const toast = (key: string) => {
    if (input.toast && input.t) input.toast(input.t(key))
  }
  return {
    rewind: ({ restoreFiles, confirmDeleteUntracked }) =>
      input.rewindFromUserTurn({ userMessageId: input.messageId, restoreFiles, confirmDeleteUntracked }),
    onClose: () => input.onOpenChange(false),
    revealReview: input.revealReview,
    onRewoundNotRestored: () => scheduleRewindFinishFailedToast(() => toast("chat.rewindFinishFailedToast")),
    onSavedToOtherDraft: () => toast("chat.rewindSavedToOtherDraft"),
    onWritebackPending: () => toast("chat.rewindWritebackPending"),
    onLateRestored: () => toast("chat.rewindLateRestoredToast")
  }
}

/** 弹窗卸载时清掉尚未弹出的「还没能放回」延迟 toast。 */
export function disposeRewindDialogToasts(): void {
  clearRewindFinishFailedToast()
}

/** 入口灰掉原因：跑着 / 坞待批。引擎不支持则整项不出（不是灰）。 */
export type RewindEntryBlockReason = "running" | "pending"

/**
 * 助手气泡 ⋯「改到这里」入口：引擎不支持回滚就整个不出（不是置灰）。
 * 跑着 / 坞待批 → disabled + 专用 tooltip。
 */
export function rewindEntryAction(input: {
  canRewind: boolean
  /** @deprecated 用 blockReason；true 等价 running。 */
  disabled?: boolean
  blockReason?: RewindEntryBlockReason | null
  t: Translate
}): { tooltip: string; label: string; disabled: boolean; blockReason: RewindEntryBlockReason | null } | null {
  if (!input.canRewind) return null
  const blockReason: RewindEntryBlockReason | null =
    input.blockReason ?? (input.disabled ? "running" : null)
  const label = input.t("chat.rewindTitle")
  const tooltip =
    blockReason === "running"
      ? input.t("chat.rewindBlockedRunning")
      : blockReason === "pending"
        ? input.t("chat.rewindBlockedPending")
        : label
  return { tooltip, label, disabled: Boolean(blockReason), blockReason }
}
