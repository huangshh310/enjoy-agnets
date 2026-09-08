/**
 * L4 额度耗尽卡：402 / credit / spend，不是泛化限流。
 * 「切换引擎」打开 Composer AgentPicker，禁止跳设置页。
 */
import { RiAlertLine, RiCloseLine, RiCpuLine, RiWallet3Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function QuotaExhaustedCard({ error, id }: { error: string; id?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const setError = useChatStore((state) => state.setError)
  const setAgentPickerOpen = useChatStore((state) => state.setAgentPickerOpen)

  return (
    <div
      id={id}
      data-testid="quota-exhausted-card"
      className="relative my-2 flex w-full max-w-[40rem] flex-col gap-2.5 rounded-2xl border border-border-error-default/30 bg-background-tertiary-error p-4 text-text-primary shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border-error-default/30 bg-background-tertiary-error text-text-error-primary">
          <RiAlertLine className="size-4.5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-body-medium font-semibold text-text-primary">{t("chat.usage.creditTitle")}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              title={t("chat.dismissError")}
              className="cursor-pointer text-text-tertiary hover:text-text-primary"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
          <p className="text-caption-1-regular text-text-secondary">{t("chat.usage.creditDesc")}</p>
          <p className="break-words font-mono text-caption-2-medium text-text-tertiary select-text">{error}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void navigate({ to: "/settings/$section", params: { section: "billing" } })}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary shadow-2xs hover:border-accent-500/40"
            >
              <RiWallet3Line className="size-3 text-accent-500" />
              {t("chat.usage.openBilling")}
            </button>
            <button
              type="button"
              onClick={() => setAgentPickerOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-secondary shadow-2xs hover:text-text-primary"
            >
              <RiCpuLine className="size-3" />
              {t("chat.usage.switchEngine")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
