/**
 * 桌面动作诚实失败卡：只说失败 + 重拍，不附下一步缩略或假成功。
 */
import { asRecord } from "@renderer/lib/record"
import { useT } from "@renderer/i18n"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { desktopActFailedCopy, desktopActFailureKind } from "./desktop-act-failed-copy"

export function DesktopActFailedCard({ tool }: { tool: ThreadToolCall }) {
  const t = useT()
  const kind = desktopActFailureKind(asRecord(tool.result))
  if (!kind) return null
  const copy = desktopActFailedCopy(kind, t)
  return (
    <div
      data-testid="desktop-act-failed"
      className="rounded-2xl border border-border-error-default/25 bg-background-primary-default p-4"
    >
      <p className="text-body-medium text-text-primary">{copy.title}</p>
      <p className="mt-0.5 font-mono text-caption-2-medium text-text-error-primary">code · {copy.code}</p>
      <p className="mt-2 text-caption-1-medium leading-relaxed text-text-secondary">{copy.body}</p>
    </div>
  )
}
