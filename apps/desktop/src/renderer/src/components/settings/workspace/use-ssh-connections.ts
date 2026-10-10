/**
 * 远程连接名册状态：列表 / 发现 / 添加 / 探测。
 */
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { SshConfigCandidate, SshHost, SshHostUpsertInput } from "@enjoy-agents/ipc-contract"
import { secretWriteErrorMessage, unwrapSecretWrite } from "@renderer/lib/secret-write"
import { draftToUpsert, emptyHostDraft, hostToDraft, type SshHostDraft } from "./ssh-host-fields.types"

export function useSshConnections() {
  const t = useT()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SshHostDraft>(emptyHostDraft())
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hostsQuery = useQuery({
    queryKey: ["ssh-hosts"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.sshHosts.list() as Promise<SshHost[]>
  })
  const discoverQuery = useQuery({
    queryKey: ["ssh-hosts-discover"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.sshHosts.discover() as Promise<SshConfigCandidate[]>
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["ssh-hosts"] })
    await queryClient.invalidateQueries({ queryKey: ["ssh-hosts-discover"] })
  }

  const isEditing = Boolean(draft.id)

  return {
    t,
    draft,
    setDraft,
    open,
    setOpen,
    busy,
    error,
    isEditing,
    hosts: hostsQuery.data ?? [],
    discovered: discoverQuery.data ?? [],
    startEdit: (host: SshHost) => {
      setDraft(hostToDraft(host))
      setError(null)
      setOpen(true)
    },
    cancelEdit: () => {
      setDraft(emptyHostDraft())
      setError(null)
      setOpen(false)
    },
    addHost: async (input: SshHostUpsertInput) => {
      if (!hasIde()) return
      setBusy(true)
      setError(null)
      try {
        unwrapSecretWrite(await getIde().workspace.sshHosts.upsert(input))
        setDraft(emptyHostDraft())
        setOpen(false)
        await refresh()
      } catch (err) {
        setError(secretWriteErrorMessage(err, t))
      } finally {
        setBusy(false)
      }
    },
    saveDraft: async () => {
      if (!hasIde()) return
      setBusy(true)
      setError(null)
      try {
        const payload = draftToUpsert(draft)
        unwrapSecretWrite(await getIde().workspace.sshHosts.upsert(payload))
        setDraft(emptyHostDraft())
        setOpen(false)
        await refresh()
      } catch (err) {
        setError(secretWriteErrorMessage(err, t))
      } finally {
        setBusy(false)
      }
    },
    removeHost: async (id: string) => {
      if (!hasIde()) return
      setError(null)
      try {
        await getIde().workspace.sshHosts.remove({ id })
        if (draft.id === id) {
          setDraft(emptyHostDraft())
          setOpen(false)
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    probeHost: async (id: string): Promise<{ ok: boolean; error?: string }> => {
      if (!hasIde()) return { ok: false, error: "IDE not available" }
      setError(null)
      try {
        const result = (await getIde().workspace.sshProbe({ hostId: id })) as { ok: boolean; error?: string }
        if (!result.ok) {
          setError(result.error ?? t("settings.workspace.sshFailed"))
        }
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return { ok: false, error: message }
      }
    },
    probeDraft: async (): Promise<{ ok: boolean; error?: string }> => {
      if (!hasIde()) return { ok: false, error: "IDE not available" }
      setError(null)
      try {
        const upsert = draftToUpsert(draft)
        const result = (await getIde().workspace.sshProbe(upsert)) as { ok: boolean; error?: string }
        if (!result.ok) {
          setError(result.error ?? t("settings.workspace.sshFailed"))
        }
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return { ok: false, error: message }
      }
    },
    openConfigFile: async (customPath?: string): Promise<{ ok: boolean; path: string; error?: string } | undefined> => {
      if (!hasIde()) return undefined
      try {
        const res = (await (getIde().workspace.sshHosts as unknown as {
          openConfig: (input?: { path?: string }) => Promise<{ ok: boolean; path: string; error?: string }>
        }).openConfig({ path: customPath }))
        if (res && !res.ok && res.error) {
          setError(res.error)
        }
        return res
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return { ok: false, path: customPath || "", error: message }
      }
    }
  }
}

