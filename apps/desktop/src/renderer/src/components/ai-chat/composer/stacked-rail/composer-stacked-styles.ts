/**
 * Composer 上沿轨：与输入框 / 卡片列同宽，贴在上方，不进输入壳。
 * 不透明、裁切溢出，避免展开列表透到下一行。
 */
export const STACKED_FRAME_CLASS_NAME = [
  "mb-2 flex w-full min-w-0 flex-col overflow-hidden empty:hidden [@media(max-height:640px)]:mb-1",
  "rounded-[18px] border border-border-button-default bg-background-primary-default"
].join(" ")

export const STACKED_PANEL_CLASS_NAME = [
  "relative z-0 w-full min-w-0 overflow-hidden bg-background-primary-default",
  "[&:not(:first-child)]:z-10 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-separator-border/70"
].join(" ")

export const STACKED_RAIL_CLASS_NAME = "flex flex-col"

export const STACKED_ROW_CLASS_NAME =
  "flex min-h-7 items-center gap-1.5 px-3 py-1 text-caption-2-medium [@media(max-height:640px)]:min-h-6 [@media(max-height:640px)]:py-0.5"

export const STACKED_ICON_CLASS_NAME = "size-3.5 shrink-0 text-text-secondary"

export const STACKED_LABEL_CLASS_NAME = "shrink-0 text-text-primary"

/** 733 宽下文件名放不下时用省略号收尾，不再渐隐（luna j149-11）。 */
export const STACKED_PEEK_CLASS_NAME = "min-w-0 flex-1 truncate whitespace-nowrap text-text-secondary"

export const STACKED_DIVIDER_CLASS_NAME = "border-t border-separator-border/70"
