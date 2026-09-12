/**
 * Composer @ / 面板：键盘选中后钉 Chip 或执行内置命令。
 */
import { type KeyboardEvent, type RefObject } from "react"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { addSessionContextChip } from "@renderer/hooks/session-context-chips"
import { useChatStore } from "@renderer/stores/chat-store"
import { applySlashPick } from "./apply-slash-pick.ts"
import { replaceMentionToken } from "./composer-token.ts"
import { attachWorkspaceMention } from "./attach-workspace-mention.ts"
import type { SlashBuiltinCopy, SurfaceCopy } from "./build-mention-items.ts"
import { addComposerSkillChip } from "./composer-skill-chips.ts"
import { useMentionSources } from "./use-mention-sources.ts"
import { mentionKeyAction } from "./mention-key.ts"
import type { MentionItem } from "./mention-items.ts"
import { useMentionPanel } from "./use-mention-panel.ts"

export function useComposerMentions(
  value: string,
  onChange: (next: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  modeCopy: SurfaceCopy,
  builtinCopy: SlashBuiltinCopy
) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const { roots, files, docs } = useMentionSources(workspaceId, true)
  const panel = useMentionPanel(value, onChange, textareaRef, roots, files, docs, modeCopy, builtinCopy)

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    syncCursor()
    const action = mentionKeyAction(event.key, panel.open, panel.activeIndex, panel.items.length)
    if (action.type === "none") return false
    event.preventDefault()
    if (action.type === "move") panel.setActiveIndex(action.index)
    if (action.type === "dismiss") panel.setDismissed(true)
    if (action.type === "pick") void pick(panel.items[action.index])
    return true
  }

  async function pick(item: MentionItem | undefined) {
    if (!item || !panel.mention) return
    const token = panel.mention
    if (item.kind === "web") return
    if (item.kind === "doc") {
      addSessionContextChip({
        id: `doc:${item.docId}`,
        kind: "knowledge",
        label: item.name,
        path: item.path,
        snippet: `Knowledge document ${item.path}`
      })
      applyReplace(token, "")
      return
    }
    if (item.kind === "skill" && token.kind === "at") {
      addComposerSkillChip(item.skill)
      applyReplace(token, "")
      return
    }
    if (item.kind !== "file") {
      applySlashPick(item)
      applyReplace(token, "")
      return
    }
    if (!workspaceId) return
    const quote = await attachWorkspaceMention(workspaceId, {
      name: item.name,
      path: item.path,
      kind: item.entryKind
    })
    addQuotedContext(quote)
    applyReplace(token, "")
  }

  function applyReplace(token: NonNullable<typeof panel.mention>, insert: string) {
    onChange(replaceMentionToken(value, token, insert))
    panel.setCursor(token.start + insert.length)
  }

  function syncCursor() {
    const node = textareaRef.current
    if (node) panel.setCursor(node.selectionStart ?? value.length)
  }

  return {
    open: panel.open,
    kind: panel.mention?.kind ?? null,
    items: panel.items,
    activeIndex: panel.activeIndex,
    handleKeyDown,
    pick,
    syncCursor,
    setCursor: panel.setCursor,
    listRef: panel.listRef
  }
}
