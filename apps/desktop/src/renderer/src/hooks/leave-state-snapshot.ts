/** leo BLOCK ④：离开会话时的判空快照（含附加物、建会话 / 首发 / 排队）。 */
import { useChatStore } from "../stores/chat-store"
import { composerHasExtras } from "./composer-draft-extras"
import { isNewSessionCreatePending } from "./new-session-create"
import { hasQueuedComposerSend } from "./queue-composer-send"
import type { LeaveState } from "./discard-empty-on-leave"

export function leaveStateSnapshot(): LeaveState {
  const s = useChatStore.getState()
  return {
    sessionId: s.sessionId,
    messages: s.messages,
    running: s.running,
    runId: s.runId,
    composer: s.composer,
    hasExtras: composerHasExtras(),
    preparingHint: s.preparingHint,
    preparingSessionId: s.preparingSessionId,
    createPending: isNewSessionCreatePending(),
    queuedSend: hasQueuedComposerSend()
  }
}
