/**
 * 还没验证 / 暂时用不了的次行。账单「官网」只在预设已有 keysURL 时才做成链接。
 */
import { useT } from "@renderer/i18n"
import {
  credentialUnverifiedHintKey,
  isBillingCredentialCode,
  isRestrictedCredentialCode
} from "@renderer/lib/credential-check-ui"
import { cx } from "@/utils/cx"

export function CredentialUnverifiedHint({
  code,
  providerName,
  consoleUrl
}: {
  code?: string
  providerName?: string
  consoleUrl?: string
}) {
  const t = useT()
  const toneClass = isRestrictedCredentialCode(code) ? "text-status-yellow-text" : "text-text-tertiary"
  if (isBillingCredentialCode(code)) {
    return (
      <p className={cx("max-w-56 text-right text-caption-2-regular", toneClass)}>
        <BillingConsoleCopy name={providerName ?? t("chat.credentialProviderFallback")} consoleUrl={consoleUrl} />
      </p>
    )
  }
  return (
    <p className={cx("max-w-56 text-right text-caption-2-regular", toneClass)}>
      {t(credentialUnverifiedHintKey(code))}
    </p>
  )
}

function BillingConsoleCopy({ name, consoleUrl }: { name: string; consoleUrl?: string }) {
  const t = useT()
  const consoleLabel = t("settings.setupGuide.credentialConsole")
  return (
    <>
      {t("settings.setupGuide.credentialUnverifiedBillingBefore", { name })}
      {consoleUrl ? (
        <a
          href={consoleUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="credential-billing-console"
          className="underline"
          onClick={(event) => event.stopPropagation()}
        >
          {consoleLabel}
        </a>
      ) : (
        <span data-testid="credential-billing-console-text">{consoleLabel}</span>
      )}
      {t("settings.setupGuide.credentialUnverifiedBillingAfter")}
    </>
  )
}
