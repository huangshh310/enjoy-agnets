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
import type { ProbeState } from "./providers.types"

export function ProviderModelField({
  modelId,
  choices,
  probe,
  onChange,
  onFetch
}: {
  modelId: string
  choices: Array<{ id: string; label: string }>
  probe: ProbeState
  onChange: (modelId: string) => void
  onFetch: () => void
}) {
  const fetching = probe.status === "pending"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-caption-1-medium text-text-secondary">Model ID</Label>
        <span className="text-caption-1-medium text-text-tertiary">
          {choices.length > 0 ? `${choices.length} available` : "Select or enter"}
        </span>
      </div>

      <div className="flex gap-2">
        <ModelCombobox value={modelId} choices={choices} onChange={onChange} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={fetching}
          onClick={onFetch}
          className="shrink-0 gap-1.5"
        >
          <RiRefreshLine className={cx("size-3.5", fetching && "animate-spin")} />
          <span>{fetching ? "Fetching..." : "Fetch"}</span>
        </Button>
      </div>

      <ModelProbeStatus probe={probe} />
    </div>
  )
}

function ModelCombobox({
  value,
  choices,
  onChange
}: {
  value: string
  choices: Array<{ id: string; label: string }>
  onChange: (modelId: string) => void
}) {
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
          <span className={cx("truncate font-mono text-[13px]", value ? "text-text-primary" : "text-text-placeholder")}>
            {selected?.label ?? (value || "Select or enter a model ID")}
          </span>
          <RiArrowDownSLine className="size-4 shrink-0 text-foreground-icon-secondary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-60 w-(--radix-popover-trigger-width) overflow-hidden rounded-2lg border-border-button-default bg-background-primary-default p-0 shadow-card"
      >
        <Command className="rounded-none bg-transparent">
          <CommandInput
            placeholder="Search or enter model ID..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 p-1">
            <CommandEmpty className="py-4 text-center text-caption-1-medium text-text-tertiary">
              No matching models. Type an ID and select it.
            </CommandEmpty>
            <ModelOptions
              choices={choices}
              typed={showTyped ? typed : ""}
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
  onPick
}: {
  choices: Array<{ id: string; label: string }>
  typed: string
  onPick: (id: string) => void
}) {
  return (
    <CommandGroup className="p-0">
      {typed ? (
        <CommandItem
          value={typed}
          onSelect={() => onPick(typed)}
          className="cursor-pointer font-medium text-accent-600"
        >
          <span>Use custom ID: &quot;{typed}&quot;</span>
        </CommandItem>
      ) : null}
      {choices.map((model) => (
        <CommandItem
          key={model.id}
          value={`${model.id} ${model.label}`}
          onSelect={() => onPick(model.id)}
          className="cursor-pointer justify-between"
        >
          <span className="min-w-0 truncate font-mono text-[13px]">{model.id}</span>
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
  if (probe.status === "pending") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-background-tertiary-default px-2.5 py-1.5 text-caption-1-medium text-text-secondary">
        <RiRefreshLine className="size-3.5 animate-spin text-accent-500 shrink-0" />
        <span className="truncate">{probe.message || "Connecting to endpoint and fetching models..."}</span>
      </div>
    )
  }

  if (probe.status === "ok") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-accent-50/50 border border-accent-500/20 px-2.5 py-1.5 text-caption-1-medium text-accent-600">
        <RiCheckLine className="size-3.5 shrink-0" />
        <span className="truncate">{probe.message}</span>
      </div>
    )
  }

  if (probe.status === "error") {
    return (
      <div className="flex items-start gap-1.5 rounded-lg bg-background-secondary-default border border-border-button-default px-2.5 py-1.5 text-caption-1-medium text-text-error-primary">
        <RiInformationLine className="size-3.5 mt-0.5 shrink-0" />
        <span className="break-all">{probe.message}</span>
      </div>
    )
  }

  return (
    <p className="text-caption-1-medium text-text-tertiary">
      Click &quot;Fetch&quot; to discover available models from the endpoint, or type an ID.
    </p>
  )
}
