/**
 * luna #145：「上一条还在准备」是中性提示，不是失败——与「将在当前任务完成后执行」同款灰条，
 * 贴 Composer 上沿、同宽对齐；✕ 关掉后焦点回输入框；会话准备好（准备提示落下）自动消失。
 */
import { useEffect, useRef } from "react"
import { RiCloseLine, RiInformationLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  autoDismissComposerRailNotice,
  dismissComposerRailNotice,
  isComposerRailNotice
} from "./composer-rail-notice"
import { STACKED_PANEL_CLASS_NAME } from "../stacked-rail/composer-stacked-styles"

export function ComposerPreviousPreparingRail() {
  const t = useT()
  const shown = useChatStore((state) => isComposerRailNotice(state.error))
  const preparing = useChatStore((state) => state.preparingHint)
  const wasPreparing = useRef(preparing)
  useEffect(() => {
    // 会话准备好：准备提示落下时一并收掉。
    autoDismissComposerRailNotice(wasPreparing.current, preparing)
    wasPreparing.current = preparing
  }, [preparing])
  useEffect(() => {
    // 窄矮窗：空会话页可滚，灰条多占一行会把输入框 / 发送键挤出视口——出条时把整个 Composer 滚回视口。
    if (!shown) return
    const form = document.querySelector<HTMLTextAreaElement>('[data-testid="composer-input"]')?.closest("form")
    form?.scrollIntoView({ block: "nearest" })
  }, [shown])
  if (!shown) return null
  return (
    <div
      data-testid="composer-previous-preparing"
      role="status"
      className={`${STACKED_PANEL_CLASS_NAME} flex items-center gap-1.5 px-3 py-1`}
    >
      <RiInformationLine className="size-3.5 shrink-0 text-text-secondary dark:text-text-primary" aria-hidden />
      {/* 深色下 text-secondary 落在 neutral-800 上只有约 3.2:1，改用 text-primary（luna 3cf0，≥4.5:1）。 */}
      <p className="min-w-0 flex-1 truncate text-caption-2-regular text-text-secondary dark:text-text-primary">
        {t("chat.previousStillPreparing")}
      </p>
      <button
        type="button"
        aria-label={t("common.close")}
        data-testid="composer-previous-preparing-close"
        onClick={dismissComposerRailNotice}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary dark:text-text-primary"
      >
        <RiCloseLine className="size-3" aria-hidden />
      </button>
    </div>
  )
}

export { isComposerRailNotice }
