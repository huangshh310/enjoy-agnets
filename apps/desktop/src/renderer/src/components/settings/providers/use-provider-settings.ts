/**
 * Providers 页的数据与写操作：列表、抽屉编辑、拉模型、检测、开关与复制。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import type { ProviderPublic, SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { presetFor, type ApiStyle, type ProviderKind } from "@enjoy-agents/providers/presets"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  persistSnapshot,
  refreshProviderList,
  runProtocolDetect,
  runProviderProbe,
  saveEditor
} from "./provider-editor-writes"
import { canSaveEditor, editorFromProfile, emptyEditor, IDLE_PROBE, type EditorState, type ProbeState } from "./providers.types"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import {
  SecretWriteUiError,
  secretWriteErrorMessage,
  unwrapSettingsWrite,
  type SecretWriteErrorCode
} from "@renderer/lib/secret-write"
import { useT } from "@renderer/i18n"
import { showAppToast } from "@renderer/lib/app-toast"
import type { DeleteKeychainNoticeHint } from "@renderer/lib/delete-keychain-notice"

export type PingStateMap = Record<
  string,
  { status: "idle" | "pending" | "ok" | "error"; latencyMs?: number; message?: string }
>

export function useProviderSettings() {
  const t = useT()
  const queryClient = useQueryClient()
  const [pingStates, setPingStates] = useState<PingStateMap>({})
  const [detecting, setDetecting] = useState(false)
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const session = useEditorSession(t("settings.providers.customName"))
  const writes = useProviderWrites(queryClient, session, setDetecting)
  const secretStorageAvailable = useChatReadiness().data?.secretStorageAvailable
  const providers = settingsQuery.data?.providers ?? []
  const preset = session.editor ? presetFor(session.editor.kind) : null
  const modelChoices = useMemo(
    () => (session.editor?.models ?? []).filter((model) => model.enabled),
    [session.editor]
  )

  useAutoFetchModels(session.editor, writes.fetchModels)

  return {
    providers,
    editor: session.editor,
    probe: session.probe,
    preset,
    modelChoices,
    pingStates,
    detecting,
    testProviderPing: (profile: ProviderPublic) => void pingOne(profile, t, setPingStates),
    pingAllProviders: () => {
      for (const profile of providers) void pingOne(profile, t, setPingStates)
    },
    canSave: canSaveEditor(session.editor, preset?.requiresKey ?? true),
    secretBlocked: secretStorageAvailable === false,
    openCreate: session.openCreate,
    openEdit: session.openEdit,
    closeEditor: session.closeEditor,
    updateEditor: session.updateEditor,
    ...writes
  }
}

function useEditorSession(customName: string) {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [probe, setProbe] = useState<ProbeState>(IDLE_PROBE)
  return {
    editor,
    probe,
    setProbe,
    openCreate: (kind: ProviderKind, apiStyle?: ApiStyle) => {
      setProbe(IDLE_PROBE)
      const draft = emptyEditor(kind, apiStyle)
      // 预设名是英文 Custom endpoint。新建时改成当前语言的显示名。已有档案不改。
      setEditor(kind === "custom" ? { ...draft, name: customName } : draft)
    },
    openEdit: (profile: ProviderPublic) => {
      setProbe(IDLE_PROBE)
      setEditor(editorFromProfile(profile))
    },
    closeEditor: () => {
      setEditor(null)
      setProbe(IDLE_PROBE)
    },
    updateEditor: (patch: Partial<EditorState>) => {
      setEditor((current) => (current ? { ...current, ...patch } : current))
    }
  }
}

type EditorSession = ReturnType<typeof useEditorSession>

function useProviderWrites(
  queryClient: QueryClient,
  session: EditorSession,
  setDetecting: (value: boolean) => void
) {
  const t = useT()
  const { editor, setProbe, closeEditor, updateEditor } = session
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<SecretWriteErrorCode | null>(null)
  useEffect(() => {
    if (!editor) setSaveError(null)
  }, [editor])
  return {
    saving,
    saveError,
    save: async (activate: boolean) => {
      if (!editor || !hasIde()) return false
      setSaving(true)
      setSaveError(null)
      const outcome = await saveEditor(queryClient, editor, activate)
      setSaving(false)
      if (!outcome.ok) {
        setSaveError(outcome.code)
        return false
      }
      closeEditor()
      return true
    },
    activate: async (id: string) => {
      if (!hasIde()) return
      await writeProviderSnapshot(() => getIde().settings.activateProvider({ id }), queryClient, t)
    },
    remove: async (id: string): Promise<ProviderRemoveResult> => {
      if (!hasIde()) return { ok: false, kind: "other" }
      try {
        await persistSnapshot(queryClient, unwrapSettingsWrite(await getIde().settings.removeProvider({ id })))
        if (editor?.id === id) closeEditor()
        return { ok: true }
      } catch (error) {
        if (error instanceof SecretWriteUiError && error.code === "KEYCHAIN_UNAVAILABLE") {
          return { ok: false, kind: "keychain", hint: { revokeUrl: error.revokeUrl, providerLabel: error.providerLabel } }
        }
        showAppToast(secretWriteErrorMessage(error, t), { tone: "error" })
        return { ok: false, kind: "other" }
      }
    },
    duplicate: async (profile: ProviderPublic) => {
      if (!hasIde()) return
      const name = `${profile.name} ${t("settings.providers.copySuffix")}`.trim()
      await writeProviderSnapshot(
        () => getIde().settings.duplicateProvider({ id: profile.id, name }),
        queryClient,
        t
      )
    },
    setEnabled: async (id: string, enabled: boolean) => {
      if (!hasIde()) return
      await writeProviderSnapshot(
        () => getIde().settings.setProviderEnabled({ id, enabled }),
        queryClient,
        t
      )
    },
    fetchModels: async () => {
      if (!editor || !hasIde()) return
      await runProviderProbe(editor, setProbe, updateEditor)
      if (editor.id) await refreshProviderList(queryClient)
    },
    detect: async () => {
      if (!editor || !hasIde()) return
      setDetecting(true)
      try {
        await runProtocolDetect(editor, updateEditor)
      } finally {
        setDetecting(false)
      }
    }
  }
}

export type ProviderRemoveResult =
  | { ok: true }
  | { ok: false; kind: "keychain"; hint: DeleteKeychainNoticeHint }
  | { ok: false; kind: "other" }

async function writeProviderSnapshot(
  write: () => Promise<unknown>,
  queryClient: QueryClient,
  t: ReturnType<typeof useT>
) {
  try {
    await persistSnapshot(queryClient, unwrapSettingsWrite(await write()))
  } catch (error) {
    showAppToast(secretWriteErrorMessage(error, t), { tone: "error" })
  }
}

async function pingOne(
  profile: ProviderPublic,
  t: ReturnType<typeof useT>,
  setPingStates: (value: PingStateMap | ((prev: PingStateMap) => PingStateMap)) => void
) {
  if (!hasIde()) return
  setPingStates((prev) => ({
    ...prev,
    [profile.id]: { status: "pending", message: t("settings.providers.testingSpeed") }
  }))
  try {
    const res = (await getIde().settings.pingProvider({
      id: profile.id,
      kind: profile.kind,
      baseURL: profile.baseURL,
      apiStyle: profile.apiStyle
    })) as { ok: boolean; latencyMs: number; message: string }
    setPingStates((prev) => ({
      ...prev,
      [profile.id]: { status: res.ok ? "ok" : "error", latencyMs: res.latencyMs, message: res.message }
    }))
  } catch (err) {
    setPingStates((prev) => ({
      ...prev,
      [profile.id]: { status: "error", message: err instanceof Error ? err.message : String(err) }
    }))
  }
}

function useAutoFetchModels(editor: EditorState | null, fetchModels: () => Promise<void>) {
  const fetchRef = useRef(fetchModels)
  fetchRef.current = fetchModels
  useEffect(() => {
    if (!editor) return
    if (!editor.id && presetFor(editor.kind).requiresKey) return
    void fetchRef.current()
  }, [editor?.id, editor?.kind, editor?.baseAPI])
}
