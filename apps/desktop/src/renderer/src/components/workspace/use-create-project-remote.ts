/**
 * 创建项目远程步：探测、浏览、组装 OpenSsh 入参。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { SshBrowseResult, SshHost } from "@enjoy-agents/ipc-contract"
import { draftToUpsert, emptyHostDraft, type SshHostDraft } from "../settings/workspace/ssh-host-fields"
import type { RemoteConnectInput } from "./remote-connect.types"

export function useCreateProjectRemote(projectName: string, onConnect: (input: RemoteConnectInput) => void) {
  const t = useT()
  const [hostId, setHostId] = useState("")
  const [remotePath, setRemotePath] = useState("")
  const [draft, setDraft] = useState<SshHostDraft>(emptyHostDraft())
  const [probeNote, setProbeNote] = useState<string | null>(null)
  const [listing, setListing] = useState<SshBrowseResult | null>(null)
  const [busy, setBusy] = useState(false)
  const hostsQuery = useQuery({
    queryKey: ["ssh-hosts"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.sshHosts.list() as Promise<SshHost[]>
  })
  const hosts = hostsQuery.data ?? []
  const selected = hosts.find((item) => item.id === hostId)
  const usingNew = hostId === "__new__" || (!hostId && hosts.length === 0)
  return {
    t,
    hostId,
    setHostId,
    remotePath,
    setRemotePath,
    draft,
    setDraft,
    probeNote,
    listing,
    setListing,
    busy,
    hosts,
    selected,
    usingNew,
    hostReady: Boolean(selected || (draft.host.trim() && draft.user.trim())),
    testConnection: () => runProbe(selected, draft, t, setBusy, setProbeNote),
    browse: (path?: string) => runBrowse(selected, draft, path, setBusy, setProbeNote, setListing, setRemotePath),
    submit: () => submitRemote(selected, draft, remotePath, projectName, onConnect)
  }
}

function probePayload(selected: SshHost | undefined, draft: SshHostDraft) {
  if (selected) return { hostId: selected.id, ...(draft.password.trim() ? { password: draft.password.trim() } : {}) }
  const upsert = draftToUpsert(draft)
  return {
    host: upsert.host,
    user: upsert.user,
    port: upsert.port,
    auth: upsert.auth,
    keyPath: upsert.keyPath,
    password: upsert.password
  }
}

async function runProbe(
  selected: SshHost | undefined,
  draft: SshHostDraft,
  t: (path: string) => string,
  setBusy: (value: boolean) => void,
  setProbeNote: (value: string | null) => void
) {
  if (!hasIde()) return
  if (!selected && !(draft.host.trim() && draft.user.trim())) return
  setBusy(true)
  setProbeNote(null)
  try {
    const result = (await getIde().workspace.sshProbe(probePayload(selected, draft))) as { ok: boolean; error?: string }
    setProbeNote(result.ok ? t("pages.workspaces.createProject.probeOk") : (result.error ?? t("settings.workspace.sshFailed")))
  } catch (err) {
    setProbeNote(err instanceof Error ? err.message : String(err))
  } finally {
    setBusy(false)
  }
}

async function runBrowse(
  selected: SshHost | undefined,
  draft: SshHostDraft,
  path: string | undefined,
  setBusy: (value: boolean) => void,
  setProbeNote: (value: string | null) => void,
  setListing: (value: SshBrowseResult | null) => void,
  setRemotePath: (value: string) => void
) {
  if (!hasIde()) return
  if (!selected && !(draft.host.trim() && draft.user.trim())) return
  setBusy(true)
  setProbeNote(null)
  try {
    const result = (await getIde().workspace.sshBrowse({ ...probePayload(selected, draft), path })) as SshBrowseResult
    setListing(result)
    setRemotePath(result.path)
  } catch (err) {
    setProbeNote(err instanceof Error ? err.message : String(err))
  } finally {
    setBusy(false)
  }
}

function submitRemote(
  selected: SshHost | undefined,
  draft: SshHostDraft,
  remotePath: string,
  projectName: string,
  onConnect: (input: RemoteConnectInput) => void
) {
  const path = remotePath.trim()
  if (!path) return
  if (selected) {
    const password = draft.password.trim()
    onConnect({
      hostId: selected.id,
      host: selected.host,
      user: selected.user,
      port: selected.port,
      auth: password ? "password" : selected.auth,
      keyPath: selected.keyPath,
      ...(password ? { password } : {}),
      remotePath: path,
      name: projectName.trim() || undefined,
      source: selected.source
    })
    return
  }
  onConnect({ ...draftToUpsert(draft), remotePath: path, name: projectName.trim() || undefined })
}
