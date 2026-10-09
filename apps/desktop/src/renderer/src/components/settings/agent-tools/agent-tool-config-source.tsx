/**
 * 配置抽屉：执行源路径与官方模型选择（绑定 Enjoy 档案时隐藏，改走动力源）。
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
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigSource({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const selectedModel = tool.models.find((m) => m.id === tool.selectedModel) ?? tool.models[0]
  return (
    <div className="space-y-3 rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption-1-medium text-text-primary">{t("settings.agentTools.execSource")}</span>
        <span
          className="max-w-64 truncate font-mono text-caption-2-medium text-text-secondary"
          title={tool.detectedPath || t("settings.agentTools.globalPath")}
        >
          {tool.detectedPath || t("settings.agentTools.globalPath")}
        </span>
      </div>
      {tool.models.length > 0 && !tool.useCustomProvider ? (
        <div className="flex items-center justify-between border-t border-separator-border/60 pt-2.5">
          <span className="text-caption-1-medium text-text-primary">{t("settings.agentTools.model")}</span>
          <ModelPicker tool={tool} actions={actions} selectedLabel={selectedModel?.label || selectedModel?.id} />
        </div>
      ) : null}
    </div>
  )
}

function ModelPicker({
  tool,
  actions,
  selectedLabel
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  selectedLabel?: string
}) {
  const t = useT()
  const currentId = tool.selectedModel ?? tool.models[0]?.id
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 max-w-64 min-w-0 items-center gap-2 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-left shadow-2xs outline-none transition-colors hover:border-border-button-hover hover:bg-background-secondary-hover focus:ring-1 focus:ring-accent-500"
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            <AgentBrandIcon id={tool.id} size={15} />
          </span>
          <span className="truncate text-caption-1-medium text-text-primary">
            {selectedLabel || t("settings.agentTools.model")}
          </span>
          <RiArrowDownSLine className="ml-auto size-3.5 shrink-0 text-text-tertiary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`${SETTINGS_DRAWER_Z_CLASS.float} max-h-80 w-72 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {tool.models.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => void actions.persist({ modelId: item.id })}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-3.5 shrink-0 items-center justify-center">
                <AgentBrandIcon id={tool.id} size={14} />
              </span>
              <span className="truncate text-caption-1-medium text-text-primary">{item.label}</span>
            </div>
            {item.id === currentId ? (
              <RiCheckLine className="size-3.5 shrink-0 text-accent-500" />
            ) : (
              <span className="max-w-[80px] truncate font-mono text-caption-2-medium text-text-tertiary">
                {item.id}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
