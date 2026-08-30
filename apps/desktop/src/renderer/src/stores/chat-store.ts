import { create } from "zustand";
import type { StreamEvent } from "@enjoy-agents/ipc-contract";
import { createDemoThread, type ThreadMessage } from "../data/demo-thread";
import { relativeTime } from "../lib/time";

export type RepositoryNode = {
  id: string;
  name: string;
  kind: "workspace" | "session";
  parentId?: string;
  updatedAt: number;
  workspaceId?: string;
};

export type ChangedFileRow = {
  path: string;
  status: "added" | "modified" | "deleted" | "untracked";
  additions: number;
  deletions: number;
};

export type ChatStore = {
  userName: string;
  workspaceId: string | null;
  workspaceName: string;
  workspaceRootLabel: string;
  sessionId: string;
  sessionTitle: string;
  repositories: RepositoryNode[];
  expandedIds: string[];
  messages: ThreadMessage[];
  composer: string;
  modelId: string;
  modelLabel: string;
  mode: "agent" | "plan" | "ask" | "debug";
  running: boolean;
  runId: string | null;
  thinkingLabel: string;
  settingsOpen: string | false;
  apiKeyDraft: string;
  providerDraft: "deepseek" | "openai" | "anthropic" | "openrouter" | "ollama";
  hasKey: boolean;
  contextUsed: number;
  selectedFilePath: string;
  selectedFileContent: string;
  changes: ChangedFileRow[];
  additions: number;
  deletions: number;
  rightTab: "changes" | "browser";
  pendingApproval: StreamEvent & { type: "approval.required" } | null;
  error: string | null;
  setComposer: (value: string) => void;
  setModel: (id: string, label: string) => void;
  setMode: (mode: ChatStore["mode"]) => void;
  setRightTab: (tab: ChatStore["rightTab"]) => void;
  setSettingsOpen: (open: ChatStore["settingsOpen"]) => void;
  setApiKeyDraft: (value: string) => void;
  setProviderDraft: (value: ChatStore["providerDraft"]) => void;
  selectSession: (sessionId: string) => void;
  toggleExpanded: (id: string) => void;
  applyStreamEvent: (event: StreamEvent) => void;
  appendUserMessage: (content: string) => ThreadMessage[];
  setRunning: (running: boolean, runId?: string | null) => void;
  setHasKey: (hasKey: boolean) => void;
  setError: (message: string | null) => void;
  setWorkspace: (workspace: { id: string; name: string; rootPath: string }) => void;
  setSelectedFile: (path: string, content: string) => void;
  setChanges: (changes: ChangedFileRow[]) => void;
  setPendingApproval: (event: ChatStore["pendingApproval"]) => void;
  hydrateSessions: (sessions: Array<{ id: string; title: string; updatedAt: number; workspaceId: string }>) => void;
  startNewSession: () => void;
};

const DEMO_WORKSPACE_ID = "ws_vibi";
const DEMO_SESSION_ID = "ses_coding_scenario";

const demoRepositories: RepositoryNode[] = [
  { id: "ws_boardui", name: "boardui", kind: "workspace", updatedAt: Date.now() - 86400000 },
  { id: DEMO_WORKSPACE_ID, name: "vibi coding project", kind: "workspace", updatedAt: Date.now() },
  { id: "ses_landing", name: "landing page design", kind: "session", parentId: DEMO_WORKSPACE_ID, updatedAt: Date.now() - 34 * 60_000, workspaceId: DEMO_WORKSPACE_ID },
  { id: "ses_image", name: "image generation", kind: "session", parentId: DEMO_WORKSPACE_ID, updatedAt: Date.now() - 20_000, workspaceId: DEMO_WORKSPACE_ID },
  { id: DEMO_SESSION_ID, name: "coding scenario", kind: "session", parentId: DEMO_WORKSPACE_ID, updatedAt: Date.now() - 10_000, workspaceId: DEMO_WORKSPACE_ID },
  { id: "ses_vue", name: "mobile app for vuejs...", kind: "session", parentId: DEMO_WORKSPACE_ID, updatedAt: Date.now() - 5 * 3600_000, workspaceId: DEMO_WORKSPACE_ID },
  { id: "ses_refactor", name: "code refactor dropd...", kind: "session", parentId: DEMO_WORKSPACE_ID, updatedAt: Date.now() - 18 * 3600_000, workspaceId: DEMO_WORKSPACE_ID },
  { id: "ws_strider", name: "strider landing page work", kind: "workspace", updatedAt: Date.now() - 2 * 86400000 },
  { id: "ws_pirate", name: "pirate mini game iOS", kind: "workspace", updatedAt: Date.now() - 3 * 86400000 }
];

export const useChatStore = create<ChatStore>((set, get) => ({
  userName: "Enjoy Agents",
  workspaceId: DEMO_WORKSPACE_ID,
  workspaceName: "vibi coding project",
  workspaceRootLabel: "project-sea",
  sessionId: DEMO_SESSION_ID,
  sessionTitle: "coding scenario",
  repositories: demoRepositories,
  expandedIds: [DEMO_WORKSPACE_ID],
  messages: createDemoThread(),
  composer: "",
  modelId: "deepseek-chat",
  modelLabel: "DeepSeek V4",
  mode: "agent",
  running: false,
  runId: null,
  thinkingLabel: "Thinking",
  settingsOpen: false,
  apiKeyDraft: "",
  providerDraft: "deepseek",
  hasKey: false,
  contextUsed: 57,
  selectedFilePath: "boardui/app/components/button.tsx",
  selectedFileContent: "",
  changes: [
    { path: "boardui/app/components/button.tsx", status: "added", additions: 74, deletions: 0 }
  ],
  additions: 156,
  deletions: 23,
  rightTab: "changes",
  pendingApproval: null,
  error: null,
  setComposer: (composer) => set({ composer }),
  setModel: (modelId, modelLabel) => set({ modelId, modelLabel }),
  setMode: (mode) => set({ mode }),
  setRightTab: (rightTab) => set({ rightTab }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setApiKeyDraft: (apiKeyDraft) => set({ apiKeyDraft }),
  setProviderDraft: (providerDraft) => set({ providerDraft }),
  selectSession: (sessionId) => {
    const node = get().repositories.find((item) => item.id === sessionId);
    if (!node) return;
    set({
      sessionId,
      sessionTitle: node.name,
      workspaceId: node.workspaceId ?? node.id,
      workspaceName:
        get().repositories.find((item) => item.id === (node.parentId ?? node.id))?.name ??
        node.name
    });
  },
  toggleExpanded: (id) => {
    const expandedIds = get().expandedIds.includes(id)
      ? get().expandedIds.filter((item) => item !== id)
      : [...get().expandedIds, id];
    set({ expandedIds });
  },
  applyStreamEvent: (event) => {
    if (event.type === "text.delta") {
      const messages = [...get().messages];
      const last = messages.at(-1);
      if (last?.role === "assistant" && last.streaming) {
        last.content += event.text;
      } else {
        messages.push({
          id: `msg_${event.runId}`,
          role: "assistant",
          content: event.text,
          createdAt: Date.now(),
          streaming: true
        });
      }
      set({ messages, thinkingLabel: "Writing" });
    } else if (event.type === "reasoning.delta") {
      set({ thinkingLabel: "Thinking" });
    } else if (event.type === "tool.start") {
      set({ thinkingLabel: event.name.replaceAll("_", " ") });
    } else if (event.type === "approval.required") {
      set({ pendingApproval: event, thinkingLabel: "Waiting for approval" });
    } else if (event.type === "run.end") {
      set({
        running: false,
        runId: null,
        pendingApproval: null,
        messages: get().messages.map((message) => ({ ...message, streaming: false }))
      });
    } else if (event.type === "run.error") {
      set({
        running: false,
        error: event.message,
        messages: get().messages.map((message) => ({ ...message, streaming: false }))
      });
    }
  },
  appendUserMessage: (content) => {
    const messages = [
      ...get().messages,
      { id: `msg_user_${Date.now()}`, role: "user" as const, content, createdAt: Date.now() }
    ];
    set({ messages, composer: "", error: null });
    return messages;
  },
  setRunning: (running, runId = null) => set({ running, runId: runId ?? null }),
  setHasKey: (hasKey) => set({ hasKey }),
  setError: (error) => set({ error }),
  setWorkspace: (workspace) =>
    set({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceRootLabel: workspace.rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace.name
    }),
  setSelectedFile: (selectedFilePath, selectedFileContent) =>
    set({ selectedFilePath, selectedFileContent }),
  setChanges: (changes) => {
    const additions = changes.reduce((sum, file) => sum + file.additions, 0);
    const deletions = changes.reduce((sum, file) => sum + file.deletions, 0);
    set({ changes, additions, deletions });
  },
  setPendingApproval: (pendingApproval) => set({ pendingApproval }),
  hydrateSessions: (sessions) => {
    if (sessions.length === 0) return;
    const workspaceId = sessions[0]!.workspaceId;
    const repositories: RepositoryNode[] = [
      {
        id: workspaceId,
        name: get().workspaceName,
        kind: "workspace",
        updatedAt: Date.now()
      },
      ...sessions.map((session) => ({
        id: session.id,
        name: session.title,
        kind: "session" as const,
        parentId: workspaceId,
        updatedAt: session.updatedAt,
        workspaceId
      }))
    ];
    set({ repositories, expandedIds: [workspaceId] });
  }
  ,
  startNewSession: () => {
    const parentId = get().workspaceId ?? DEMO_WORKSPACE_ID
    const sessionId = `ses_${Date.now()}`
    const session: RepositoryNode = {
      id: sessionId,
      name: "New agent",
      kind: "session",
      parentId,
      workspaceId: parentId,
      updatedAt: Date.now()
    }
    set({
      repositories: [...get().repositories, session],
      expandedIds: Array.from(new Set([...get().expandedIds, parentId])),
      sessionId,
      sessionTitle: session.name,
      messages: [],
      composer: "",
      error: null
    })
  }
}));

export function formatNodeTime(timestamp: number): string {
  return relativeTime(timestamp);
}
