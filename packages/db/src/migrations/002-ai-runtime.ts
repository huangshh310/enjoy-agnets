/**
 * AI Runtime 表：runs、parts、资产、知识库、MCP、指标。
 * messages.content 保留作兼容字段；parts 走 message_parts。
 */
import type { Migration } from "./types.ts"

export const aiRuntimeMigration: Migration = {
  version: 2,
  name: "ai-runtime",
  sql: `
    CREATE TABLE IF NOT EXISTS message_parts (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      workspace_id TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      model_id TEXT,
      provider_id TEXT,
      checkpoint TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS run_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL,
      input_summary TEXT,
      output_summary TEXT,
      duration_ms INTEGER,
      checkpoint_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      tool_call_id TEXT NOT NULL,
      name TEXT NOT NULL,
      args TEXT NOT NULL,
      hmac TEXT NOT NULL,
      decision TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      media_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      hash TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS provider_file_refs (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_family TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      ref TEXT NOT NULL,
      scope TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      path TEXT NOT NULL,
      start_line INTEGER,
      end_line INTEGER,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_embeddings (
      chunk_id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      vector TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL,
      command TEXT,
      url TEXT,
      env_ref TEXT,
      allowed_resource_uris TEXT NOT NULL DEFAULT '[]',
      model_visible_tools TEXT NOT NULL DEFAULT '[]',
      app_only_tools TEXT NOT NULL DEFAULT '[]',
      trusted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mcp_permissions (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS telemetry_metrics (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      model_id TEXT,
      status TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      duration_ms INTEGER,
      ttfo_ms INTEGER,
      tokens_per_second REAL,
      error_class TEXT,
      created_at INTEGER NOT NULL
    );
  `
}
