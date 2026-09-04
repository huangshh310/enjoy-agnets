/**
 * 快捷提交：有未提交改动时显示。默认走 ConfirmDialog，尊重 requireCommitApproval。
 */
import { useState } from "react"
import { RiGitCommitLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"

const PREFIXES = ["feat: ", "fix: ", "refactor: "] as const

export function CommitComposer(props: {
  changesCount: number
  onCommit: (message: string) => Promise<{ ok: boolean; output?: string }>
}) {
  const { changesCount, onCommit } = props
  const t = useT()
  const { data: settings } = useSettingsSnapshot()
  const requireApproval = settings?.preferences.requireCommitApproval ?? true
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function runCommit() {
    if (!message.trim()) return
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!message.trim() || busy) return
    if (requireApproval) {
      setConfirmOpen(true)
      return
    }
    void runCommit()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-caption-2-medium">
          <span className="flex items-center gap-1 text-text-primary">
            <RiGitCommitLine className="size-3.5 text-accent-500" />
            <span>{t("chat.reviewQuickCommit", { n: changesCount })}</span>
          </span>
          <div className="flex items-center gap-1 font-mono text-caption-2-medium">
            {PREFIXES.map((prefix) => (
              <button
                key={prefix}
                type="button"
                onClick={() => setMessage(prefix)}
                className="rounded bg-background-secondary-default px-1 py-0.5 hover:text-accent-500"
              >
                {prefix.trim()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("chat.reviewCommitPlaceholder")}
            className="h-7 bg-background-primary-default text-caption-2-medium"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || busy}
            className="h-7 shrink-0 px-2.5 text-caption-2-medium"
          >
            {busy ? t("chat.reviewCommitting") : t("chat.reviewCommitAction")}
          </Button>
        </div>
        {error ? (
          <span className="truncate text-caption-2-medium text-text-error-primary">{error}</span>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title={t("chat.reviewConfirmTitle")}
        description={t("chat.reviewConfirmDesc", { n: changesCount, message: message.trim() })}
        confirmLabel={t("chat.reviewCommitAction")}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void runCommit()}
      />
    </>
  )
}
