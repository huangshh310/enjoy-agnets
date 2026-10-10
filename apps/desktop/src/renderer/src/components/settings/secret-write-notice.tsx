/**
 * 密钥写失败 / 钥匙串不可用：行内人话，不弹 toast，不摊英文。
 */
import { useT } from "@renderer/i18n"
import { secretWriteCopyKey, type SecretWriteErrorCode } from "@renderer/lib/secret-write"

export function SecretWriteNotice({
  code,
  className
}: {
  code: SecretWriteErrorCode
  className?: string
}) {
  const t = useT()
  return (
    <p data-testid="secret-write-notice" data-code={code} className={className ?? "text-caption-1-medium text-text-error-primary"}>
      {t(secretWriteCopyKey(code))}
    </p>
  )
}
