/**
 * IPC 合约桶：领域 schema 拆到独立文件，这里只做再导出。
 */
export type { ReasoningEffort } from "./reasoning-effort"
export * from "./permission-mode"
export * from "./chat"
export * from "./approval"
export * from "./workspace-io"
export * from "./settings-input"
export * from "./automations"
export * from "./stream-event"
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
  TerminalOpenInput,
  TerminalSession,
  TerminalWriteInput
} from "./terminal"
export { WindowState, WindowActionResult } from "./window"
export * from "./generation"
export * from "./ui-message"
export * from "./assets"
export * from "./knowledge"
export * from "./workflow"
export * from "./mcp"
export * from "./realtime"
export * from "./observability"
export * from "./capabilities"
export * from "./session"
export * from "./skills"
