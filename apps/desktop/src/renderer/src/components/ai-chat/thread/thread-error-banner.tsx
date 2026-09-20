import {
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiCommandLine,
  RiComputerLine,
  RiKey2Line,
  RiRefreshLine,
  RiUserLine
} from "@remixicon/react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@renderer/stores/chat-store"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { regenerateAssistantTurn } from "@renderer/hooks/regenerate-turn"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { isTodoContinueUserMessage } from "@renderer/components/ai-chat/composer/todo-continue-message"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { requiredVersionFor, resolveCliCompat } from "@enjoy-agents/ipc-contract/cli-compat"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { sendGateCopy } from "@renderer/hooks/runtime-interact/send-gate-copy"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { getIde, hasIde } from "@renderer/lib/ide"
import { QuotaExhaustedCard } from "../usage/quota-exhausted-card"

const REMOTE_INSTALL_MAP: Record<string, string> = {
  deepseek: "npm i -g @deepseek-ai/dsh",
  claude: "npm i -g @anthropic-ai/claude-code",
  codex: "npm i -g @openai/codex",
  gemini: "npm i -g @google/gemini-cli",
  opencode: "npm i -g opencode-ai",
  pi: "npm i -g @earendil-works/pi-coding-agent pi-acp",
  cursor: "curl https://cursor.com/install -fsS | bash",
  grok: "curl -fsSL https://x.ai/cli/install.sh | bash",
  amp: "curl -fsSL https://ampcode.com/install.sh | bash",
  omp: "curl -fsSL https://omp.sh/install | sh"
}

export function ThreadErrorBanner({ error, className }: { error: string; className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const kind = classifyThreadError(error)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const loginLoop = useCliLoginLoop(runtimeId)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const setError = useChatStore((state) => state.setError)
  const [copiedInstall, setCopiedInstall] = useState(false)
  if (kind === "credit") {
    return <QuotaExhaustedCard error={error} id="thread-error-banner" />
  }
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

  async function handleSwitchToEnjoyLocal() {
    setError(null)
    useChatStore.getState().setRuntimeId("enjoy-local")
    const sessionId = useChatStore.getState().sessionId
    if (sessionId && hasIde()) {
      try {
        await getIde().agentTools.setSessionRuntime({ sessionId, runtimeId: "enjoy-local" })
      } catch {
        // ignore
      }
    }
    handleRetry()
  }

  function handleCopyInstallCommand() {
    const cmd = REMOTE_INSTALL_MAP[runtimeId] || `npm i -g ${runtimeId}`
    void navigator.clipboard.writeText(cmd)
    setCopiedInstall(true)
    setTimeout(() => setCopiedInstall(false), 2000)
  }

  const outdatedTool = rememberedAgentTool(runtimeId)
  const outdated = outdatedTool
    ? resolveCliCompat({
        version: outdatedTool.version,
        cliVersion: outdatedTool.authAccount?.cliVersion,
        requiredVersion: outdatedTool.requiredVersion ?? requiredVersionFor(outdatedTool.id)
      })
    : null
  const gate = sendGateCopy(
    kind === "authorizing"
      ? "authorizing"
      : kind === "login_failed"
        ? "login_failed"
        : kind === "inspecting"
          ? "inspecting"
          : kind === "outdated"
            ? "outdated"
            : kind === "auth"
              ? "needs_login"
              : "ready",
    t,
    loginLoop.reason,
    outdated ? { current: outdated.current, required: outdated.required } : undefined
  )
  const title =
    gate?.title ??
    (kind === "remote_disconnected"
      ? t("chat.needRemoteConnectedTitle")
      : kind === "remote_cli_missing"
        ? t("chat.remoteCliMissingTitle")
        : kind === "needs_key"
          ? t("chat.needProviderKeyTitle")
          : kind === "rate_limit"
            ? t("chat.usage.rateLimitTitle")
            : t("chat.errorTitle"))
  const detail =
    gate?.hint ??
    (kind === "remote_disconnected"
      ? t("chat.needRemoteConnectedHint")
      : kind === "remote_cli_missing"
        ? t("chat.remoteCliMissingHint")
        : kind === "needs_key"
          ? t("chat.needProviderKeyHint")
          : error.includes("HANDOFF_CONFIRM_FAILED")
            ? t("chat.handoffConfirmFailed")
            : error)

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
            {kind === "remote_cli_missing" ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleSwitchToEnjoyLocal()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white shadow-2xs hover:bg-accent-600 transition-colors"
                >
                  <RiComputerLine className="size-3" />
                  <span>{t("chat.switchToEnjoyLocal")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyInstallCommand}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary shadow-2xs hover:border-accent-500/40 hover:bg-background-secondary-hover transition-colors"
                >
                  {copiedInstall ? (
                    <RiCheckLine className="size-3 text-accent-500" />
                  ) : (
                    <RiCommandLine className="size-3 text-text-tertiary" />
                  )}
                  <span>
                    {copiedInstall
                      ? t("chat.agentInstallCopied")
                      : t("chat.copyRemoteInstallCommand")}
                  </span>
                </button>
              </>
            ) : null}
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
            {kind === "auth" || kind === "login_failed" ? (
              <button
                type="button"
                onClick={handleAuth}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
              >
                <RiUserLine className="size-3" />
                <span>
                  {kind === "login_failed" ? t("chat.retryOfficialLogin") : t("chat.openCliLogin")}
                </span>
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
            {kind === "remote_disconnected" && hasIde() ? (
              <button
                type="button"
                onClick={() => {
                  const workspaceId = useChatStore.getState().workspaceId
                  setError(null)
                  if (workspaceId) void getIde().workspace.retry({ workspaceId })
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white shadow-2xs hover:bg-accent-600 transition-colors"
              >
                <RiRefreshLine className="size-3" />
                <span>{t("settings.workspace.sshReconnect")}</span>
              </button>
            ) : null}
            {kind !== "auth" &&
            kind !== "needs_key" &&
            kind !== "inspecting" &&
            kind !== "authorizing" &&
            kind !== "login_failed" &&
            kind !== "outdated" &&
            kind !== "remote_cli_missing" &&
            kind !== "remote_disconnected" &&
            !running ? (
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
