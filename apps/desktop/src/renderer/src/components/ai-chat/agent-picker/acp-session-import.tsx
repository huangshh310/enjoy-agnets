/**
 * 本机 CLI 面板：导入 Agent 侧 ACP 会话。未广告 list 则不画。
 */
import { useEffect, useState } from "react"
import type { AcpRemoteSession } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { refreshAllWorkspaces } from "@renderer/hooks/session-lifecycle"

export function AcpSessionImport({ runtimeId }: { runtimeId: string }) {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<AcpRemoteSession[] | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!hasIde() || !workspaceId) return
    let cancelled = false
    setBusy(true)
    void getIde()
      .agentTools.listAcpSessions({ runtimeId, workspaceId })
      .then((result) => {
        if (cancelled) return
        setSupported(result.supported !== false)
        setError(result.error?.trim() || null)
        setRows(Array.isArray(result.sessions) ? result.sessions : [])
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setSupported(true)
        setError(caught instanceof Error ? caught.message : String(caught))
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [runtimeId, workspaceId])

  if (!hasIde() || !workspaceId) return null
  if (supported === false && !error) return null

  async function importRow(row: AcpRemoteSession) {
    if (row.imported || !workspaceId) return
    setBusy(true)
    setError(null)
    try {
      const created = await getIde().agentTools.importAcpSession({
        runtimeId,
        workspaceId,
        acpSessionId: row.sessionId,
        title: row.title
      })
      await refreshAllWorkspaces()
      const store = useChatStore.getState()
      store.setSession(created.id, created.title)
      store.setRuntimeId(runtimeId)
      store.setSessionRuntimes({ ...store.sessionRuntimes, [created.id]: runtimeId })
      store.setMessages([])
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(t("chat.importAcpFailed", { message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-separator-border px-3.5 py-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((next) => !next)}
        className="text-caption-2-medium text-text-secondary hover:text-text-primary"
      >
        {busy ? t("chat.agentInspecting") : t("chat.importAcpSessions")}
      </button>
      {error ? (
        <p className="mt-1 text-caption-2-regular text-status-yellow-text">
          {error.startsWith("导入") || error.startsWith("Import")
            ? error
            : t("chat.importAcpListFailed", { message: error })}
        </p>
      ) : null}
      {open && supported && rows && rows.length === 0 && !error ? (
        <p className="mt-1 text-caption-2-regular text-text-tertiary">{t("chat.importAcpEmpty")}</p>
      ) : null}
      {open && rows && rows.length > 0 ? (
        <p className="mt-1 text-caption-2-regular text-text-tertiary">{t("chat.importAcpHint")}</p>
      ) : null}
      {open && rows && rows.length > 0 ? (
        <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.sessionId}>
              <button
                type="button"
                disabled={row.imported || busy}
                onClick={() => void importRow(row)}
                className="w-full truncate rounded-md px-1.5 py-1 text-left text-caption-2-medium text-text-primary hover:bg-background-secondary-hover disabled:text-text-tertiary"
              >
                {row.title || t("chat.importAcpUntitled")}
                {row.imported ? ` · ${t("chat.importAcpImported")}` : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
