/**
 * 删档案钥匙串挂了：确认框里的两行提示。红字 + 灰字作废提示，不是 toast。
 */
import { useT } from "@renderer/i18n"
import { deleteKeychainNoticeModel, type DeleteKeychainNoticeHint } from "@renderer/lib/delete-keychain-notice"
import { requestOpenExternalQuiet } from "@renderer/lib/open-safe-external"

export function DeleteKeychainNotice({ revokeUrl, providerLabel }: DeleteKeychainNoticeHint) {
  const t = useT()
  const model = deleteKeychainNoticeModel({ revokeUrl, providerLabel })
  const hint = model.provider
    ? t(model.hintKey, { provider: model.provider })
    : t(model.hintKey)
  return (
    <div className="flex flex-col gap-1">
      <p
        data-testid="delete-keychain-unavailable"
        className="text-caption-2-medium text-text-error-primary"
      >
        {t(model.unavailableKey)}
      </p>
      <p data-testid="delete-revoke-hint" className="text-caption-2-regular text-text-secondary">
        {hint}
        <RevokeLink revokeUrl={model.revokeUrl} label={model.linkKey ? t(model.linkKey) : undefined} />
      </p>
    </div>
  )
}

function RevokeLink({ revokeUrl, label }: { revokeUrl?: string; label?: string }) {
  if (!revokeUrl || !label) return null
  return (
    <>
      {" "}
      <button
        type="button"
        data-testid="delete-revoke-link"
        className="cursor-pointer underline underline-offset-2 hover:text-text-primary"
        onClick={() => requestOpenExternalQuiet(revokeUrl)}
      >
        {label}
      </button>
    </>
  )
}
