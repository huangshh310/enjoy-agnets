/**
 * 「这一发能不能发」的唯一判定：有正文，或有附件（只贴图不打字也能发），或有引用 / 知识 / 技能 Chip。
 * 发送按钮亮不亮、Enter / 点击 / 排队首发 / 运行中排队 / 编辑重发都用它，按钮蓝了就一定发得出去。
 */
export type ComposerSendable = {
  text: string
  assetCount?: number
  hasChips?: boolean
}

export function composerCanSend({ text, assetCount = 0, hasChips = false }: ComposerSendable): boolean {
  return text.trim().length > 0 || assetCount > 0 || hasChips
}
