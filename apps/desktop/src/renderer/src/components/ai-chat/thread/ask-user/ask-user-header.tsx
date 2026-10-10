/**
 * 提问卡片标题：Remix 问号标 + HMAC 绑定提示。
 * 不走 ApprovalChrome，避免带出允许/本会话三钮。
 */
import { RiLock2Line, RiQuestionAnswerLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"

export function AskUserHeader() {
  const t = useT()
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-accent-500/20 bg-accent-500/10 text-accent-500">
          <RiQuestionAnswerLine className="size-3.5" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 text-caption-1-semibold text-text-primary">{t("chat.askUserTitle")}</h3>
      </div>
      <p className="inline-flex min-w-0 items-center gap-1.5 text-caption-2-regular text-text-tertiary">
        <RiLock2Line className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          {t(isDevCopyEnabled() ? "chat.hmacBoundNotice" : "chat.approvalConfirmNotice")}
        </span>
      </p>
    </header>
  )
}
