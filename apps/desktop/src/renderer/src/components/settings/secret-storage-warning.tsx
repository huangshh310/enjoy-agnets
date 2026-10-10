/**
 * 钥匙串不可用时的前置警告。禁止暗示可以改用明文。
 */
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useT } from "@renderer/i18n"

export function SecretStorageWarning() {
  const t = useT()
  const available = useChatReadiness().data?.secretStorageAvailable
  if (available !== false) return null
  return (
    <p
      role="alert"
      data-testid="secret-storage-unavailable"
      className="rounded-xl border border-status-yellow-text/25 bg-status-yellow-text/10 px-3 py-2 text-caption-1-medium leading-snug text-status-yellow-text"
    >
      {t("settings.secrets.keychainUnavailable")}
    </p>
  )
}
