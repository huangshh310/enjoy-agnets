/**
 * MCP Server 与权限仓储。
 */
import type { AppDatabase } from "../client"

export type McpServerRow = {
  id: string
  name: string
  transport: string
  command: string | null
  url: string | null
  envRef: string | null
  allowedResourceUris: string
  modelVisibleTools: string
  appOnlyTools: string
  trusted: number
  createdAt: number
}

export function upsertMcpServer(db: AppDatabase, row: McpServerRow): void {
  db.prepare(
    `INSERT INTO mcp_servers
      (id, name, transport, command, url, env_ref, allowed_resource_uris, model_visible_tools, app_only_tools, trusted, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       transport = excluded.transport,
       command = excluded.command,
       url = excluded.url,
       env_ref = excluded.env_ref,
       allowed_resource_uris = excluded.allowed_resource_uris,
       model_visible_tools = excluded.model_visible_tools,
       app_only_tools = excluded.app_only_tools,
       trusted = excluded.trusted`
  ).run(
    row.id,
    row.name,
    row.transport,
    row.command,
    row.url,
    row.envRef,
    row.allowedResourceUris,
    row.modelVisibleTools,
    row.appOnlyTools,
    row.trusted,
    row.createdAt
  )
}

export function listMcpServers(db: AppDatabase): McpServerRow[] {
  return db
    .prepare(
      `SELECT id, name, transport, command, url, env_ref as envRef,
              allowed_resource_uris as allowedResourceUris,
              model_visible_tools as modelVisibleTools,
              app_only_tools as appOnlyTools, trusted, created_at as createdAt
       FROM mcp_servers ORDER BY created_at DESC`
    )
    .all() as McpServerRow[]
}

export function deleteMcpServer(db: AppDatabase, id: string): void {
  db.prepare("DELETE FROM mcp_permissions WHERE server_id = ?").run(id)
  db.prepare("DELETE FROM mcp_servers WHERE id = ?").run(id)
}

export function setMcpPermission(
  db: AppDatabase,
  row: { id: string; serverId: string; scope: string; name: string; level: string }
): void {
  db.prepare(
    `INSERT INTO mcp_permissions (id, server_id, scope, name, level) VALUES (?, ?, ?, ?, ?)`
  ).run(row.id, row.serverId, row.scope, row.name, row.level)
}

export function listMcpPermissions(
  db: AppDatabase,
  serverId: string
): Array<{ scope: string; name: string; level: string }> {
  return db
    .prepare("SELECT scope, name, level FROM mcp_permissions WHERE server_id = ?")
    .all(serverId) as Array<{ scope: string; name: string; level: string }>
}
