/**
 * 附件托盘摘要 / 排队卡片附加物的计数文案：count === 1 走 *One 键（英文单数），其余走复数模板。
 * 抽成纯函数，组件和单测共用，避免只靠正则看源码。
 */
import type { TranslateFn } from "../../i18n/use-i18n"

export function imagesCountLabel(t: TranslateFn, count: number): string {
  return count === 1 ? t("chat.imagesCountOne") : t("chat.imagesCount", { count })
}

export function filesCountLabel(t: TranslateFn, count: number): string {
  return count === 1 ? t("chat.filesCountOne") : t("chat.filesCount", { count })
}

/** 托盘收起时的摘要：只有图 / 只有文件 / 两者都有。 */
export function attachmentSummaryLabel(t: TranslateFn, images: number, files: number): string {
  if (images > 0 && files > 0) {
    return t("chat.imagesAndFiles", { images: imagesCountLabel(t, images), files: filesCountLabel(t, files) })
  }
  return images > 0 ? imagesCountLabel(t, images) : filesCountLabel(t, files)
}

export function queuedExtrasLabel(t: TranslateFn, count: number): string {
  return count === 1 ? t("chat.runtimeQueuedExtrasOne") : t("chat.runtimeQueuedExtras", { n: count })
}
