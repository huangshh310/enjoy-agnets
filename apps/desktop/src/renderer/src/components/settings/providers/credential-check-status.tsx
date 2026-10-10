/**
 * 向导步 4 / 供应商列表共用的密钥三态。还没验证的次行在状态下方，不进 tooltip。
 */
import { RiLoader4Line } from "@remixicon/react"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import {
  credentialStatusLabelKey,
  credentialUiState,
  credentialUnverifiedHintKey
} from "@renderer/lib/credential-check-ui"

export function CredentialCheckStatus({
  check,
  hasKey,
  pending,
  onFixKey,
  onRecheck
}: {
  check?: CredentialCheck
  hasKey?: boolean
  pending?: boolean
  onFixKey?: () => void
  onRecheck?: () => void
}) {
  const t = useT()
  const state = credentialUiState(check, { hasKey, pending })
  if (state === "none") return null
  const tone =
    state === "ok" ? "success" : state === "invalid" ? "danger" : "muted"
  return (
    <div data-testid="credential-check-status" data-state={state} className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        {state === "pending" ? (
          <RiLoader4Line className="size-3.5 animate-spin text-text-tertiary" aria-hidden />
        ) : (
          <span
            className={cx(
              "size-1.5 rounded-full",
              tone === "success" && "bg-state-success-text",
              tone === "danger" && "bg-text-error-primary",
              tone === "muted" && "bg-text-tertiary"
            )}
            aria-hidden
          />
        )}
        <span
          className={cx(
            "text-caption-2-medium",
            tone === "success" && "text-state-success-text",
            tone === "danger" && "text-text-error-primary",
            tone === "muted" && "text-text-tertiary"
          )}
        >
          {t(credentialStatusLabelKey(state))}
        </span>
        {state === "invalid" && onFixKey ? (
          <button
            type="button"
            data-testid="credential-fix-key"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onFixKey()
            }}
            className="cursor-pointer text-caption-2-medium text-accent-600 hover:underline"
          >
            {t("settings.setupGuide.credentialFixKey")}
          </button>
        ) : null}
        {state === "unverified" && onRecheck ? (
          <button
            type="button"
            data-testid="credential-recheck"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onRecheck()
            }}
            className="cursor-pointer text-caption-2-medium text-accent-600 hover:underline"
          >
            {t("settings.setupGuide.credentialRecheck")}
          </button>
        ) : null}
      </div>
      {state === "unverified" ? (
        <p className="max-w-56 text-right text-caption-2-regular text-text-tertiary">
          {t(credentialUnverifiedHintKey(check?.code))}
        </p>
      ) : null}
    </div>
  )
}
