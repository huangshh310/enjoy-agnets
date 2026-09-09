/**
 * 会话错误卡：额度走 L4，鉴权打开登录，密钥留在 Chat。
 */
import { RiAlertLine, RiCloseLine, RiKey2Line, RiRefreshLine, RiUserLine } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@renderer/stores/chat-store"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { regenerateAssistantTurn } from "@renderer/hooks/regenerate-turn"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { isTodoContinueUserMessage } from "@renderer/components/ai-chat/composer/todo-continue-message"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { QuotaExhaustedCard } from "../usage/quota-exhausted-card"

export function ThreadErrorBanner({ error, className }: { error: string; className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const kind = classifyThreadError(error)
  if (kind === "credit") {
    return <QuotaExhaustedCard error={error} id="thread-error-banner" />
  }
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const setError = useChatStore((state) => state.setError)
  const lastAssistant = messages.filter((item) => item.role === "assistant").at(-1)
  const lastUser = messages.filter((item) => item.role === "user").at(-1)

  function handleRetry() {
    setError(null)
    if (lastUser && isTodoContinueUserMessage(lastUser.content)) {
      void continueTodoTurn()
      return
    }
    if (lastAssistant) {
      void regenerateAssistantTurn(lastAssistant.id)
    } else if (lastUser) {
      useChatStore.getState().setComposer(lastUser.content)
      void sendComposerMessage()
    }
  }

  function handleAuth() {
    setError(null)
    useChatStore.getState().setAgentPickerOpen(true)
  }

  function handleAddKey() {
    setError(null)
    void navigate({ to: "/settings/$section", params: { section: "providers" } })
  }

  const title =
    kind === "auth"
      ? t("chat.acpAuthRequired")
      : kind === "inspecting"
        ? t("chat.agentInspecting")
        : kind === "needs_key"
          ? t("chat.needProviderKeyTitle")
          : kind === "rate_limit"
            ? t("chat.usage.rateLimitTitle")
            : t("chat.errorTitle")
  const detail =
    kind === "auth"
      ? t("chat.needCliLoginHint")
      : kind === "inspecting"
        ? t("chat.needCliInspectingHint")
        : kind === "needs_key"
          ? t("chat.needProviderKeyHint")
          : error.includes("HANDOFF_CONFIRM_FAILED")
            ? t("chat.handoffConfirmFailed")
            : error

  return (
    <div
      id="thread-error-banner"
      data-testid="thread-error-banner"
      className={cx(
        "relative my-2 flex w-full max-w-[40rem] flex-col gap-2.5 rounded-2xl border border-border-error-default",
        "bg-background-tertiary-error p-4 text-text-primary shadow-card",
        "animate-in fade-in-50 duration-200 select-none",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border-error-default bg-background-primary-default text-text-error-primary">
          <RiAlertLine className="size-4.5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-body-medium font-semibold text-text-primary">{title}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              title={t("chat.dismissError")}
              className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
          <p className="text-caption-1-medium leading-relaxed break-words text-text-secondary">{detail}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 pt-1">
            {kind === "inspecting" ? (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  void queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
              >
                <RiRefreshLine className="size-3" />
                <span>{t("chat.retryInspect")}</span>
              </button>
            ) : null}
            {kind === "auth" ? (
              <button
                type="button"
                onClick={handleAuth}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
              >
                <RiUserLine className="size-3" />
                <span>{t("chat.openCliLogin")}</span>
              </button>
            ) : null}
            {kind === "needs_key" ? (
              <button
                type="button"
                onClick={handleAddKey}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
              >
                <RiKey2Line className="size-3" />
                <span>{t("chat.addProviderKey")}</span>
              </button>
            ) : null}
            {kind !== "auth" && kind !== "needs_key" && kind !== "inspecting" && !running ? (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary shadow-2xs hover:border-accent-500/40 hover:bg-background-secondary-hover"
              >
                <RiRefreshLine className="size-3 text-accent-500" />
                <span>{t("common.retry")}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
