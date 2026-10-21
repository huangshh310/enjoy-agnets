/**
 * 「正在准备…」左边和输入框里的字对齐（luna #170 r-luna ④，12c：原来只有 px-1，比输入框靠左约 20px）。
 * 输入框里的字离输入框外框：1px 边框 + ComposerInput 的 px-3.5。
 * 有消息时 Composer 自己带 px-6（ai-chat-composer.tsx 外层），簇没有左右内边距 → 提示要再让出这 1.5rem；
 * 空会话时簇带 px-6、Composer 是 px-0 → 只让出字的内边距。
 * 只管位置，什么时候画 / 收不在这里（send-composer-run.ts 管）。
 */
export const COMPOSER_TEXT_INSET_CLASS = "pl-[calc(0.875rem+1px)]"
export const COMPOSER_FRAMED_TEXT_INSET_CLASS = "pl-[calc(1.5rem+0.875rem+1px)] pr-6"

/** composerFramed：Composer 自己带 px-6（有消息时，簇不加左右内边距）。 */
export function preparingHintInsetClass(composerFramed: boolean): string {
  return composerFramed ? COMPOSER_FRAMED_TEXT_INSET_CLASS : COMPOSER_TEXT_INSET_CLASS
}
