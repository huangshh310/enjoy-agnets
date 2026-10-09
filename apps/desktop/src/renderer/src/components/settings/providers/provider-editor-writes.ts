/**
 * 编辑器的保存、拉目录、检测协议。请求只走 preload，明文 Key 不从回包里读。
 */
import type { QueryClient } from "@tanstack/react-query"
import type { ProviderPublic, SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { isApiStyle, type ApiStyle } from "@enjoy-agents/providers/presets"
import { applySettingsSnapshot } from "@renderer/hooks/use-agent-session"
import { getIde } from "@renderer/lib/ide"
import { applyDetectResults, catalogStyleOf, catalogUrlOf, detectUrlOf, mergeCatalog } from "./provider-editor-form"
import {
  providerUpsertPayload,
  type EditorState,
  type ProbeState
} from "./providers.types"

export async function persistSnapshot(queryClient: QueryClient, snapshot: SettingsSnapshot) {
  queryClient.setQueryData(["settings"], snapshot)
  await applySettingsSnapshot(snapshot)
}

export async function saveEditor(queryClient: QueryClient, editor: EditorState, activate: boolean) {
  await persistSnapshot(
    queryClient,
    (await getIde().settings.upsertProvider(providerUpsertPayload(editor, activate))) as SettingsSnapshot
  )
}

export async function runProviderProbe(
  editor: EditorState,
  setProbe: (probe: ProbeState) => void,
  updateEditor: (patch: Partial<EditorState>) => void
) {
  setProbe({ status: "pending", message: "", code: "catalogPending", models: [] })
  const typedKey = editor.keys.find((key) => key.enabled && key.apiKey.trim())?.apiKey
  try {
    const result = (await getIde().settings.probeProvider({
      id: editor.id,
      kind: editor.kind,
      apiKey: typedKey,
      baseURL: catalogUrlOf(editor),
      modelId: editor.modelId,
      apiStyle: catalogStyleOf(editor),
      customHeaders: editor.customHeaders
    })) as {
      ok: boolean
      message: string
      models: Array<{ id: string; label: string }>
      code?: string
      vars?: Record<string, string>
    }
    setProbe({
      status: result.ok ? "ok" : "error",
      message: result.message,
      code: result.code,
      vars: result.vars,
      models: result.models
    })
    if (!result.ok || result.models.length === 0) return
    const models = mergeCatalog(editor.models, result.models)
    const stillThere = models.some((model) => model.id === editor.modelId)
    updateEditor({
      models,
      modelId: stillThere ? editor.modelId : models.find((model) => model.enabled)?.id ?? editor.modelId
    })
  } catch (error) {
    setProbe({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      models: []
    })
  }
}

export async function runProtocolDetect(
  editor: EditorState,
  updateEditor: (patch: Partial<EditorState>) => void
) {
  const baseURL = detectUrlOf(editor)
  if (!baseURL) {
    updateEditor({ detectMismatch: {} })
    return
  }
  const typedKey = editor.keys.find((key) => key.enabled && key.apiKey.trim())?.apiKey
  const probes = (await getIde().settings.detectProvider({
    id: editor.id,
    kind: editor.kind,
    apiKey: typedKey,
    baseURL,
    modelId: editor.modelId || "detect",
    customHeaders: editor.customHeaders
  })) as Array<{ style: string; ok: boolean; base: string; code: string }>
  const typed = probes.filter((probe): probe is { style: ApiStyle; ok: boolean; base: string; code: string } =>
    isApiStyle(probe.style)
  )
  updateEditor(applyDetectResults(editor.endpoints, typed))
}

export async function refreshProviderList(queryClient: QueryClient) {
  const providers = (await getIde().settings.listProviders()) as ProviderPublic[]
  queryClient.setQueryData(["settings"], (prev: SettingsSnapshot | undefined) => {
    if (!prev) return prev
    return { ...prev, providers }
  })
}
