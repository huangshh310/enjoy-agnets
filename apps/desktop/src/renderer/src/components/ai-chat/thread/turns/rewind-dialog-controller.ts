/**
 * 「从这里重来」弹窗的运行逻辑（从 rewind-from-here-dialog.tsx 抽出来，好在 node --test 里直接测接线，leo MUST-FIX）：
 * - run：同一时间只跑一次（同步 busy 标记，不等 React 重渲染）；一律经 settleRewind，抛错收成 REWIND_THREW →
 *   通用句「从这里重来失败」，原始错误只在 settleRewind 里进一次日志（leo S7 / soft：不重复打日志）。
 * - goReview：跑着的时候什么都不做（leo S1：否则会在弹窗背后打开右栏）。
 * - model()：组件渲染只照这里给的东西——文案、按钮的 disabled / onClick 都从这里出，组件不自己拼。
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
}

export type RewindDialogSnapshot = {
  busy: boolean
  /** undefined = 第一步；数组 / null = 二次确认删新文件（null = 拿不到名单）。 */
  untracked: string[] | null | undefined
  failure: RewindFailure | null
  errorKey: string | null
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
  buttons: Array<RewindButton & { buttonProps: RewindButtonProps }>
}

export type RewindDialogController = {
  getSnapshot: () => RewindDialogSnapshot
  subscribe: (listener: () => void) => () => void
  setDeps: (deps: RewindDialogDeps) => void
  close: () => void
  run: (restoreFiles: boolean, confirmDeleteUntracked?: boolean) => Promise<void>
  goReview: () => void
  onButton: (id: RewindButtonId) => void
  model: (input: { canRestoreFiles: boolean; gitRepo: boolean | null; t: Translate }) => RewindDialogModel
}

const FIRST_STEP: Omit<RewindDialogSnapshot, "busy"> = { untracked: undefined, failure: null, errorKey: null }

export function createRewindDialogController(initialDeps: RewindDialogDeps): RewindDialogController {
  let deps = initialDeps
  let snapshot: RewindDialogSnapshot = { busy: false, ...FIRST_STEP }
  // 同步的「在跑」标记：连点 / 跑着时点去审查，不等重渲染就挡住。
  let running = false
  const listeners = new Set<() => void>()

  function set(patch: Partial<RewindDialogSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }

  /** 取消 / Esc / 遮罩 / 去审查 / 成功：都清回第一步再关。跑着的时候不收窗。 */
  function close() {
    if (running) return
    set(FIRST_STEP)
    deps.onClose()
  }

  async function run(restoreFiles: boolean, confirmDeleteUntracked?: boolean) {
    if (running) return
    running = true
    set({ busy: true, errorKey: null })
    try {
      // 抛错也收成通用失败（REWIND_THREW），不留未处理的 rejection，原始错误不进界面。
      const result = await settleRewind(() => deps.rewind({ restoreFiles, confirmDeleteUntracked }))
      // 抛错那条 settleRewind 已经连原始错误打过一次日志，这里不再重复。
      if (!result.ok && result.code !== "CHECKPOINT_CONFIRM_REQUIRED" && result.code !== REWIND_THREW) {
        console.warn(`[rewind] failed: ${result.code}`)
      }
      const outcome = rewindOutcome(result, restoreFiles)
      if (outcome.kind === "close") {
        running = false
        close()
      } else if (outcome.kind === "untracked") {
        set({ untracked: outcome.files })
      } else if (outcome.kind === "failure") {
        set({ untracked: undefined, failure: outcome.failure })
      } else {
        set({ errorKey: outcome.messageKey })
      }
    } finally {
      running = false
      set({ busy: false })
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
    else if (id === "restore-files") void run(true)
    else if (id === "delete-and-restore") void run(true, true)
    else void run(false)
  }

  function model({ canRestoreFiles, gitRepo, t }: { canRestoreFiles: boolean; gitRepo: boolean | null; t: Translate }) {
    const { busy, untracked, failure, errorKey } = snapshot
    const view = rewindDialogView(
      untracked !== undefined ? { kind: "untracked", files: untracked } : { kind: "confirm", canRestoreFiles, gitRepo, failure },
      t,
      busy
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
      buttons: view.buttons.map((button) => ({
        ...button,
        buttonProps: { disabled: busy, onClick: () => onButton(button.id) }
      }))
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

