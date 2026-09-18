/**
 * 排队一次性提示。列表在对话末尾虚线泡，这里不再重复计数。
 */
import { useEffect, useState } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useT, type TranslateFn } from "@renderer/i18n"
import { getRuntimeHint, setRuntimeHint, subscribeFollowups, type RuntimeHintCode } from "@renderer/hooks/followup-queue"

export function ComposerFollowupRail() {
  const t = useT()
  const [hint, setHint] = useState<RuntimeHintCode>(getRuntimeHint)
  useEffect(() => {
    return subscribeFollowups(() => setHint(getRuntimeHint()))
  }, [])
  if (!hint) return null

  return (
    <div className="mx-auto mb-1.5 flex w-full items-center gap-1 px-1">
      <p className="min-w-0 flex-1 font-mono text-caption-2-regular text-text-tertiary">
        {hintLabel(hint, t)}
      </p>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => setRuntimeHint(null)}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      >
        <RiCloseLine className="size-3" aria-hidden />
      </button>
    </div>
  )
}

function hintLabel(hint: RuntimeHintCode, t: TranslateFn) {
  if (hint === "chipQueued") return t("chat.runtimeChipQueued")
  if (hint === "queued") return t("chat.runtimeQueuedHint")
  if (hint === "steered") return t("chat.runtimeSteeredHint")
  return ""
}
