/**
 * 输入框里当下有几张图（还稿后用来说「图片已放回」/「文字和图片已放回」）。
 * 看门狗红卡和出字前失败白卡共用，文案出自同一对键。
 */
import { useEffect, useState } from "react"
import { isImageMediaType } from "@enjoy-agents/assets/media-type"
import { subscribeComposerAssets } from "@renderer/hooks/composer-assets"
import { useT } from "@renderer/i18n"
import { restoredImagesDetail } from "@renderer/lib/usage/send-restore-detail"
import { useChatStore } from "@renderer/stores/chat-store"

export function useRestoredImageCount(): number {
  const [count, setCount] = useState(0)
  useEffect(
    () =>
      subscribeComposerAssets((items) =>
        setCount(items.filter((item) => isImageMediaType(item.mediaType ?? "")).length)
      ),
    []
  )
  return count
}

/** 出字前失败白卡第二行：输入框里有图才有，没图为 null。 */
export function useRestoredImagesDetail(): string | null {
  const t = useT()
  const count = useRestoredImageCount()
  const hasText = useChatStore((state) => state.composer.trim().length > 0)
  return restoredImagesDetail(t, count, hasText)
}
