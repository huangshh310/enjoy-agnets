/**
 * Composer 顶栏模型芯片：只打开当前引擎名单。换引擎仍走导轨 / AgentPicker。
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { requestModelSwitch } from "@renderer/components/ai-chat/agent-picker/request-model-switch"
import { completeCliEngineLogin } from "@renderer/components/ai-chat/agent-picker/cli-login-action"
import { ModelSwitchBadge } from "@renderer/components/ai-chat/agent-picker/model-switch-badge"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { ModelSwitchToast } from "./model-switch-feedback"
import { ModelSwitchPanel, type SwitchableModel } from "./model-switch-panel"
import { useComposerModelSwitch } from "./use-composer-model-switch"

export function ComposerModelChip({
  modelId,
  modelLabel,
  models,
  menuOpen,
  onMenuOpenChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  menuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [innerOpen, setInnerOpen] = useState(false)
  const open = menuOpen ?? innerOpen
  const setOpen = onMenuOpenChange ?? setInnerOpen
  const [toastLabel, setToastLabel] = useState<string | null>(null)
  const state = useComposerModelSwitch({ modelId, modelLabel, models })

  useEffect(() => {
    if (!toastLabel) return
    const timer = window.setTimeout(() => setToastLabel(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toastLabel])

  async function pick(model: SwitchableModel) {
    const result = await requestModelSwitch(model.id)
    setOpen(false)
    if (result !== "applied") return
    setToastLabel(model.label)
  }

  async function retry() {
    if (!hasIde()) return
    try {
      if (state.kind === "needs_login" && state.runtimeId !== DEFAULT_RUNTIME_ID) {
        await completeCliEngineLogin({ toolId: state.runtimeId as AgentToolId })
      }
      await Promise.all([
        getIde().models.list().then((res) => {
          if (Array.isArray(res)) useChatStore.getState().setModels(res as ModelOption[])
        }),
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
      ])
    } catch {
      // 保持失败卡，禁止 toast「已切换」
    }
  }

  return (
    <div className="relative shrink-0">
      {toastLabel ? <ModelSwitchToast modelLabel={toastLabel} /> : null}
      <Popover open={state.unsupported ? false : open} onOpenChange={(next) => !state.unsupported && setOpen(next)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="composer-model-chip"
            disabled={state.unsupported}
            title={state.unsupported ? t("chat.modelSwitch.unsupported") : state.chip.title}
            aria-label={t("chat.modelSwitch.menuTitle")}
            className={cx(
              "inline-flex max-w-[16rem] items-center gap-1 rounded-full px-2.5 py-1 text-caption-2-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              state.unsupported
                ? "cursor-not-allowed bg-background-secondary-default text-text-tertiary opacity-60 ring-1 ring-border-button-default"
                : "bg-accent-500/10 text-text-primary ring-1 ring-accent-500/30 hover:bg-accent-500/15"
            )}
          >
            <span className="flex size-3.5 shrink-0 items-center justify-center">
              <AgentBrandIcon id={state.runtimeId} size={14} />
            </span>
            <span className="text-text-secondary">{state.chip.engine}</span>
            {state.chip.model ? (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="min-w-0 truncate font-semibold">{state.chip.model}</span>
              </>
            ) : null}
            {state.showBadge ? <ModelSwitchBadge visible /> : null}
            {state.unsupported ? null : <RiArrowDownSLine className="size-3 shrink-0 text-text-tertiary" />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
        >
          <ModelSwitchPanel
            kind={state.kind}
            runtimeId={state.runtimeId}
            engineLabel={state.engineLabel}
            models={state.engineModels}
            currentId={state.effectiveId}
            onPick={(model) => void pick(model)}
            onRetry={() => void retry()}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
