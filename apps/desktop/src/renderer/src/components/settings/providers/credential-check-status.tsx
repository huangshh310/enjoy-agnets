/**
 * 向导步 4 / 供应商列表共用的密钥状态。还没验证的次行在状态下方，不进 tooltip。
 */
import { RiLoader4Line } from "@remixicon/react"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import {
  credentialStatusLabelKey,
  credentialUiState,
  credentialUiTone
} from "@renderer/lib/credential-check-ui"
import { presetConsoleUrl } from "@renderer/lib/preset-console-url"
import { CredentialUnverifiedHint } from "./credential-unverified-hint"

const TONE_DOT = {
  success: "bg-state-success-text",
  danger: "bg-text-error-primary",
  warning: "bg-status-yellow-text",
  muted: "bg-text-tertiary"
} as const

const TONE_TEXT = {
  success: "text-state-success-text",
  danger: "text-text-error-primary",
  warning: "text-status-yellow-text",
  muted: "text-text-tertiary"
} as const

export function CredentialCheckStatus({
  check,
  hasKey,
  pending,
  providerKind,
  providerName,
  onFixKey,
  onRecheck
}: {
  check?: CredentialCheck
  hasKey?: boolean
  pending?: boolean
  providerKind?: string
  providerName?: string
  onFixKey?: () => void
  onRecheck?: () => void
}) {
  const t = useT()
  const state = credentialUiState(check, { hasKey, pending })
  if (state === "none") return null
  const tone = credentialUiTone(state, check?.code)
  return (
    <div
      data-testid="credential-check-status"
      data-state={state}
      data-code={check?.code ?? ""}
      data-tone={tone}
      className="flex flex-col items-end gap-0.5"
    >
      <div className="flex items-center gap-1.5">
        {state === "pending" ? (
          <RiLoader4Line className="size-3.5 animate-spin text-text-tertiary" aria-hidden />
        ) : (
          <span className={cx("size-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
        )}
        <span className={cx("text-caption-2-medium", TONE_TEXT[tone])}>
          {t(credentialStatusLabelKey(state, check?.code))}
        </span>
        {state === "invalid" && onFixKey ? (
          <StatusAction testId="credential-fix-key" label={t("settings.setupGuide.credentialFixKey")} onClick={onFixKey} />
        ) : null}
        {state === "unverified" && onRecheck ? (
          <StatusAction testId="credential-recheck" label={t("settings.setupGuide.credentialRecheck")} onClick={onRecheck} />
        ) : null}
      </div>
      {state === "unverified" ? (
        <CredentialUnverifiedHint
          code={check?.code}
          providerName={providerName}
          consoleUrl={presetConsoleUrl(providerKind)}
        />
      ) : null}
    </div>
  )
}

function StatusAction({
  testId,
  label,
  onClick
}: {
  testId: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className="cursor-pointer text-caption-2-medium text-accent-600 hover:underline"
    >
      {label}
    </button>
  )
}
