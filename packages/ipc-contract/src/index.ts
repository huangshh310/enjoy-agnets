import { z } from "zod";

export const AgentMode = z.enum(["agent", "plan", "ask", "debug"]);
export type AgentMode = z.infer<typeof AgentMode>;

export const ChatRole = z.enum(["user", "assistant", "system"]);
export type ChatRole = z.infer<typeof ChatRole>;

export const ChatMessage = z.object({
  id: z.string().optional(),
  role: ChatRole,
  content: z.string()
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const RunAgentInput = z.object({
  sessionId: z.string(),
  workspaceId: z.string(),
  modelId: z.string(),
  mode: AgentMode.default("agent"),
  messages: z.array(ChatMessage)
});
export type RunAgentInput = z.infer<typeof RunAgentInput>;

export const AbortAgentInput = z.object({
  runId: z.string()
});
export type AbortAgentInput = z.infer<typeof AbortAgentInput>;

export const ApprovalDecision = z.object({
  runId: z.string(),
  toolCallId: z.string(),
  approvalId: z.string(),
  decision: z.enum(["allow", "deny", "allow_session"]),
  reason: z.string().optional()
});
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const OpenWorkspaceInput = z.object({
  path: z.string().optional()
});
export type OpenWorkspaceInput = z.infer<typeof OpenWorkspaceInput>;

export const ReadFileInput = z.object({
  workspaceId: z.string(),
  path: z.string()
});
export type ReadFileInput = z.infer<typeof ReadFileInput>;

export const ListDirInput = z.object({
  workspaceId: z.string(),
  path: z.string().default(".")
});
export type ListDirInput = z.infer<typeof ListDirInput>;

export const SaveSecretInput = z.object({
  provider: z.string().min(1),
  apiKey: z.string().default(""),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  name: z.string().optional()
});
export type SaveSecretInput = z.infer<typeof SaveSecretInput>;

export const UpsertProviderInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  apiStyle: z.string().optional(),
  activate: z.boolean().optional()
});
export type UpsertProviderInput = z.infer<typeof UpsertProviderInput>;

export const ProbeProviderInput = z.object({
  id: z.string().optional(),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  apiStyle: z.string().optional()
});
export type ProbeProviderInput = z.infer<typeof ProbeProviderInput>;

export const ProviderPublic = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  baseURL: z.string(),
  modelId: z.string(),
  apiStyle: z.string().default("openai"),
  hasKey: z.boolean(),
  keyHint: z.string(),
  active: z.boolean(),
  requiresKey: z.boolean()
});
export type ProviderPublic = z.infer<typeof ProviderPublic>;

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run.start"), runId: z.string(), sessionId: z.string() }),
  z.object({
    type: z.literal("text.delta"),
    runId: z.string(),
    text: z.string()
  }),
  z.object({
    type: z.literal("reasoning.delta"),
    runId: z.string(),
    text: z.string()
  }),
  z.object({
    type: z.literal("tool.start"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string()
  }),
  z.object({
    type: z.literal("tool.args.delta"),
    runId: z.string(),
    toolCallId: z.string(),
    delta: z.string()
  }),
  z.object({
    type: z.literal("tool.result"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string(),
    result: z.unknown()
  }),
  z.object({
    type: z.literal("approval.required"),
    runId: z.string(),
    toolCallId: z.string(),
    approvalId: z.string(),
    name: z.string(),
    args: z.unknown()
  }),
  z.object({
    type: z.literal("approval.resolved"),
    runId: z.string(),
    toolCallId: z.string(),
    decision: z.enum(["allow", "deny", "allow_session"])
  }),
  z.object({
    type: z.literal("file.changed"),
    runId: z.string().optional(),
    path: z.string(),
    kind: z.enum(["created", "modified", "deleted"])
  }),
  z.object({ type: z.literal("run.end"), runId: z.string() }),
  z.object({ type: z.literal("run.error"), runId: z.string(), message: z.string() })
]);
export type StreamEvent = z.infer<typeof StreamEvent>;

export const WorkspaceSummary = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string()
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>;

export const SessionSummary = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  relativeTime: z.string().optional()
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const ModelOption = z.object({
  id: z.string(),
  label: z.string(),
  provider: z.string()
});
export type ModelOption = z.infer<typeof ModelOption>;

export const SettingsSnapshot = z.object({
  hasKey: z.boolean(),
  provider: z.string().nullable(),
  baseURL: z.string().nullable(),
  defaultModelId: z.string(),
  lastWorkspaceId: z.string().nullable(),
  providers: z.array(ProviderPublic).default([]),
  preferences: z.object({
    requireWriteApproval: z.boolean(),
    requireBashApproval: z.boolean(),
    language: z.enum(["auto", "en", "zh"]),
    defaultMode: AgentMode,
    customInstructions: z.string()
  })
});
export type SettingsSnapshot = z.infer<typeof SettingsSnapshot>;

export const SetPreferencesInput = z.object({
  requireWriteApproval: z.boolean().optional(),
  requireBashApproval: z.boolean().optional(),
  language: z.enum(["auto", "en", "zh"]).optional(),
  defaultMode: AgentMode.optional(),
  customInstructions: z.string().optional()
});
export type SetPreferencesInput = z.infer<typeof SetPreferencesInput>;

export const AutomationTrigger = z.enum(["manual", "on_save"]);
export type AutomationTrigger = z.infer<typeof AutomationTrigger>;

export const Automation = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  trigger: AutomationTrigger,
  enabled: z.boolean(),
  updatedAt: z.number()
});
export type Automation = z.infer<typeof Automation>;

export const UpsertAutomationInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  prompt: z.string(),
  trigger: AutomationTrigger,
  enabled: z.boolean().default(true)
});
export type UpsertAutomationInput = z.infer<typeof UpsertAutomationInput>;

export const FileEntry = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.enum(["file", "directory"]),
  size: z.number().optional()
});
export type FileEntry = z.infer<typeof FileEntry>;

export const ChangedFile = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted", "untracked"]),
  additions: z.number().default(0),
  deletions: z.number().default(0)
});
export type ChangedFile = z.infer<typeof ChangedFile>;
