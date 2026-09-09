/**
 * 审查栏提交底栏：输入框内 sparkle 生成说明，提交/推送收到芯片行。
 */

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { RiGitCommitLine, RiLoader4Line, RiSparklingLine, RiUploadCloudLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { CONVENTIONAL_PREFIXES } from "../constants/review-constants"
import { generateCommitMessage } from "./generate-commit-message"

export type ReviewCommitDockHandle = {
  focus: () => void
}

export const ReviewCommitDock = forwardRef<
  ReviewCommitDockHandle,
  {
    changesCount: number
    onCommit?: (message: string) => Promise<{ ok: boolean; output?: string }>
    onPush?: () => Promise<{ ok: boolean; output?: string }>
    onReadPatch?: () => Promise<string>
  }
>(function ReviewCommitDock(props, ref) {
  const { changesCount, onCommit, onPush, onReadPatch } = props
  const t = useT()
  const { data: settings } = useSettingsSnapshot()
  const requireApproval = settings?.preferences.requireCommitApproval ?? true
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
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

  async function runGenerate() {
    if (!onReadPatch || generating || busy) return
    setGenerating(true)
    setError(null)
    try {
      const patch = await onReadPatch()
      setMessage(await generateCommitMessage(patch))
      inputRef.current?.focus()
    } catch {
      setError(t("chat.reviewGenerateCommitFailed"))
    }
    setGenerating(false)
  }

  function tryCommit() {
    if (!message.trim() || busy || changesCount === 0) return
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

  const locked = busy || generating

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 pt-0.5 select-none">
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.reviewCommitPlaceholder")}
          disabled={locked}
          rows={2}
          className="min-h-[44px] max-h-24 resize-none overflow-y-auto rounded-lg border-separator-border bg-background-primary-default py-1.5 pl-2.5 pr-8 text-caption-1-medium text-text-primary shadow-none placeholder:text-text-tertiary focus-visible:border-accent-500 focus-visible:ring-1 focus-visible:ring-accent-500"
        />
        {onReadPatch ? (
          <QuietIconButton
            icon={generating ? RiLoader4Line : RiSparklingLine}
            aria-label={t("chat.reviewGenerateCommit")}
            title={t("chat.reviewGenerateCommit")}
            disabled={locked}
            onClick={() => void runGenerate()}
            className={`absolute right-0.5 top-0.5 size-7 text-text-tertiary hover:text-accent-500 ${generating ? "animate-spin" : ""}`}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
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
        {onPush ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={locked}
            className="h-6 shrink-0 gap-1 px-1.5 text-text-tertiary"
            onClick={() => void runPush()}
          >
            <RiUploadCloudLine className="size-3" />
            <span>{t("chat.reviewPushAction")}</span>
          </Button>
        ) : null}
        <Button
          type="submit"
          size="xs"
          disabled={locked || !message.trim() || changesCount === 0}
          title={changesCount === 0 ? t("chat.reviewNothingStaged") : undefined}
          className="h-6 shrink-0 gap-1 px-2"
        >
          <RiGitCommitLine className="size-3" />
          <span>{busy ? t("chat.reviewCommitting") : t("chat.reviewCommitStaged")}</span>
        </Button>
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
    </form>
  )
})
