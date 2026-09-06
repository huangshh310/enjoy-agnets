/**
 * Composer Agent 动力机架选择器 (Smart Engine HUD)
 * 上层：等高横向引擎切换导轨 (AgentEngineRail)
 * 下层：自适应面板 (CLI 极客面板 或 Enjoy 本地双栏选择器)
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { persistRuntimeId } from "@renderer/hooks/persist-runtime"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import { canSwitchAgent, DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ModelPickerBody } from "../model-picker/model-picker-body"
import { AgentBrandIcon, isAgentToolId } from "./agent-brand-icon"
import { AgentCliPane } from "./agent-cli-pane"
import { AgentEngineRail } from "./agent-engine-rail"
import { cliModelLabel, composerAgentGroups } from "./composer-agents"

export function AgentPicker({
  modelId,
  modelLabel,
  models,
  onModelChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const { primary, soon } = composerAgentGroups(tools)
  const agents = [...primary, ...soon]
  const current = agents.find((item) => item.id === runtimeId)
  const [tabId, setTabId] = useState(runtimeId)
  const tab = agents.find((item) => item.id === tabId) ?? current ?? agents[0]

  useEffect(() => {
    if (open) setTabId(runtimeId)
  }, [open, runtimeId])

  useEffect(() => {
    if (!open || !hasIde()) return
    void getIde().models.list().then((res) => {
      if (!Array.isArray(res)) return
      useChatStore.getState().setModels(res as ModelOption[])
    })
    void getIde().agentTools.detect().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] })
    })
  }, [open, queryClient])

  // 显示的引擎与模型名称
  const currentAgentName = current?.label ?? (runtimeId === DEFAULT_RUNTIME_ID ? "Enjoy 本地" : runtimeId)
  const activeModelDisplay = runtimeId === DEFAULT_RUNTIME_ID ? (modelLabel || modelId) : cliModelLabel(current)

  async function applyAgent(id: string, modelId?: string) {
    if (!isAgentToolId(id)) return
    await persistRuntimeId(id, modelId)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  async function onTab(id: string) {
    setTabId(id)
    const agent = agents.find((item) => item.id === id)
    if (!agent || !canSwitchAgent(agent)) return
    await applyAgent(id)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.selectAgent")}
          className="group inline-flex h-8 max-w-[17rem] min-w-0 items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 text-caption-1-medium text-text-primary shadow-2xs outline-none transition-all duration-150 hover:border-border-button-hover hover:bg-background-secondary-hover active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {/* 品牌微标 */}
          <span className="flex size-4 shrink-0 items-center justify-center">
            <AgentBrandIcon id={runtimeId} size={14} />
          </span>

          {/* 引擎名称与模型标签组合 */}
          <span className="min-w-0 truncate font-medium text-[12px]">
            <span className="text-text-secondary">{currentAgentName}</span>
            {activeModelDisplay ? (
              <>
                <span className="mx-1 text-text-tertiary">·</span>
                <span className="font-semibold text-text-primary">{activeModelDisplay}</span>
              </>
            ) : null}
          </span>

          {/* 就绪状态微灯：未安装用次级色，避免永远绿灯 */}
          <span
            className={`size-1.5 shrink-0 rounded-full shadow-2xs ${
              runtimeId === DEFAULT_RUNTIME_ID || current?.status === "ready"
                ? "bg-accent-500"
                : "bg-text-tertiary"
            }`}
          />

          {/* 展开指示箭头 */}
          <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="flex h-[370px] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      >
        {/* 上层：等高横向引擎导轨 */}
        <AgentEngineRail
          primary={primary}
          selectedId={tab?.id ?? DEFAULT_RUNTIME_ID}
          currentId={runtimeId}
          onSelect={(id) => void onTab(id)}
        />

        {/* 下层：当前引擎的专属面板 */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {tab && tab.id !== DEFAULT_RUNTIME_ID ? (
            <AgentCliPane
              agent={tab}
              onUse={(model) => {
                void applyAgent(tab.id, model?.id).then(() => setOpen(false))
              }}
              onInstalled={() => {
                void queryClient.invalidateQueries({ queryKey: ["settings"] })
              }}
            />
          ) : (
            <ModelPickerBody
              modelId={modelId}
              models={models}
              onSelectModel={(model) => {
                void applyAgent(DEFAULT_RUNTIME_ID)
                onModelChange(model)
                setOpen(false)
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
