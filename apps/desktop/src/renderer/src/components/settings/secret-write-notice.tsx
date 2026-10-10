/**
 * 钥匙串两档提示：① 预检黄条（还差一步同款黄点）；② 写失败红字。
 * 禁止摊 libsecret / DBus / keychain 英文。没有「去了解」。
 */
import type { ReactNode } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { secretWriteCopyKey, type SecretWriteErrorCode } from "@renderer/lib/secret-write"

/** ① 机器上没有可用钥匙串。输入不锁；向导「以后再连」不受影响。 */
export function SecretWritePreflight({ className }: { className?: string }) {
  const t = useT()
  return (
    <div
      data-testid="secret-write-notice"
      data-kind="preflight"
      className={cx(
        "flex w-full items-start gap-2 rounded-xl border border-border-button-default",
        "bg-background-primary-default p-3 shadow-card",
        className
      )}
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-status-yellow-text" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{t("settings.secretWrite.unavailableTitle")}</p>
        <p className="mt-1 text-caption-2-regular text-text-secondary">{t("settings.secretWrite.unavailableBody")}</p>
      </div>
    </div>
  )
}

/** ② 这次没存上。小红字，不提重启。 */
export function SecretWriteError({
  code,
  className
}: {
  code: SecretWriteErrorCode
  className?: string
}) {
  const t = useT()
  return (
    <p
      data-testid="secret-write-error"
      data-code={code}
      className={className ?? "text-caption-2-medium text-text-error-primary"}
    >
      {t(secretWriteCopyKey(code))}
    </p>
  )
}

/** 禁保存时的 hover 提示；包一层才能在 disabled 钮上出 title。 */
export function SecretWriteSaveTip({
  blocked,
  children
}: {
  blocked: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <span
      className="inline-flex"
      data-testid="secret-write-save-tip"
      title={blocked ? t("settings.secretWrite.saveNeedsKeychain") : undefined}
    >
      {children}
    </span>
  )
}
