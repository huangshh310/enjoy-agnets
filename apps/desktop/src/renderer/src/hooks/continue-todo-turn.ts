/**
 * 续跑未完成 Todo：不往对话里插新的用户气泡，也不落库用户句。
 */
import { TODO_CONTINUE_PROMPT } from "@enjoy-agents/ipc-contract"
import { requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  dropTrailingContinueTurns,
  isTodoContinueUserMessage
} from "../components/ai-chat/composer/todo-continue-message"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore, type ChatStore, type ThreadMessage } from "../stores/chat-store"
import { abortOrphanedRun, claimComposerRun } from "./composer-run-control"
import { composerRunKind } from "./composer-run-kind"
import { codingAgentRunInput } from "./agent-run-payload"
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import { pendingAssistantStamp } from "../lib/pending-assistant-stamp"
import { prefixHostModeForSend } from "./runtime-interact/composer-draft"
import { desktopBiasForRun } from "./runtime-interact/desktop-bias-for-run"

export async function continueTodoTurn(): Promise<void> {
  const store = useChatStore.getState()
  if (store.running || !hasIde()) return
  if (!store.workspaceId || !store.sessionId) return
  const runKind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(
        store.modelId,
        store.models.find((model) => model.id === store.modelId)?.capabilities
      )
  if (runKind === "image" || runKind === "video") {
    store.setError("Switch to a coding model before continuing the Todo List.")
    return
  }
  await startContinueRun(store, dropTrailingContinueTurns(store.messages), runKind)
}

async function startContinueRun(
  store: ChatStore,
  trimmed: ThreadMessage[],
  runKind: ReturnType<typeof composerRunKind>
) {
  store.setError(null)
  store.setMessages([...trimmed, pendingAssistant(store, runKind)])
  store.setRunning(true)
  const sessionId = store.sessionId
  const history = [
    ...trimmed.map((message) => ({
      role: message.role,
      content: message.content,
      reasoning: message.reasoning
    })),
    { role: "user" as const, content: prefixHostModeForSend(TODO_CONTINUE_PROMPT) }
  ]
  const lastUser = [...trimmed]
    .reverse()
    .find((message) => message.role === "user" && !isTodoContinueUserMessage(message.content))
  const desktopBias = lastUser ? await desktopBiasForRun(lastUser.content) : undefined
  try {
    const result = (await getIde().agent.run({
      ...codingAgentRunInput(store),
      messages: history,
      attachments: [],
      persistUser: false,
      commandId: crypto.randomUUID(),
      ...(desktopBias ? { desktopBias } : {})
    }))
    const runId = requireAgentRunId(result)
    if (!claimComposerRun(sessionId, runId)) abortOrphanedRun(runId)
  } catch (error) {
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

function pendingAssistant(
  store: ChatStore,
  runKind: ReturnType<typeof composerRunKind>
): ThreadMessage {
  return {
    id: `msg_pending_${Date.now()}`,
    role: "assistant",
    content: "",
    createdAt: Date.now(),
    streaming: true,
    reasoning: "",
    tools: [],
    runKind,
    ...pendingAssistantStamp(store)
  }
}
