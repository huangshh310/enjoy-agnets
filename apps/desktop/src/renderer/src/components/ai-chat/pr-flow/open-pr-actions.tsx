/**
 * 审查底栏「开拉取请求」次级钮 + 确认卡 / 连接卡编排。
 * Must#2：确认后才 create；Must#5：未登录走诚实卡；Must#6：不改 gitCommit/gitPush。
 */
import { useState } from "react"
import { RiGitPullRequestLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { WorkspacePrCreateResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ConnectGithubCard } from "./connect-github-card"
import { OpenPrConfirmDialog } from "./open-pr-confirm-dialog"
import { useAttachedPrs } from "./use-attached-prs"
import { usePrEligibility } from "./use-pr-eligibility"

export function OpenPrActions(props: { disabled?: boolean }) {
  const t = useT()
  const workspaceId = useChatStore((s) => s.workspaceId)
  const sessionId = useChatStore((s) => s.sessionId)
  const { probe, canOpen, needsAuth, reload } = usePrEligibility(workspaceId, Boolean(workspaceId))
  const { replaceAfterCreate } = useAttachedPrs(sessionId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!workspaceId) return null
  if (probe.reason === "not-git" || probe.reason === "ssh-unsupported") return null

  function reasonHint(): string | undefined {
    if (probe.reason === "no-upstream") return t("chat.prReasonNoUpstream")
    if (probe.reason === "no-commits") return t("chat.prReasonNoCommits")
    if (needsAuth) return t("chat.prReasonNotAuthed")
    return undefined
  }

  function onClick() {
    setError(null)
    if (needsAuth || probe.authStatus === "logged-out") {
      setConnectOpen(true)
      return
    }
    if (!canOpen) {
      setError(reasonHint() || t("chat.prOpenUnavailable"))
      return
    }
    setConfirmOpen(true)
  }

  async function onConfirm(title: string, body: string) {
    if (!hasIde() || !workspaceId) return
    setBusy(true)
    setError(null)
    try {
      const res = (await getIde().workspace.prCreate({
        workspaceId,
        title,
        body
      })) as WorkspacePrCreateResult
      if (!res.ok) {
        if (res.reason === "not-authed") {
          setConfirmOpen(false)
          setConnectOpen(true)
          return
        }
        setError(res.message || t("chat.prCreateFailed"))
        return
      }
      await replaceAfterCreate({
        number: res.number,
        url: res.url,
        title: res.title || title
      })
      setConfirmOpen(false)
      void reload()
    } catch {
      setError(t("chat.prCreateFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={props.disabled || busy}
        title={reasonHint()}
        data-testid="open-pr-action"
        className="h-6 shrink-0 gap-1 px-1.5 text-text-secondary"
        onClick={onClick}
      >
        <RiGitPullRequestLine className="size-3" />
        <span>{t("chat.prOpenAction")}</span>
      </Button>

      {error && !confirmOpen ? (
        <span data-testid="open-pr-inline-error" className="max-w-40 truncate text-caption-2-regular text-text-error-primary">
          {error}
        </span>
      ) : null}

      <OpenPrConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        draftTitle={probe.draftTitle}
        draftBody={probe.draftBody}
        busy={busy}
        error={error}
        onConfirm={onConfirm}
      />
      <ConnectGithubCard open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  )
}
