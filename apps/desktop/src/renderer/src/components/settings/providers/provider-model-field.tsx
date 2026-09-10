/**
 * 模型选择与远端发现组件：
 * 支持快速 Combobox 搜索过滤、手动输入自定义 ID，以及一键探测并获取远端所有可用模型。
 */
import { useState } from "react"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiInformationLine,
  RiRefreshLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "./provider-icons"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { displayProbeMessage } from "./display-probe-message"
import type { ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderModelField({
  modelId,
  choices,
  probe,
  providerKind,
  apiStyle,
  onChange,
  onFetch
}: {
  modelId: string
  choices: Array<{ id: string; label: string }>
  probe: ProbeState
  providerKind?: string
  apiStyle?: string
  onChange: (modelId: string) => void
  onFetch: () => void
}) {
  const t = useT()
  const fetching = probe.status === "pending"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.modelId")}</Label>
        <span className="text-caption-1-medium text-text-tertiary">
          {choices.length > 0 ? t("settings.providers.available", { count: choices.length }) : t("settings.providers.selectOrEnter")}
        </span>
      </div>

      <div className="flex gap-2">
        <ModelCombobox
          value={modelId}
          choices={choices}
          providerKind={providerKind}
          apiStyle={apiStyle}
          onChange={onChange}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={fetching}
          onClick={onFetch}
          className="shrink-0 gap-1.5"
        >
          <span>{fetching ? t("settings.providers.fetching") : t("settings.providers.fetch")}</span>
        </Button>
      </div>

      <ModelProbeStatus probe={probe} />
    </div>
  )
}

function ModelCombobox({
  value,
  choices,
  providerKind,
  apiStyle,
  onChange
}: {
  value: string
  choices: Array<{ id: string; label: string }>
  providerKind?: string
  apiStyle?: string
  onChange: (modelId: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selected = choices.find((item) => item.id === value)
  const typed = query.trim()
  const showTyped = Boolean(typed) && !choices.some((item) => item.id === typed)

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-0 flex-1 justify-between px-3 font-normal"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-4.5 shrink-0 items-center justify-center">
              <ModelBrandIcon
                modelId={value}
                providerKind={providerKind}
                apiStyle={apiStyle}
                size={16}
              />
            </div>
            <span
              className={cx(
                "truncate font-mono text-[13px]",
                value ? "text-text-primary" : "text-text-placeholder"
              )}
            >
              {selected?.label ?? (value || t("settings.providers.selectId"))}
            </span>
          </div>
          <RiArrowDownSLine className="size-4 shrink-0 text-foreground-icon-secondary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={`${SETTINGS_DRAWER_Z_CLASS.float} w-(--radix-popover-trigger-width) overflow-hidden rounded-2lg border-border-button-default bg-background-primary-default p-0 shadow-card`}
      >
        <Command className="rounded-none bg-transparent">
          <CommandInput
            placeholder={t("settings.providers.searchId")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 p-1">
            <CommandEmpty className="py-4 text-center text-caption-1-medium text-text-tertiary">
              {t("settings.providers.noMatch")}
            </CommandEmpty>
            <ModelOptions
              choices={choices}
              typed={showTyped ? typed : ""}
              providerKind={providerKind}
              apiStyle={apiStyle}
              onPick={(id) => {
                onChange(id)
                setOpen(false)
                setQuery("")
              }}
            />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ModelOptions({
  choices,
  typed,
  providerKind,
  apiStyle,
  onPick
}: {
  choices: Array<{ id: string; label: string }>
  typed: string
  providerKind?: string
  apiStyle?: string
  onPick: (id: string) => void
}) {
  const t = useT()
  return (
    <CommandGroup className="p-0">
      {typed ? (
        <CommandItem
          value={typed}
          onSelect={() => onPick(typed)}
          className="cursor-pointer font-medium text-accent-600 gap-2"
        >
          <ModelBrandIcon
            modelId={typed}
            providerKind={providerKind}
            apiStyle={apiStyle}
            size={15}
          />
          <span>{t("settings.providers.useCustom", { id: typed })}</span>
        </CommandItem>
      ) : null}
      {choices.map((model) => (
        <CommandItem
          key={model.id}
          value={`${model.id} ${model.label}`}
          onSelect={() => onPick(model.id)}
          className="cursor-pointer justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-4 shrink-0 items-center justify-center">
              <ModelBrandIcon
                modelId={model.id}
                providerKind={providerKind}
                apiStyle={apiStyle}
                size={15}
              />
            </div>
            <span className="min-w-0 truncate font-mono text-[13px]">{model.id}</span>
          </div>
          {model.label && model.label !== model.id ? (
            <span className="shrink-0 truncate text-caption-1-medium text-text-tertiary ml-2">
              {model.label}
            </span>
          ) : null}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

function ModelProbeStatus({ probe }: { probe: ProbeState }) {
  const t = useT()
  const text = displayProbeMessage(probe, t)
  if (probe.status === "pending") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-background-tertiary-default px-2.5 py-1.5 text-caption-1-medium text-text-secondary">
        <RiRefreshLine className="size-3.5 animate-spin text-accent-500 shrink-0" />
        <span className="truncate">{text || t("settings.providers.connecting")}</span>
      </div>
    )
  }

  if (probe.status === "ok") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-accent-50/50 border border-accent-500/20 px-2.5 py-1.5 text-caption-1-medium text-accent-600">
        <RiCheckLine className="size-3.5 shrink-0" />
        <span className="truncate">{text}</span>
      </div>
    )
  }

  if (probe.status === "error") {
    return (
      <div className="flex items-start gap-1.5 rounded-lg bg-background-secondary-default border border-border-button-default px-2.5 py-1.5 text-caption-1-medium text-text-error-primary">
        <RiInformationLine className="size-3.5 mt-0.5 shrink-0" />
        <span className="text-pretty">{text}</span>
      </div>
    )
  }

  return (
    <p className="text-caption-1-medium text-text-tertiary">{t("settings.providers.fetchHint")}</p>
  )
}
