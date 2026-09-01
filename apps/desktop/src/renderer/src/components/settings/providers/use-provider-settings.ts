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

export type PingStateMap = Record<
  string,
  { status: "idle" | "pending" | "ok" | "error"; latencyMs?: number; message?: string }
>

export function useProviderSettings() {
  const queryClient = useQueryClient()
  const [pingStates, setPingStates] = useState<PingStateMap>({})
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

  const testProviderPing = async (profile: ProviderPublic) => {
    if (!hasIde()) return
    setPingStates((prev) => ({
      ...prev,
      [profile.id]: { status: "pending", message: "Testing speed..." }
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
        [profile.id]: {
          status: res.ok ? "ok" : "error",
          latencyMs: res.latencyMs,
          message: res.message
        }
      }))
    } catch (err) {
      setPingStates((prev) => ({
        ...prev,
        [profile.id]: {
          status: "error",
          message: err instanceof Error ? err.message : String(err)
        }
      }))
    }
  }

  const pingAllProviders = async () => {
    for (const p of providers) {
      void testProviderPing(p)
    }
  }

  return {
    providers,
    editor: session.editor,
    probe: session.probe,
    preset,
    modelChoices,
    pingStates,
    testProviderPing,
    pingAllProviders,
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
      const preset = presetFor(profile.kind as ProviderKind)
      setEditor({
        id: profile.id,
        kind: profile.kind as ProviderKind,
        name: profile.name,
        apiKey: "",
        baseURL: profile.baseURL,
        modelId: profile.modelId,
        apiStyle: isApiStyle(profile.apiStyle)
          ? profile.apiStyle
          : preset.apiStyle,
        fastModelId: profile.fastModelId || "",
        reasoningModelId: profile.reasoningModelId || "",
        contextWindow: profile.contextWindow ?? 128000,
        maxTokens: profile.maxTokens ?? 4096,
        temperature: profile.temperature ?? 0.7,
        reasoningEffort: profile.reasoningEffort,
        customHeaders: profile.customHeaders || "",
        customBody: profile.customBody || "",
        models: profile.models && profile.models.length > 0 ? profile.models : [...preset.models]
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
      await persistSnapshot(queryClient, (await getIde().settings.activateProvider({ id })) as SettingsSnapshot)
    },
    remove: async (id: string) => {
      if (!hasIde()) return
      await persistSnapshot(queryClient, (await getIde().settings.removeProvider({ id })) as SettingsSnapshot)
      if (editor?.id === id) closeEditor()
    },
    fetchModels: async () => {
      if (!editor || !hasIde()) return
      await runProviderProbe(editor, probe.models, setProbe, updateEditor)
      if (editor.id) {
        const providers = (await getIde().settings.listProviders()) as ProviderPublic[]
        queryClient.setQueryData(["settings"], (prev: SettingsSnapshot | undefined) => {
          if (!prev) return prev
          return {
            ...prev,
            providers
          }
        })
      }
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
  if (result.models && result.models.length > 0) {
    patch.models = result.models
    // 如果当前选中的模型不在已拉取的真实模型列表中，则自动切换为第一个真实模型
    if (!editor.modelId || !result.models.some((m) => m.id === editor.modelId)) {
      patch.modelId = result.models[0].id
    }
  }
  if (Object.keys(patch).length > 0) updateEditor(patch)
}

function normalizeInputUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function mergeModelChoices(editor: EditorState | null, discovered: Array<{ id: string; label: string }>) {
  const customModels = editor?.models ?? []
  const presetModels = presetFor(editor?.kind ?? "custom").models
  const merged: Array<{ id: string; label: string }> = []

  const addModel = (model: { id: string; label: string }) => {
    if (!merged.some((item) => item.id === model.id)) {
      merged.push(model)
    }
  }

  // 优先使用远端拉取或用户自定义的模型目录
  for (const m of discovered) addModel(m)
  for (const m of customModels) addModel(m)

  // 仅在完全没有拉取到或自定义任何模型时，才使用预设备选模型
  if (merged.length === 0) {
    for (const m of presetModels) addModel(m)
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
