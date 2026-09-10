/**
 * OMP 动力源槽：自己的供应商 + 模型，禁止套 Enjoy vault 下拉。
 */
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import { SETTINGS_DRAWER_Z_CLASS } from "../../settings-overlay"
import { formatPowerSourceText } from "./format-power-source"
import { powerSourcePartsForTool } from "./resolve-row-source"
import type { AgentToolActions } from "../use-agent-tool-actions"

export function OmpPowerSlot({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const parts = powerSourcePartsForTool(tool)
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border-button-default bg-background-secondary-default/40 px-3 py-2.5">
        <p className="text-caption-1-medium text-text-primary">{formatPowerSourceText(parts, t)}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.ompNotVaultHint")}
        </p>
      </div>
      {tool.models.length > 0 ? <OmpModelPicker tool={tool} actions={actions} /> : null}
    </div>
  )
}

function OmpModelPicker({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const currentId = tool.selectedModel ?? tool.models[0]?.id
  const current = tool.models.find((item) => item.id === currentId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 text-left shadow-2xs outline-none hover:border-border-button-hover focus:ring-1 focus:ring-accent-500"
        >
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
            {current?.label || current?.id || t("settings.agentTools.model")}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`${SETTINGS_DRAWER_Z_CLASS.float} max-h-80 w-72 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {tool.models.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => void actions.persist({ modelId: item.id })}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
          >
            <span className="min-w-0 truncate text-caption-1-medium text-text-primary">{item.label}</span>
            {item.id === currentId ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
