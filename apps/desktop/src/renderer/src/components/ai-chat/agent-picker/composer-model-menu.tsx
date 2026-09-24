/**
 * Composer 里的模型菜单。多家供应商先下拉选一家，名单只显示这一家。
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { RiSearchLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { isVideoOnlyModelId } from "@enjoy-agents/providers/capabilities"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import type { ModelOption } from "@renderer/stores/chat-store"
import { groupModelsByProvider } from "../model-picker/group-models"
import { modelsInProvider, needsProviderMenu, promoteCurrentGroup, providerKeyForModel } from "./composer-model-menu-filter"
import { ComposerModelMenuRow } from "./composer-model-menu-row"
import { ComposerModelProviderDrop } from "./composer-model-provider-drop"

export function ComposerModelMenu({
  modelId,
  models,
  rename,
  onSelectModel
}: {
  modelId: string
  models: ModelOption[]
  rename?: ReactNode
  onSelectModel: (model: ModelOption) => void
}) {
  const menu = useComposerModelMenu(modelId, models)
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
      {menu.showProvider ? (
        <ComposerModelProviderDrop groups={menu.catalog} selectedKey={menu.providerKey} onSelect={menu.setProviderKey} />
      ) : null}
      <ModelSearch query={menu.query} placeholder={menu.searchPlaceholder} onChange={menu.setQuery} />
      <ModelGroups
        groups={menu.visible}
        modelId={modelId}
        query={menu.query}
        emptyCatalog={models.length === 0}
        experimentalMedia={menu.experimentalMedia}
        onSelectModel={onSelectModel}
      />
      <MenuFoot rename={rename} />
    </div>
  )
}

function useComposerModelMenu(modelId: string, models: ModelOption[]) {
  const t = useT()
  const [query, setQuery] = useState("")
  const experimentalMedia = useSettingsSnapshot().data?.preferences.experimentalMedia ?? false
  const catalog = useMemo(() => promoteCurrentGroup(groupModelsByProvider(models), modelId), [models, modelId])
  const [providerKey, setProviderKey] = useState(() => providerKeyForModel(catalog, modelId))
  useEffect(() => {
    if (!catalog.some((group) => group.key === providerKey)) setProviderKey(providerKeyForModel(catalog, modelId))
  }, [catalog, modelId, providerKey])
  const provider = catalog.find((group) => group.key === providerKey) ?? catalog[0]
  const visible = useMemo(() => modelsInProvider(catalog, providerKey, query), [catalog, providerKey, query])
  return {
    query,
    setQuery,
    catalog,
    providerKey,
    setProviderKey,
    visible,
    experimentalMedia,
    showProvider: needsProviderMenu(catalog.length),
    searchPlaceholder: provider ? t("chat.searchInProvider", { name: provider.providerName }) : t("chat.searchModels")
  }
}

function ModelSearch({
  query,
  placeholder,
  onChange
}: {
  query: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex h-9 shrink-0 items-center gap-2 border-b border-separator-border px-3">
      <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
      <input
        value={query}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-caption-1-regular text-text-primary outline-none placeholder:text-text-placeholder"
      />
    </label>
  )
}

function ModelGroups({
  groups,
  modelId,
  query,
  emptyCatalog,
  experimentalMedia,
  onSelectModel
}: {
  groups: ReadonlyArray<{ key: string; providerName: string; models: ModelOption[] }>
  modelId: string
  query: string
  emptyCatalog: boolean
  experimentalMedia: boolean
  onSelectModel: (model: ModelOption) => void
}) {
  const t = useT()
  if (groups.length === 0) {
    return (
      <p className="px-3 py-4 text-caption-1-regular text-text-secondary">
        {emptyCatalog ? t("chat.noProvidersYet") : t("chat.noModelsMatching", { query })}
      </p>
    )
  }
  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 py-1">
      {groups.map((group) => (
        <section key={group.key}>
          {group.models.map((model) => (
            <ComposerModelMenuRow
              key={`${group.key}-${model.id}`}
              model={model}
              selected={model.id === modelId}
              videoLocked={isVideoOnlyModelId(model.id) && !experimentalMedia}
              onSelect={onSelectModel}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function MenuFoot({ rename }: { rename?: ReactNode }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-separator-border px-2">
      {rename}
      <button
        type="button"
        onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
        className="ml-auto text-caption-2-medium text-text-tertiary hover:text-text-primary"
      >
        {t("chat.manageProviders")}
      </button>
    </div>
  )
}
