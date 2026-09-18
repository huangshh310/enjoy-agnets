/**
 * 用户气泡可见正文：剥掉宿主模式围栏与引用块，只留当时打的字。
 */
import { splitQuotedDisplay } from "@enjoy-agents/ipc-contract/quoted-context"
import { stripHostModePrefix } from "../components/ai-chat/composer/mentions/host-mode-prefix.ts"

export function visibleUserText(content: string): string {
  return stripHostModePrefix(splitQuotedDisplay(content).text).trim()
}

/** 本线程已发送的用户正文，最近的在前。空句丢掉。 */
export function listRecallPrompts(messages: Array<{ role: string; content: string }>): string[] {
  const prompts: string[] = []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user") continue
    const text = visibleUserText(message.content)
    if (text) prompts.push(text)
  }
  return prompts
}
