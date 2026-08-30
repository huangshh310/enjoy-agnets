import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rootPath: text("root_path").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull()
});

export const messageParts = sqliteTable("message_parts", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
  ordinal: integer("ordinal").notNull()
});

export const toolCalls = sqliteTable("tool_calls", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  runId: text("run_id").notNull(),
  name: text("name").notNull(),
  args: text("args").notNull(),
  result: text("result"),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull()
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  toolCallId: text("tool_call_id").notNull(),
  name: text("name").notNull(),
  args: text("args").notNull(),
  decision: text("decision"),
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at")
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});

export const mcpServers = sqliteTable("mcp_servers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  transport: text("transport").notNull(),
  config: text("config").notNull(),
  enabled: integer("enabled").notNull().default(1)
});

export const filesIndex = sqliteTable("files_index", {
  workspaceId: text("workspace_id").notNull(),
  path: text("path").notNull(),
  hash: text("hash").notNull(),
  mtime: integer("mtime").notNull()
});
