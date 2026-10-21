/**
 * 「从这里重来」弹窗的运行逻辑（从 rewind-from-here-dialog.tsx 抽出来，好在 node --test 里直接测接线，leo MUST-FIX）：
 * - run：同一时间只跑一次（同步 busy 标记，不等 React 重渲染）；一律经 settleRewind，抛错收成 REWIND_THREW →
 *   通用句「从这里重来失败」，原始错误只在 settleRewind 里进一次日志（leo S7 / soft：不重复打日志）。
 * - goReview：跑着的时候什么都不做（leo S1：否则会在弹窗背后打开右栏）。
 * - model()：组件渲染只照这里给的东西——文案、按钮的 disabled / onClick 都从这里出，组件不自己拼。
 * - 卡住兜底（#159 F1，leo）：重来的 IPC 一直不回，busy 不能永远挂着——REWIND_HANG_TIMEOUT_MS 后收成
 *   REWIND_TIMEOUT（通用失败句），按钮恢复、弹窗能关；晚到的结果若是成功就顺手收窗，失败则不再改界面。
 *   超时之后、第一次调用真正回来之前（pending）：只有「取消」能点——不能再点一次重来 / 去审查，
 *   免得两次文件还原并发（leo #167）。
 * - REWIND_FINISH_FAILED（截断已成功、原话没放回输入框）：收窗 + toast「已回到这里…原话在草稿里」，
 *   不显示「从这里重来失败」（会话重读在 rewind-from-here 里做，leo #167 ③）。晚到的同样处理。
 * - 原话进了原来那个会话的草稿（前台已换会话）：收窗 + 小 toast 告诉用户（onSavedToOtherDraft）。
 * - 跑着的时候：点的那颗按钮转圈 +「正在还原…」，其余按钮 disabled（luna g159 ⑪）。
 */
import {
  REWIND_THREW,
  rewindDialogView,
  rewindOutcome,
  settleRewind,
  type RewindButton,
  type RewindButtonId,
  type RewindFailure,
  type RewindRunResult
} from "./rewind-dialog-view"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export type RewindDialogDeps = {
  /** 真正去重来（组件里是 rewindFromUserTurn），可能抛错。 */
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
}

/** 按钮要的属性：组件直接展开到 <button> / <Button> 上。 */
export type RewindButtonProps = { disabled: boolean; onClick: () => void }

export type RewindDialogModel = {
  stateKind: "confirm" | "untracked"
  title: string
  body: string
  hint: string | null
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
  run: (restoreFiles: boolean, confirmDeleteUntracked?: boolean, via?: RewindButtonId) => Promise<void>
  goReview: () => void
  onButton: (id: RewindButtonId) => void
  model: (input: { canRestoreFiles: boolean; gitRepo: boolean | null; t: Translate }) => RewindDialogModel
}

const FIRST_STEP: Omit<RewindDialogSnapshot, "busy" | "busyButton" | "pending"> = { untracked: undefined, failure: null, errorKey: null }

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

  /** 一次结果 → 界面。late = 超时之后才回来的（只认成功和「已截断、原话在草稿里」，其余不改界面）。 */
  function apply(result: RewindRunResult, restoreFiles: boolean, late: boolean) {
    const outcome = rewindOutcome(result, restoreFiles)
    if (outcome.kind === "close") {
      close()
      if (outcome.draftToast) deps.onSavedToOtherDraft?.()
    } else if (outcome.kind === "rewound-not-restored") {
      close()
      deps.onRewoundNotRestored?.()
    } else if (late) {
      return
    } else if (outcome.kind === "untracked") {
      set({ untracked: outcome.files })
    } else if (outcome.kind === "failure") {
      set({ untracked: undefined, failure: outcome.failure })
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
      // 抛错也收成通用失败（REWIND_THREW），不留未处理的 rejection，原始错误不进界面。
      const settled = settleRewind(() => deps.rewind({ restoreFiles, confirmDeleteUntracked }))
      // IPC 卡住：到点收成 REWIND_TIMEOUT，busy 放开、弹窗能关（leo #159 F1）。
      const timedOut = new Promise<RewindRunResult>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, code: REWIND_TIMEOUT }), deps.timeoutMs ?? REWIND_HANG_TIMEOUT_MS)
      })
      const result = await Promise.race([settled, timedOut])
      if (!result.ok && result.code === REWIND_TIMEOUT) {
        // 第一次调用还在跑：只放开「取消」，别的按钮等它真正回来（不能并发两次文件还原）。
        hung = true
        set({ pending: true })
        void settled.then((lateResult) => {
          running = false
          set({ pending: false })
          if (seq !== runSeq) return
          if (!lateResult.ok) console.warn(`[rewind] late result: ${lateResult.code}`)
          // 晚到的成功：对话已经截了、原话已写回 → 收窗；已截断但原话在草稿里 → 收窗 + toast；其余不改界面。
          apply(lateResult, restoreFiles, true)
        })
      }
      // 抛错那条 settleRewind 已经连原始错误打过一次日志，这里不再重复。
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
    // 重试跑着的时候不去审查：close() 不收窗，右栏会在弹窗背后打开（leo S1）。
    if (running) return
    close()
    deps.revealReview()
  }

  function onButton(id: RewindButtonId) {
    if (id === "cancel") close()
    else if (id === "restore-files") void run(true, undefined, id)
    else if (id === "delete-and-restore") void run(true, true, id)
    else void run(false, undefined, id)
  }

  function model({ canRestoreFiles, gitRepo, t }: { canRestoreFiles: boolean; gitRepo: boolean | null; t: Translate }) {
    const { busy, busyButton, untracked, failure, errorKey, pending } = snapshot
    const view = rewindDialogView(
      untracked !== undefined ? { kind: "untracked", files: untracked } : { kind: "confirm", canRestoreFiles, gitRepo, failure },
      t,
      busy || pending
    )
    const result: RewindDialogModel = {
      stateKind: untracked !== undefined ? "untracked" : "confirm",
      title: view.title,
      body: view.body,
      hint: view.hint,
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
      error: errorKey ? t(errorKey) : null,
      buttons: view.buttons.map((button) => {
        const spinning = busy && busyButton === button.id
        return {
          ...button,
          label: spinning ? t("chat.rewindRestoring") : button.label,
          busy: spinning,
          // 超时后第一次调用还没回来：只有「取消」能点。
          buttonProps: { disabled: busy || (pending && button.id !== "cancel"), onClick: () => onButton(button.id) }
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
    run,
    goReview,
    onButton,
    model
  }
}

/**
 * 组件用的 deps：把弹窗的 rewind 接到「这一条消息」的重来上（userMessageId 固定为 messageId，参数原样透传），
 * 收窗 = onOpenChange(false)。单独拿出来好在 node --test 里测接线（leo soft 7）。
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
    onRewoundNotRestored: () => toast("chat.rewindFinishFailedToast"),
    onSavedToOtherDraft: () => toast("chat.rewindSavedToOtherDraft")
  }
}

/**
 * 消息上的「从这里重来」入口：引擎不支持回滚就整个不出（不是置灰、没有提示，luna）。
 * 返回 null = 不渲染；否则是入口按钮要的属性。
 */
export function rewindEntryAction(input: {
  canRewind: boolean
  disabled: boolean
  t: Translate
}): { tooltip: string; label: string; disabled: boolean } | null {
  if (!input.canRewind) return null
  const label = input.t("chat.rewindTitle")
  return { tooltip: label, label, disabled: input.disabled }
}
