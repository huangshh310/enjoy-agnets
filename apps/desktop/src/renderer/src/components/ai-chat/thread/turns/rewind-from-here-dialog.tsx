/**
 * 从这条用户消息重来。异步结束前不关窗（Esc / 遮罩 / 取消都不收）；结果回来、取消、Esc 都清回第一步。
 * 文案 / 按钮按 luna 定稿（rewind-dialog-view.ts）：Git 工作区三钮、非 Git / 不知道 / 引擎不支持两钮、删新文件二次确认、
 * 还原失败分灰色兜底（什么都没改）和琥珀色 +「去审查」（只还原了一部分）。
 * 跑 / 去审查 / 按钮的 disabled 与 onClick 都来自 rewind-dialog-controller.ts（node --test 直接测接线），这里只负责摆出来。
 * 引擎不支持回滚时，消息上的入口整个不出（luna：不是置灰、没有提示）。
 * 对比度（luna g159 ⑩，≥4.5:1，只用语义 token）：正文 / 提示灰字 / 文件名单浅色 text-secondary（4.73）、
 * 深色 text-primary/60（6.2）；「找不到记录」灰块 text-primary/60（浅 5.1 / 深 6.8）。rewind-dialog-contrast.test.ts 按 theme.css 现算。
 * 中文正文末行不留孤字（text-pretty，不改文案）。跑着的按钮转圈 +「正在还原…」，置灰的按钮看得出是置灰的。
 * 实机 CONDITIONAL 必修 ③（WCAG 文字 ≥ 4.5、描边 ≥ 3）：失败句浅 red-700 / 深 red-400、「只改聊天」「删掉并还原」渐变 700 起
 * （转圈时保持常态色）、「取消」「连文件一起还原」描边与弹窗外沿 neutral-500——都在 rewind-dialog.css 里按 [data-rewind-dialog] 局部覆盖。
 */
import { useEffect, useState, useSyncExternalStore } from "react"
import { RiHistoryLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { MessageAction } from "@/components/ai-elements/message"
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
import { createRewindDialogController, disposeRewindDialogToasts, rewindDialogDeps, rewindEntryAction } from "./rewind-dialog-controller"

export function RewindFromHereAction({
  messageId,
  disabled,
  canRewind
}: {
  messageId: string
  disabled: boolean
  canRewind: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const entry = rewindEntryAction({ canRewind, disabled, t })
  if (!entry) return null
  return (
    <>
      <MessageAction
        tooltip={entry.tooltip}
        label={entry.label}
        disabled={entry.disabled}
        onClick={() => setOpen(true)}
      >
        <RiHistoryLine className="size-3.5" />
      </MessageAction>
      <RewindFromHereDialog
        open={open}
        messageId={messageId}
        canRestoreFiles={canRewind}
        onOpenChange={setOpen}
      />
    </>
  )
}

export function RewindFromHereDialog({
  open,
  messageId,
  canRestoreFiles,
  onOpenChange
}: {
  open: boolean
  messageId: string
  canRestoreFiles: boolean
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
  // luna n167 P2：卸载或切会话时清掉尚未弹出的「还没能放回」延迟 toast。
  useEffect(() => {
    const unsub = useChatStore.subscribe((state, prev) => {
      if (state.sessionId !== prev.sessionId) disposeRewindDialogToasts()
    })
    return () => {
      unsub()
      disposeRewindDialogToasts()
    }
  }, [])
  const view = controller.model({ canRestoreFiles, gitRepo, t })

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
        // 实机必修 ③：弹窗里的失败句 / 主按钮 / 危险按钮 / 描边 token 在 rewind-dialog.css 里局部加深（四皮肤 × 亮暗）。
        data-rewind-dialog=""
        // 实心底、不画皮肤装饰（ink 天空底 / sketch 网纹 / glass 半透明）：否则红字和描边的底色随皮肤漂，对比度保不住。
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
          // 灰色兜底：什么都没改。和正文下的提示灰字拉开——带底色的小块、次级字色。
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
          // 琥珀色：文件可能只还原了一部分，后面跟文字按钮「去审查」。
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
