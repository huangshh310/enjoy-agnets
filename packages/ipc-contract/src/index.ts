/**
 * IPC 合约桶：领域 schema 拆到独立文件，这里只做再导出。
 */
export type { ReasoningEffort } from "./reasoning-effort"
export * from "./tool-names"
export * from "./permission-mode"
export * from "./chat"
export * from "./chat-readiness"
export * from "./quoted-context"
export * from "./action-chip"
export * from "./todo-continue"
export * from "./approval"
export * from "./desktop-always-allow"
export * from "./desktop-mention-apps"
export * from "./ask-user-questions"
export * from "./workspace-io"
export * from "./workspace-remote"
export * from "./workspace-preview"
export * from "./workspace-move-plan"
export * from "./account-profile"
export * from "./settings-input"
export * from "./automations"
export * from "./automations-missed"
export * from "./stream-event"
export * from "./turn-outcome"
export * from "./host-inject"
export {
  parseAssistantPayload,
  serializeAssistantPayload,
  type AssistantExtras,
  type AssistantPayload,
  type AssistantRunKind,
  type CitedAsset,
  type CitedSource,
  type ThreadToolCall,
  type ToolCallState
} from "./assistant-payload"
export { foldToolEvent, sealAbandonedTools } from "./fold-tool-event"
export { absorbTextDelta, clampThoughtSeconds, type ThinkBuffer } from "./think-text"
export {
  TerminalCloseInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalSession,
  TerminalWriteInput
} from "./terminal"
export {
  WindowState,
  WindowActionResult,
  WindowForceQuitInput,
  WindowSetTaskbarTitleInput,
  WindowOpenExternalInput,
  WindowOpenExternalResult,
  OpenExternalCode,
  externalUrlScheme,
  isAllowedExternalHttpScheme,
  externalUrlHasUserinfo,
  parseWindowOpenExternalInput
} from "./window"
export * from "./app-update"
export * from "./generation"
export * from "./ui-message"
export * from "./assets"
export * from "./knowledge"
export * from "./workflow"
export * from "./inbox"
export * from "./approvals-pending"
export * from "./restore-codes"
export * from "./approval-decide"
export * from "./sessions-needs-review"
export * from "./mcp"
export * from "./realtime"
export * from "./observability"
export * from "./estimated-cost"
export * from "./capabilities"
export * from "./runtime-capabilities"
export * from "./provider-agent-bind"
export * from "./power-source"
export * from "./session"
export * from "./session-fork"
export * from "./session-heartbeat"
export * from "./composer-preset"
export * from "./session-title"
export * from "./session-recap-kind"
export * from "./session-overlay"
export * from "./session-compaction"
export * from "./skills"
export * from "./skills-catalog"
export * from "./skill-sources"
export * from "./agent-tools"
export * from "./session-config"
export * from "./thought-seed"
export * from "./cli-compat"
export * from "./cli-region"
export * from "./rules"
export * from "./rules-always-on"
export * from "./agents-md-chain"
export * from "./inspect-prompt"
export * from "./builtin-tools"
export * from "./desktop-notify"
export * from "./desktop-act-codes"
export * from "./keybindings"
export * from "./computer-use-slash"
export * from "./appsnap"
export * from "./keybinding-resolve"
