/**
 * Providers 页的数据与写操作：列表查询、弹层编辑、拉模型、启用与删除。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import type { ProviderPublic, SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { isApiStyle, presetFor, type ApiStyle, type ProviderKind } from "@enjoy-agents/providers/presets"
import { applySettingsSnapshot } from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { emptyEditor, IDLE_PROBE, type EditorState, type ProbeState } from "./providers.types"

export function useProviderSettings() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const session = useEditorSession()
  const writes = useProviderWrites(queryClient, session)
  const providers = settingsQuery.data?.providers ?? []
  const preset = session.editor ? presetFor(session.editor.kind) : null
  const modelChoices = useMemo(
    () => mergeModelChoices(session.editor, session.probe.models),
    [session.editor, session.probe.models]
  )

  useAutoFetchModels(session.editor, writes.fetchModels)

  return {
    providers,
    editor: session.editor,
    probe: session.probe,
    preset,
    modelChoices,
    canSave: canSaveEditor(session.editor, preset?.requiresKey ?? true),
    openCreate: session.openCreate,
    openEdit: session.openEdit,
    closeEditor: session.closeEditor,
    changeKind: session.changeKind,
    updateEditor: session.updateEditor,
    ...writes
  }
}

function useEditorSession() {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [probe, setProbe] = useState<ProbeState>(IDLE_PROBE)

  return {
    editor,
    probe,
    setProbe,
    openCreate: (kind: ProviderKind, apiStyle?: ApiStyle) => {
      setProbe(IDLE_PROBE)
      setEditor(emptyEditor(kind, apiStyle))
    },
    openEdit: (profile: ProviderPublic) => {
      setProbe(IDLE_PROBE)
      setEditor({
        id: profile.id,
        kind: profile.kind as ProviderKind,
        name: profile.name,
        apiKey: "",
        baseURL: profile.baseURL,
        modelId: profile.modelId,
        apiStyle: isApiStyle(profile.apiStyle)
          ? profile.apiStyle
          : presetFor(profile.kind as ProviderKind).apiStyle
      })
    },
    closeEditor: () => {
      setEditor(null)
      setProbe(IDLE_PROBE)
    },
    changeKind: (kind: ProviderKind) => {
      const next = emptyEditor(kind)
      setEditor((current) => (current ? { ...next, id: current.id, apiKey: current.apiKey } : next))
      setProbe(IDLE_PROBE)
    },
    updateEditor: (patch: Partial<EditorState>) => {
      setEditor((current) => (current ? { ...current, ...patch } : current))
      if (patch.apiStyle) setProbe(IDLE_PROBE)
    }
  }
}

type EditorSession = ReturnType<typeof useEditorSession>

function useProviderWrites(queryClient: QueryClient, session: EditorSession) {
  const { editor, probe, setProbe, closeEditor, updateEditor } = session

  return {
    save: async (activate: boolean) => {
      if (!editor || !hasIde()) return
      await persistSnapshot(queryClient, await getIde().settings.upsertProvider({
        ...editor,
        activate
      }) as SettingsSnapshot)
      closeEditor()
    },
    activate: async (id: string) => {
      if (!hasIde()) return
      await persistSnapshot(queryClient, (await getIde().settings.activateProvider(id)) as SettingsSnapshot)
    },
    remove: async (id: string) => {
      if (!hasIde()) return
      await persistSnapshot(queryClient, (await getIde().settings.removeProvider(id)) as SettingsSnapshot)
      if (editor?.id === id) closeEditor()
    },
    fetchModels: async () => {
      if (!editor || !hasIde()) return
      await runProviderProbe(editor, probe.models, setProbe, updateEditor)
    }
  }
}

async function persistSnapshot(queryClient: QueryClient, snapshot: SettingsSnapshot) {
  queryClient.setQueryData(["settings"], snapshot)
  await applySettingsSnapshot(snapshot)
}

async function runProviderProbe(
  editor: EditorState,
  currentModels: ProbeState["models"],
  setProbe: (probe: ProbeState) => void,
  updateEditor: (patch: Partial<EditorState>) => void
) {
  setProbe({ status: "pending", message: "Fetching models…", models: currentModels })
  try {
    const result = (await getIde().settings.probeProvider({
      id: editor.id,
      kind: editor.kind,
      apiKey: editor.apiKey,
      baseURL: editor.baseURL,
      modelId: editor.modelId,
      apiStyle: editor.apiStyle
    })) as {
      ok: boolean
      message: string
      models: Array<{ id: string; label: string }>
      resolvedBaseURL?: string
    }
    setProbe({ status: result.ok ? "ok" : "error", message: result.message, models: result.models })
    applyProbeToEditor(editor, result, updateEditor)
  } catch (error) {
    setProbe({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      models: []
    })
  }
}

function applyProbeToEditor(
  editor: EditorState,
  result: { ok: boolean; models: Array<{ id: string; label: string }>; resolvedBaseURL?: string },
  updateEditor: (patch: Partial<EditorState>) => void
) {
  if (!result.ok) return
  const patch: Partial<EditorState> = {}
  if (result.resolvedBaseURL && result.resolvedBaseURL !== normalizeInputUrl(editor.baseURL)) {
    patch.baseURL = result.resolvedBaseURL
  }
  if (result.models[0] && !editor.modelId) {
    patch.modelId = result.models[0].id
  }
  if (Object.keys(patch).length > 0) updateEditor(patch)
}

function normalizeInputUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function mergeModelChoices(editor: EditorState | null, discovered: Array<{ id: string; label: string }>) {
  const presetModels = presetFor(editor?.kind ?? "custom").models
  const merged = [...discovered]
  for (const model of presetModels) {
    if (!merged.some((item) => item.id === model.id)) merged.push(model)
  }
  if (editor?.modelId && !merged.some((item) => item.id === editor.modelId)) {
    merged.unshift({ id: editor.modelId, label: editor.modelId })
  }
  return merged
}

/** 编辑已有配置（或无需 Key 的本地端点）时自动拉一次模型目录。 */
function useAutoFetchModels(editor: EditorState | null, fetchModels: () => Promise<void>) {
  const fetchRef = useRef(fetchModels)
  fetchRef.current = fetchModels

  useEffect(() => {
    if (!editor) return
    if (!editor.id && presetFor(editor.kind).requiresKey) return
    void fetchRef.current()
  }, [editor?.id, editor?.kind, editor?.apiStyle])
}

function canSaveEditor(editor: EditorState | null, requiresKey: boolean) {
  if (!editor?.name.trim() || !editor.modelId.trim()) return false
  if (!requiresKey) return true
  return Boolean(editor.id || editor.apiKey.trim())
}
