/**
 * 从已配置 Providers 中选择多模态模型的 Popover 组合选择器。
 */
import { useMemo, useState } from "react"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiInformationLine,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import type { ModelOption } from "@renderer/stores/chat-store"
import { ModelBrandIcon, ProviderIcon } from "./providers/provider-icons"
import { filterModelGroups, groupModelsByProvider, type ProviderModelGroup } from "./settings-media-model-groups"

export type MediaModelCategory = "image" | "video" | "speech" | "transcription"

const CATEGORY_TITLE: Record<MediaModelCategory, string> = {
  image: "Image Generation",
  video: "Video Generation",
  speech: "Speech (TTS)",
  transcription: "Transcription (STT)"
}

export function ConfiguredMediaModelSelector({
  selectedModelId,
  fallbackPlaceholder,
  category,
  models,
  allConfiguredModels,
  onSelect,
  onNavigateProviders
}: {
  selectedModelId?: string
  fallbackPlaceholder: string
  category: MediaModelCategory
  models: ModelOption[]
  allConfiguredModels: ModelOption[]
  onSelect: (modelId: string) => void
  onNavigateProviders: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [customInput, setCustomInput] = useState("")
  const [isCustomMode, setIsCustomMode] = useState(false)

  const activeModel = useMemo(() => {
    if (!selectedModelId) return undefined
    return allConfiguredModels.find((model) => model.id === selectedModelId)
  }, [allConfiguredModels, selectedModelId])

  const groupedModels = useMemo(() => groupModelsByProvider(models), [models])
  const filteredGroups = useMemo(
    () => filterModelGroups(groupedModels, search),
    [groupedModels, search]
  )

  return (
    <div className="flex w-full max-w-[340px] flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cx(
              "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5",
              "cursor-pointer text-left shadow-2xs outline-none transition-colors group hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            )}
          >
            <SelectorTriggerLabel
              selectedModelId={selectedModelId}
              activeModel={activeModel}
              fallbackPlaceholder={fallbackPlaceholder}
            />
            <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className="flex w-[340px] flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
        >
          <SelectorSearch value={search} onChange={setSearch} />
          <SelectorModelList
            groups={filteredGroups}
            selectedModelId={selectedModelId}
            category={category}
            onSelect={(id) => {
              onSelect(id)
              setOpen(false)
            }}
            onNavigateProviders={() => {
              setOpen(false)
              onNavigateProviders()
            }}
          />
          <SelectorCustomId
            isCustomMode={isCustomMode}
            customInput={customInput}
            onCustomInput={setCustomInput}
            onStartCustom={() => setIsCustomMode(true)}
            onApply={() => {
              const trimmed = customInput.trim()
              if (!trimmed) return
              onSelect(trimmed)
              setIsCustomMode(false)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function SelectorTriggerLabel({
  selectedModelId,
  activeModel,
  fallbackPlaceholder
}: {
  selectedModelId?: string
  activeModel?: ModelOption
  fallbackPlaceholder: string
}) {
  if (!selectedModelId) {
    return (
      <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-placeholder">
        {fallbackPlaceholder}
      </span>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex size-4.5 shrink-0 items-center justify-center">
        <ModelBrandIcon
          modelId={selectedModelId}
          providerKind={activeModel?.provider}
          apiStyle={activeModel?.apiStyle}
          size={16}
        />
      </div>
      <span className="truncate text-caption-1-medium text-text-primary">
        {activeModel?.label || selectedModelId}
      </span>
      {activeModel?.providerName ? (
        <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-tertiary">
          {activeModel.providerName}
        </span>
      ) : null}
    </div>
  )
}

function SelectorSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative mb-1.5 px-1">
      <RiSearchLine className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search configured models..."
        className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pr-3 pl-8 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
      />
    </div>
  )
}

function SelectorModelList({
  groups,
  selectedModelId,
  category,
  onSelect,
  onNavigateProviders
}: {
  groups: ProviderModelGroup[]
  selectedModelId?: string
  category: MediaModelCategory
  onSelect: (id: string) => void
  onNavigateProviders: () => void
}) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-background-secondary-default text-text-tertiary">
          <RiInformationLine className="size-4" />
        </div>
        <p className="text-caption-2-medium text-text-primary">No {CATEGORY_TITLE[category]} models found</p>
        <p className="mt-0.5 text-caption-2-regular leading-snug text-text-tertiary">
          Add or detect models in your configured Providers.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onNavigateProviders}
          className="mt-3 inline-flex h-7 cursor-pointer items-center gap-1 px-2.5 text-caption-2-medium"
        >
          <span>Go to Providers</span>
          <RiExternalLinkLine className="size-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-0.5">
      {groups.map((group) => (
        <div key={group.providerName} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 text-caption-2-semibold tracking-wider text-text-tertiary uppercase">
            <ProviderIcon kind={group.providerKind} size={12} />
            <span>{group.providerName}</span>
          </div>
          {group.items.map((model) => {
            const isSelected = model.id === selectedModelId
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model.id)}
                className={cx(
                  "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors",
                  isSelected
                    ? "bg-background-secondary-default font-medium text-text-primary"
                    : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ModelBrandIcon
                    modelId={model.id}
                    providerKind={model.provider}
                    apiStyle={model.apiStyle}
                    size={14}
                  />
                  <span className="truncate text-caption-2-medium">{model.label || model.id}</span>
                </div>
                {isSelected ? <RiCheckLine className="ml-1.5 size-3.5 shrink-0 text-accent-500" /> : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SelectorCustomId({
  isCustomMode,
  customInput,
  onCustomInput,
  onStartCustom,
  onApply
}: {
  isCustomMode: boolean
  customInput: string
  onCustomInput: (value: string) => void
  onStartCustom: () => void
  onApply: () => void
}) {
  return (
    <div className="mt-2 border-t border-separator-border px-1 pt-2">
      {!isCustomMode ? (
        <button
          type="button"
          onClick={onStartCustom}
          className="w-full cursor-pointer px-2 py-1 text-left text-caption-2-regular text-text-tertiary transition-colors hover:text-accent-500"
        >
          + Enter custom Model ID manually...
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            value={customInput}
            onChange={(event) => onCustomInput(event.target.value)}
            placeholder="Custom model id (e.g. dall-e-3)"
            className="h-7 flex-1 px-2 text-caption-2-regular"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={onApply}
            disabled={!customInput.trim()}
            className="h-7 cursor-pointer px-2 text-caption-2-medium"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}


