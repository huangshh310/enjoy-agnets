/**
 * 斜杠选中后的宿主动作：压缩立刻执行；/plan 等一律切 store 模式（对照 Codex）。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { compactSessionOrReport } from "../../right-pane/views/context/compact-session/run-session-compact.ts"
import { addComposerSkillChip } from "./composer-skill-chips.ts"
import type { MentionItem } from "./mention-items.ts"

export function applySlashPick(item: Exclude<MentionItem, { kind: "file" }>): void {
  if (item.kind === "web" || item.kind === "doc") return
  if (item.kind === "command") {
    if (item.name === "compact") compactFromSlash()
    return
  }
  if (item.kind === "skill") {
    addComposerSkillChip(item.skill)
    return
  }
  if (item.kind === "mode") useChatStore.getState().setMode(item.mode)
}

function compactFromSlash() {
  void compactSessionOrReport(useChatStore.getState().sessionId)
}
