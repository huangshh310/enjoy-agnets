/**
 * 运行时一次性提示的文案（输入框帽檐 ComposerFollowupRail 与审批卡上方 DockRuntimeHint 共用）。
 * 纯函数单放，好钉文案与单复数。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { RuntimeHintCode } from "@renderer/hooks/runtime-interact/followup-queue.types"

/** luna 定稿：运行中收不了图改排队——1 张用单数，0 / 2+ 张用复数（i18n 无复数机制，按数选键）。 */
export function imageSteerQueuedHintKey(imageCount: number): string {
  return imageCount === 1 ? "chat.runtimeImageSteerQueuedHintOne" : "chat.runtimeImageSteerQueuedHint"
}

export function hintLabel(hint: RuntimeHintCode, t: TranslateFn, nextText: string, imageCount = 0): string {
  if (hint === "chipQueued" || hint === "queued") {
    return nextText ? t("chat.runtimeQueuedNext", { text: nextText }) : t("chat.runtimeQueuedHint")
  }
  if (hint === "steered") return t("chat.runtimeSteeredHint")
  if (hint === "imageSteerQueued") return t(imageSteerQueuedHintKey(imageCount))
  return ""
}
