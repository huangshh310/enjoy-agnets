/**
 * 附件菜单插入 @ / 时走这里，由 Composer 输入框注册。
 */

export type MentionOpenKind = "at" | "slash"

type MentionOpener = (kind: MentionOpenKind) => void

let opener: MentionOpener | null = null

export function registerMentionOpener(next: MentionOpener | null) {
  opener = next
  return () => {
    if (opener === next) opener = null
  }
}

export function openComposerMention(kind: MentionOpenKind) {
  opener?.(kind)
}
