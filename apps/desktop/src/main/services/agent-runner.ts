import type { BrowserWindow } from "electron";
import type { ModelMessage } from "ai";
import { streamCodingAgent } from "@enjoy-agents/agent-core";
import {
  ApprovalDecision,
  RunAgentInput,
  type StreamEvent
} from "@enjoy-agents/ipc-contract";
import { createLanguageModel, providerForModel } from "@enjoy-agents/providers";
import { getDatabase } from "./database";
import { createId } from "./ids";
import { readSecret } from "./secrets";
import { createWorkspaceHost, getWorkspace, openWorkspace } from "./workspace";

const activeRuns = new Map<
  string,
  { abort: AbortController; messages: ModelMessage[] }
>();

export function emitEvent(window: BrowserWindow, event: StreamEvent) {
  window.webContents.send("agent.event", event);
}

export async function listSessions(workspaceId: string) {
  return getDatabase()
    .prepare(
      "SELECT id, workspace_id as workspaceId, title, created_at as createdAt, updated_at as updatedAt FROM sessions WHERE workspace_id = ? ORDER BY updated_at DESC"
    )
    .all(workspaceId);
}

export async function listMessages(sessionId: string) {
  return getDatabase()
    .prepare(
      "SELECT id, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(sessionId);
}

export async function createSession(workspaceId: string, title: string) {
  const now = Date.now();
  const record = {
    id: createId("ses"),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now
  };
  getDatabase()
    .prepare(
      "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(record.id, record.workspaceId, record.title, record.createdAt, record.updatedAt);
  return record;
}

export async function runAgent(window: BrowserWindow, rawInput: unknown) {
  const input = RunAgentInput.parse(rawInput);
  const secret = await readSecret();
  if (!secret) {
    throw new Error("Add an API key in Settings before running an agent.");
  }

  let workspace
  try {
    workspace = await getWorkspace(input.workspaceId)
  } catch {
    workspace = await openWorkspace(process.cwd())
  }
  const runId = createId("run");
  const abort = new AbortController();
  const modelMessages: ModelMessage[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
  activeRuns.set(runId, { abort, messages: modelMessages });

  const lastUser = [...input.messages].reverse().find((message) => message.role === "user");
  if (lastUser) {
    await persistMessage(input.sessionId, "user", lastUser.content);
    await maybeRenameSession(input.sessionId, lastUser.content);
  }

  emitEvent(window, { type: "run.start", runId, sessionId: input.sessionId });

  void pumpStream({
    window,
    runId,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    modelMessages,
    abort
  });

  return { runId };
}

export async function abortAgent(runId: string) {
  activeRuns.get(runId)?.abort.abort();
  activeRuns.delete(runId);
  return { ok: true };
}

export async function decideApproval(window: BrowserWindow, rawInput: unknown) {
  const decision = ApprovalDecision.parse(rawInput);
  emitEvent(window, {
    type: "approval.resolved",
    runId: decision.runId,
    toolCallId: decision.toolCallId,
    decision: decision.decision
  });
  return { ok: true };
}

async function pumpStream(options: {
  window: BrowserWindow;
  runId: string;
  input: RunAgentInput;
  workspaceRoot: string;
  secret: { provider: string; apiKey: string; baseURL?: string };
  modelMessages: ModelMessage[];
  abort: AbortController;
}) {
  const { window, runId, input, workspaceRoot, secret, modelMessages, abort } = options;
  try {
    const model = createLanguageModel({
      provider: providerForModel(input.modelId),
      apiKey: secret.apiKey,
      baseURL: secret.baseURL,
      modelId: input.modelId
    });

    const result = await streamCodingAgent({
      model,
      mode: input.mode,
      messages: modelMessages,
      abortSignal: abort.signal,
      runtimeContext: {
        workspaceRoot,
        sessionId: input.sessionId,
        runId,
        host: createWorkspaceHost(workspaceRoot)
      }
    });

    let assistantText = "";
    const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream;
    if (!stream) {
      throw new Error("Agent stream did not expose fullStream.");
    }

    for await (const part of stream) {
      const type = String(part.type ?? "");
      if (type === "text-delta") {
        const text = String(part.text ?? part.delta ?? "");
        assistantText += text;
        emitEvent(window, { type: "text.delta", runId, text });
      } else if (type === "reasoning-delta") {
        emitEvent(window, {
          type: "reasoning.delta",
          runId,
          text: String(part.text ?? part.delta ?? "")
        });
      } else if (type === "tool-call" || type === "tool-call-streaming-start") {
        emitEvent(window, {
          type: "tool.start",
          runId,
          toolCallId: String(part.toolCallId ?? createId("tool")),
          name: String(part.toolName ?? "tool")
        });
      } else if (type === "tool-call-delta") {
        emitEvent(window, {
          type: "tool.args.delta",
          runId,
          toolCallId: String(part.toolCallId ?? ""),
          delta: String(part.argsTextDelta ?? part.delta ?? "")
        });
      } else if (type === "tool-result") {
        emitEvent(window, {
          type: "tool.result",
          runId,
          toolCallId: String(part.toolCallId ?? ""),
          name: String(part.toolName ?? "tool"),
          result: part.output ?? part.result
        });
      } else if (type === "tool-approval-request") {
        emitEvent(window, {
          type: "approval.required",
          runId,
          toolCallId: String(part.toolCallId ?? ""),
          approvalId: String(part.approvalId ?? createId("apr")),
          name: String(part.toolName ?? "tool"),
          args: part.input ?? part.args
        });
      }
    }

    if (assistantText.trim()) {
      await persistMessage(input.sessionId, "assistant", assistantText);
    }
    emitEvent(window, { type: "run.end", runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitEvent(window, { type: "run.error", runId, message });
  } finally {
    activeRuns.delete(runId);
  }
}

async function persistMessage(sessionId: string, role: string, content: string) {
  const now = Date.now();
  const existing = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ?")
    .get(sessionId) as { id: string } | undefined
  if (!existing) {
    getDatabase()
      .prepare(
        "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(sessionId, "ws_local", "coding scenario", now, now)
  }
  getDatabase()
    .prepare(
      "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(createId("msg"), sessionId, role, content, now);
  getDatabase().prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
}

async function maybeRenameSession(sessionId: string, userText: string) {
  const current = getDatabase()
    .prepare("SELECT title FROM sessions WHERE id = ?")
    .get(sessionId) as { title: string } | undefined;
  if (!current || current.title !== "New agent") return;
  const title = userText.replace(/\s+/g, " ").slice(0, 42) || "New agent";
  getDatabase()
    .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
    .run(title, Date.now(), sessionId);
}
