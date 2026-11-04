/**
 * 「改到这里」确认卡。异步结束前不关窗；结果回来、取消、Esc 都清回第一步。
 * 文案 / 按钮按 luna rewind-here 定稿（rewind-dialog-view.ts）：单主钮 + 勾选默认关、删新文件二次确认、
 * 还原失败分灰色兜底和琥珀色 +「去审查」。
 * 跑 / 去审查 / 按钮的 disabled 与 onClick 都来自 rewind-dialog-controller.ts，这里只负责摆出来。
 * 引擎不支持回滚时，⋯ 菜单入口整个不出（不是置灰）。
 * 对比度（≥4.5:1）与描边加深仍走 rewind-dialog.css 的 [data-rewind-dialog] 局部覆盖。
 */
import { useEffect, useState, useSyncExternalStore } from "react"
import { RiHistoryLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { MessageAction } from "@/components/ai-elements/message"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { rewindFromUserTurn } from "@renderer/hooks/rewind-from-here"
import { useT } from "@renderer/i18n"
import { showAppToast } from "@renderer/lib/app-toast"
import { useChatStore } from "@renderer/stores/chat-store"
import { revealRightPane } from "../../right-pane/open-pane"
import {
  createRewindDialogController,
  disposeRewindDialogToasts,
  rewindDialogDeps,
  rewindEntryAction,
  type RewindEntryBlockReason
} from "./rewind-dialog-controller"

export function RewindFromHereAction({
  messageId,
  blockReason,
  canRewind
}: {
  messageId: string
  blockReason?: RewindEntryBlockReason | null
  /** @deprecated 用 blockReason */
  disabled?: boolean
  canRewind: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const entry = rewindEntryAction({ canRewind, blockReason, disabled: Boolean(blockReason), t })
  if (!entry) return null
  return (
    <>
      <MessageAction
        tooltip={entry.tooltip}
        label={entry.label}
        disabled={entry.disabled}
        onClick={() => {
          if (entry.disabled) return
          setOpen(true)
        }}
      >
        <RiHistoryLine className="size-3.5" />
      </MessageAction>
      <RewindFromHereDialog
        open={open}
        messageId={messageId}
        canRestoreFiles={canRewind}
        blockReason={entry.blockReason}
        onOpenChange={setOpen}
      />
    </>
  )
}

/** 助手气泡 ⋯ 菜单项「改到这里」（P1 主入口）。 */
export function RewindFromHereMenuItem({
  messageId,
  blockReason,
  canRewind
}: {
  messageId: string
  blockReason?: RewindEntryBlockReason | null
  canRewind: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const entry = rewindEntryAction({ canRewind, blockReason, t })
  if (!entry) return null
  return (
    <>
      <span title={entry.tooltip} className="block w-full">
        <DropdownMenuItem
          data-testid="rewind-from-here"
          disabled={entry.disabled}
          onSelect={(event) => {
            if (entry.disabled) {
              event.preventDefault()
              return
            }
            setOpen(true)
          }}
          className="flex cursor-pointer items-center gap-2 py-1.5 px-2 text-caption-1-medium"
        >
          <RiHistoryLine className="size-4 shrink-0" />
          <span>{entry.label}</span>
        </DropdownMenuItem>
      </span>
      <RewindFromHereDialog
        open={open}
        messageId={messageId}
        canRestoreFiles={canRewind}
        blockReason={entry.blockReason}
        onOpenChange={setOpen}
      />
    </>
  )
}

export function RewindFromHereDialog({
  open,
  messageId,
  canRestoreFiles,
  blockReason,
  onOpenChange
}: {
  open: boolean
  messageId: string
  canRestoreFiles: boolean
  blockReason?: RewindEntryBlockReason | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  // 审查面板同一份：workspace.changes 回来的 gitRepo；false = 明确没用 Git，null = 还不知道。
  const gitRepo = useChatStore((state) => state.gitRepo)
  const deps = rewindDialogDeps({
    messageId,
    rewindFromUserTurn,
    onOpenChange,
    revealReview: () => revealRightPane("review"),
    toast: (message) => showAppToast(message),
    t
  })
  const [controller] = useState(() => createRewindDialogController(deps))
  controller.setDeps(deps)
  useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  // 卸载或切会话时清掉尚未弹出的「还没能放回」延迟 toast。
  useEffect(() => {
    const unsub = useChatStore.subscribe((state, prev) => {
      if (state.sessionId !== prev.sessionId) disposeRewindDialogToasts()
    })
    return () => {
      unsub()
      disposeRewindDialogToasts()
    }
  }, [])
  // 打开时勾选回到默认关。
  useEffect(() => {
    if (open) {
      controller.setRestoreFilesChecked(false)
      controller.setFileRestoreAvailable(null)
    }
  }, [open, controller])
  const view = controller.model({ canRestoreFiles, gitRepo, t, blockReason: blockReason ?? null })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else controller.close()
      }}
    >
      <DialogContent
        data-testid="rewind-dialog"
        data-state-kind={view.stateKind}
        data-rewind-dialog=""
        data-pane-shell-deco="off"
        className="max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
      >
        <DialogHeader>
          <DialogTitle data-testid="rewind-title" className="text-title-3-semibold text-text-primary">
            {view.title}
          </DialogTitle>
          <DialogDescription data-testid="rewind-body" className="text-pretty text-body-medium text-text-secondary dark:text-text-primary/60">
            {view.body}
          </DialogDescription>
          {view.hint ? (
            <p data-testid="rewind-hint" className="text-pretty text-caption-1-regular text-text-secondary dark:text-text-primary/60">
              {view.hint}
            </p>
          ) : null}
        </DialogHeader>
        {view.checkbox ? (
          <div data-testid="rewind-restore-files" className="mt-1 space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 text-caption-1-medium text-text-primary">
              <input
                type="checkbox"
                data-testid="rewind-restore-files-checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border border-border-button-default accent-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                checked={view.checkbox.checked}
                disabled={view.checkbox.disabled || view.buttons.some((b) => b.busy)}
                onChange={(event) => view.checkbox?.onCheckedChange(event.target.checked)}
              />
              <span className="min-w-0">
                <span className="block">{view.checkbox.label}</span>
                <span className="mt-0.5 block text-caption-1-regular text-text-secondary dark:text-text-primary/60">
                  {view.checkbox.hint}
                </span>
              </span>
            </label>
            {view.checkbox.note ? (
              <p
                data-testid="rewind-no-checkpoint-note"
                className="rounded-xl bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-primary/60"
              >
                {view.checkbox.note}
              </p>
            ) : null}
            {view.checkbox.risk ? (
              <p
                data-testid="rewind-restore-risk"
                role="status"
                className="rounded-xl border border-status-yellow-text/25 bg-status-yellow-background/10 px-3 py-2 text-caption-1-medium text-status-yellow-text"
              >
                {view.checkbox.risk}
              </p>
            ) : null}
          </div>
        ) : null}
        {view.files.length > 0 ? (
          <ul data-testid="rewind-files" className="mt-1 flex flex-col gap-0.5 text-caption-1-regular text-text-secondary dark:text-text-primary/60">
            {view.files.map((file) => (
              <li key={file} className="truncate font-mono" title={file}>
                {file}
              </li>
            ))}
            {view.moreCount > 0 ? (
              <li data-testid="rewind-files-more" className="text-text-secondary dark:text-text-primary/60">
                {t("chat.rewindConfirmUntrackedMore", { n: view.moreCount })}
              </li>
            ) : null}
          </ul>
        ) : null}
        {view.failure?.kind === "missing" ? (
          <p
            data-testid="rewind-failure"
            data-failure-kind="missing"
            role="status"
            className="mt-1 rounded-xl bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-primary/60"
          >
            {view.failure.text}
          </p>
        ) : null}
        {view.failure?.kind === "partial" ? (
          <div
            data-testid="rewind-failure"
            data-failure-kind="partial"
            role="alert"
            className="mt-1 rounded-xl border border-status-yellow-text/25 bg-status-yellow-background/10 px-3 py-2 text-caption-1-medium text-status-yellow-text"
          >
            <span>{view.failure.text}</span>{" "}
            <button
              type="button"
              data-testid="rewind-go-review"
              className="font-semibold underline underline-offset-2 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              {...view.failure.review?.buttonProps}
            >
              {view.failure.review?.label}
            </button>
          </div>
        ) : null}
        {view.error ? (
          <p data-testid="rewind-error" className="mt-2 text-caption-1-medium text-text-error-primary">
            {view.error}
          </p>
        ) : null}
        <DialogFooter className="mt-2">
          {view.buttons.map((button) => (
            <Button
              key={button.id}
              data-testid={`rewind-${button.id}`}
              data-busy={button.busy ? "true" : undefined}
              aria-busy={button.busy || undefined}
              variant={button.variant}
              size="sm"
              className="disabled:opacity-50 data-[busy=true]:opacity-100"
              {...button.buttonProps}
            >
              {button.busy ? <RiLoader4Line data-testid="rewind-spinner" className="size-3.5 animate-spin" aria-hidden /> : null}
              {button.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
