/**
 * 助手会话错误横幅组件 (Thread Error Banner)
 * 采用结构化卡片呈现错误原因、提供「重新生成 / 重试」、「切换模型」与「关闭」操作，取代生硬单行红字。
 */
import {
  RiAlertLine,
  RiCloseLine,
  RiRefreshLine,
  RiSettings3Line
} from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@renderer/stores/chat-store"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { regenerateAssistantTurn } from "@renderer/hooks/regenerate-turn"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { isTodoContinueUserMessage } from "@renderer/components/ai-chat/composer/todo-continue-message"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"


interface ThreadErrorBannerProps {
  error: string
  className?: string
}

export function ThreadErrorBanner({ error, className }: ThreadErrorBannerProps) {
  const t = useT()
  const navigate = useNavigate()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const setError = useChatStore((state) => state.setError)

  const lastAssistant = messages.filter((m) => m.role === "assistant").at(-1)
  const lastUser = messages.filter((m) => m.role === "user").at(-1)

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

  function handleDismiss() {
    setError(null)
  }

  function handleManageModel() {
    void navigate({
      to: "/settings/$section",
      params: { section: "providers" }
    })
  }

  return (
    <div
      data-testid="thread-error-banner"
      className={cx(
        "relative my-2 flex w-full max-w-[40rem] flex-col gap-2.5 rounded-2xl border",
        "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-4 text-text-primary",
        "shadow-card backdrop-blur-xs animate-in fade-in-50 duration-200 select-none",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* 左侧警示图标 */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
          <RiAlertLine className="size-4.5" aria-hidden />
        </div>

        {/* 右侧错误详情与操作 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-body-medium font-semibold text-text-primary">
              {t("chat.errorTitle")}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              title={t("chat.dismissError")}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>

          <p className="text-caption-1-medium text-text-secondary leading-relaxed font-mono select-text break-words">
            {error}
          </p>

          {/* 快捷操作栏 */}
          <div className="mt-1 flex flex-wrap items-center gap-2 pt-1">
            {!running ? (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary shadow-2xs transition-all hover:bg-background-secondary-hover hover:border-accent-500/40 cursor-pointer"
              >
                <RiRefreshLine className="size-3 text-accent-500" />
                <span>{t("common.retry")}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleManageModel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-secondary shadow-2xs transition-all hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer"
            >
              <RiSettings3Line className="size-3" />
              <span>{t("chat.switchModelKey")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
