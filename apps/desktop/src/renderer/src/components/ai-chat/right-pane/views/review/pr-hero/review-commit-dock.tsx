/**
 * 审查栏快捷提交底栏：说明输入、Conventional 前缀、审批提交、推送。
 */

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { RiGitCommitLine, RiUploadCloudLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { CONVENTIONAL_PREFIXES } from "../constants/review-constants"

export type ReviewCommitDockHandle = {
  focus: () => void
}

export const ReviewCommitDock = forwardRef<
  ReviewCommitDockHandle,
  {
    changesCount: number
    onCommit?: (message: string) => Promise<{ ok: boolean; output?: string }>
    onPush?: () => Promise<{ ok: boolean; output?: string }>
  }
>(function ReviewCommitDock(props, ref) {
  const { changesCount, onCommit, onPush } = props
  const t = useT()
  const { data: settings } = useSettingsSnapshot()
  const requireApproval = settings?.preferences.requireCommitApproval ?? true
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }))

  if (!onCommit) return null

  async function runCommit() {
    if (!message.trim() || !onCommit) return
    setBusy(true)
    setError(null)
    const res = await onCommit(message.trim())
    setBusy(false)
    if (res.ok) {
      setMessage("")
      return
    }
    setError(res.output || t("chat.reviewCommitFailed"))
  }

  async function runPush() {
    if (!onPush) return
    setBusy(true)
    setError(null)
    const res = await onPush()
    setBusy(false)
    if (!res.ok) setError(res.output || t("chat.reviewPushFailed"))
  }

  function tryCommit() {
    if (!message.trim() || busy) return
    if (requireApproval) {
      setConfirmOpen(true)
      return
    }
    void runCommit()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    tryCommit()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    tryCommit()
  }

  return (
    <div className="flex flex-col gap-1.5 pt-0.5 select-none">
      <form onSubmit={handleSubmit} className="flex items-start gap-1.5">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.reviewCommitPlaceholder")}
          disabled={busy}
          rows={2}
          className="min-h-[52px] max-h-28 resize-none overflow-y-auto rounded-lg border-separator-border bg-background-primary-default px-2.5 py-1.5 text-caption-1-medium text-text-primary shadow-none placeholder:text-text-tertiary focus-visible:border-accent-500 focus-visible:ring-1 focus-visible:ring-accent-500"
        />
        <div className="flex shrink-0 flex-col gap-1">
          <Button type="submit" size="sm" disabled={busy || !message.trim()} className="h-7 gap-1 px-2.5">
            <RiGitCommitLine className="size-3" />
            <span>{busy ? t("chat.reviewCommitting") : t("chat.reviewCommitAction")}</span>
          </Button>
          {onPush ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="h-7 gap-1 px-2.5"
              onClick={() => void runPush()}
            >
              <RiUploadCloudLine className="size-3" />
              <span>{t("chat.reviewPushAction")}</span>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-1">
        {CONVENTIONAL_PREFIXES.map((item) => (
          <button
            key={item.prefix}
            type="button"
            onClick={() =>
              setMessage((prev) =>
                prev ? `${item.prefix}${prev.replace(/^[a-z]+:\s*/i, "")}` : item.prefix
              )
            }
            className="cursor-pointer rounded border border-separator-border/60 bg-background-secondary-default/50 px-1.5 py-0.5 font-mono text-[10.5px] text-text-tertiary hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-accent-500 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-[11px] text-text-error-primary">{error}</p> : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("chat.reviewConfirmTitle")}
        description={t("chat.reviewConfirmDesc", {
          n: changesCount,
          message: message.trim()
        })}
        confirmLabel={t("chat.reviewCommitAction")}
        onConfirm={() => void runCommit()}
      />
    </div>
  )
})
