/**
 * 盯 PR 叫醒：线程内系统/助手短气泡（本机检查命中后再叫醒）。
 * 禁 Composer 常驻微条 / 云 7×24 卖点。
 */
import { useT } from "@renderer/i18n"
import type { BabysitWakePayload } from "./use-pr-babysit"
import { useBabysitWakeFeed } from "./use-pr-babysit"

function wakeCopy(
  t: ReturnType<typeof useT>,
  wake: BabysitWakePayload
): string {
  if (wake.wakeKind === "checks-failed") return t("chat.prBabysitWakeChecks", { n: wake.number })
  if (wake.wakeKind === "new-comments") return t("chat.prBabysitWakeComments", { n: wake.number })
  return t("chat.prBabysitWakeConflict", { n: wake.number })
}

export function BabysitWakeBubbles(props: { sessionId: string | null }) {
  const t = useT()
  const wakes = useBabysitWakeFeed(props.sessionId)
  if (!props.sessionId || wakes.length === 0) return null

  return (
    <div data-testid="babysit-wake-bubbles" className="flex flex-col gap-3">
      {wakes.map((wake) => (
        <div
          key={wake.id}
          data-testid={`babysit-wake-${wake.wakeKind}`}
          className="max-w-[min(28rem,90%)] rounded-2xl rounded-tl-md border border-separator-border/70 bg-background-secondary-default/70 px-3.5 py-2.5"
        >
          <p className="mb-1 text-caption-2-medium text-text-tertiary">{t("chat.prBabysitWakeLabel")}</p>
          <p className="text-caption-1-medium text-text-primary">{wakeCopy(t, wake)}</p>
        </div>
      ))}
    </div>
  )
}
