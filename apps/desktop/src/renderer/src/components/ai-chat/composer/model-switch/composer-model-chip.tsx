/**
 * Composer 底栏模型芯片：只打开当前引擎名单。换引擎仍走导轨 / AgentPicker。
 * persist 在飞 → aria-busy + spinner + 防连点；成功芯片旁「已切换」；跑着副句「下一轮才用新模型」。
 */
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { RiArrowDownSLine, RiLoader4Line } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { requestModelSwitch } from "@renderer/components/ai-chat/agent-picker/request-model-switch"
import { completeCliEngineLogin } from "@renderer/components/ai-chat/agent-picker/cli-login-action"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { clearModelSwitchBadge, showModelSwitchNotice } from "./model-switch-notice"
import { ModelSwitchChipBadge, ModelSwitchNotice } from "./model-switch-feedback"
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
  const [busy, setBusy] = useState(false)
  const [failReason, setFailReason] = useState<string | null>(null)
  const open = menuOpen ?? innerOpen
  const setOpen = onMenuOpenChange ?? setInnerOpen
  const running = useChatStore((state) => state.running)
  const state = useComposerModelSwitch({ modelId, modelLabel, models })

  // 下次发送后角标提前淡出（rising edge；跑着切换不立刻清）
  const wasRunning = useRef(running)
  useEffect(() => {
    if (!wasRunning.current && running) clearModelSwitchBadge()
    wasRunning.current = running
  }, [running])

  async function pick(model: SwitchableModel) {
    if (busy) return
    setFailReason(null)
    setBusy(true)
    setOpen(false)
    try {
      const result = await requestModelSwitch(model.id)
      if (result !== "applied") {
        if (result === "failed") setFailReason(t("chat.modelSwitch.persistFailed"))
        return
      }
      showModelSwitchNotice(model.label, { nextTurn: running })
    } finally {
      setBusy(false)
    }
  }

  async function retry() {
    if (!hasIde() || busy) return
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

  const locked = state.unsupported || busy

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <ModelSwitchNotice />
      <Popover
        open={locked ? false : open}
        onOpenChange={(next) => {
          if (locked) return
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="composer-model-chip"
            disabled={state.unsupported || busy}
            aria-busy={busy || undefined}
            title={
              failReason
                ? failReason
                : busy
                  ? t("chat.modelSwitch.switching")
                  : state.unsupported
                    ? t("chat.modelSwitch.unsupported")
                    : state.chip.title
            }
            aria-label={t("chat.modelSwitch.menuTitle")}
            className={cx(
              "inline-flex h-6 max-w-[16rem] items-center gap-1 overflow-hidden whitespace-nowrap rounded-full px-2.5 text-caption-2-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              state.unsupported
                ? "cursor-not-allowed bg-background-secondary-default text-text-tertiary opacity-60 ring-1 ring-border-button-default"
                : busy
                  ? "cursor-wait bg-accent-500/10 text-text-primary opacity-80 ring-1 ring-accent-500/30"
                  : "bg-accent-500/10 text-text-primary ring-1 ring-accent-500/30 hover:bg-accent-500/15"
            )}
          >
            <span className="flex size-3.5 shrink-0 items-center justify-center">
              <AgentBrandIcon id={state.runtimeId} size={14} />
            </span>
            <span className="shrink-0 text-text-secondary">{state.chip.engine}</span>
            {state.chip.model ? (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="min-w-0 truncate font-semibold">{state.chip.model}</span>
              </>
            ) : null}
            {busy ? (
              <RiLoader4Line className="size-3 shrink-0 animate-spin text-accent-500" aria-hidden />
            ) : state.unsupported ? null : (
              <RiArrowDownSLine className="size-3 shrink-0 text-text-tertiary" />
            )}
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
            busy={busy}
            onPick={(model) => void pick(model)}
            onRetry={() => void retry()}
          />
        </PopoverContent>
      </Popover>
      <ModelSwitchChipBadge />
      {failReason ? (
        <span data-testid="model-switch-fail-inline" className="max-w-[10rem] truncate text-caption-2-regular text-status-yellow-text">
          {failReason}
        </span>
      ) : null}
    </div>
  )
}
