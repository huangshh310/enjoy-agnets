/**
 * SSH 主机名册 CRUD。upsert 按 user@host:port 去重；删前检查引用。
 */
import type { SshAuth, SshHost, SshHostSource, SshHostUpsertInput } from "@enjoy-agents/ipc-contract"
import type { DatabaseSync } from "node:sqlite"
import { createId } from "../ids.ts"
import { HOST_IN_USE, RemoteWorkspaceError } from "./ssh-errors.ts"

type HostRow = {
  id: string
  alias: string
  host: string
  user: string
  port: number
  auth: SshAuth
  key_path: string | null
  source: SshHostSource
}

const HOST_SELECT = `id, alias, host, user, port, auth, key_path, source`

export function ensureSshHostsBackfill(sqlite: DatabaseSync): void {
  const conn = sqlite
  const orphans = conn
    .prepare(
      `SELECT DISTINCT ssh_user as user, ssh_host as host, ssh_port as port, ssh_auth as auth, ssh_key_path as keyPath
       FROM workspaces
       WHERE kind = 'ssh' AND ssh_host_id IS NULL AND ssh_host IS NOT NULL AND ssh_user IS NOT NULL`
    )
    .all() as Array<{ user: string; host: string; port: number | null; auth: string | null; keyPath: string | null }>
  for (const row of orphans) {
    const host = upsertSshHost(
      {
        alias: `${row.user}@${row.host}`,
        host: row.host,
        user: row.user,
        port: row.port ?? 22,
        auth: publicAuth(row.auth),
        keyPath: row.keyPath ?? undefined,
        source: "manual"
      },
      conn
    )
    conn
      .prepare(
        `UPDATE workspaces SET ssh_host_id = ? WHERE kind = 'ssh' AND ssh_host = ? AND ssh_user = ? AND IFNULL(ssh_port, 22) = ? AND ssh_host_id IS NULL`
      )
      .run(host.id, row.host, row.user, row.port ?? 22)
  }
}

export function listSshHosts(sqlite: DatabaseSync): SshHost[] {
  ensureSshHostsBackfill(sqlite)
  const rows = sqlite.prepare(`SELECT ${HOST_SELECT} FROM ssh_hosts ORDER BY alias COLLATE NOCASE`).all() as HostRow[]
  return rows.map((row) => toPublicHost(row, sqlite))
}

export function getSshHost(id: string, sqlite: DatabaseSync): SshHost {
  const row = sqlite.prepare(`SELECT ${HOST_SELECT} FROM ssh_hosts WHERE id = ?`).get(id) as HostRow | undefined
  if (!row) throw new Error(`Unknown SSH host: ${id}`)
  return toPublicHost(row, sqlite)
}

export function upsertSshHost(input: SshHostUpsertInput, sqlite: DatabaseSync): SshHost {
  const now = Date.now()
  const existing = findExisting(input, sqlite)
  if (existing) return updateExisting(existing, input, now, sqlite)
  const id = createId("sshhost")
  sqlite
    .prepare(
      `INSERT INTO ssh_hosts (id, alias, host, user, port, auth, key_path, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.alias.trim(), input.host.trim(), input.user.trim(), input.port, input.auth, input.keyPath?.trim() ?? null, input.source ?? "manual", now, now)
  return getSshHost(id, sqlite)
}

export function removeSshHost(id: string, sqlite: DatabaseSync): { id: string } {
  ensureSshHostsBackfill(sqlite)
  const host = getSshHost(id, sqlite)
  if (host.workspaceCount > 0) {
    const names = host.workspaces.map((item) => item.name).join(", ")
    throw new RemoteWorkspaceError(HOST_IN_USE, `${HOST_IN_USE}: ${names}`)
  }
  sqlite.prepare("DELETE FROM ssh_hosts WHERE id = ?").run(id)
  return { id }
}

function findExisting(input: SshHostUpsertInput, sqlite: DatabaseSync): HostRow | undefined {
  const conn = sqlite
  if (input.id) {
    return conn.prepare(`SELECT ${HOST_SELECT} FROM ssh_hosts WHERE id = ?`).get(input.id) as HostRow | undefined
  }
  return conn
    .prepare(`SELECT ${HOST_SELECT} FROM ssh_hosts WHERE user = ? AND host = ? AND port = ?`)
    .get(input.user.trim(), input.host.trim(), input.port) as HostRow | undefined
}

function updateExisting(existing: HostRow, input: SshHostUpsertInput, now: number, sqlite: DatabaseSync): SshHost {
  sqlite
    .prepare(
      `UPDATE ssh_hosts SET alias = ?, host = ?, user = ?, port = ?, auth = ?, key_path = ?, source = ?, updated_at = ? WHERE id = ?`
    )
    .run(
      input.alias.trim(),
      input.host.trim(),
      input.user.trim(),
      input.port,
      input.auth,
      input.keyPath?.trim() ?? null,
      input.source ?? existing.source,
      now,
      existing.id
    )
  syncWorkspaceColumns(existing.id, input, sqlite)
  return getSshHost(existing.id, sqlite)
}

function syncWorkspaceColumns(hostId: string, input: SshHostUpsertInput, sqlite: DatabaseSync): void {
  sqlite
    .prepare(
      `UPDATE workspaces SET ssh_host = ?, ssh_user = ?, ssh_port = ?, ssh_auth = ?, ssh_key_path = ?, updated_at = ?
       WHERE ssh_host_id = ?`
    )
    .run(input.host.trim(), input.user.trim(), input.port, input.auth, input.keyPath?.trim() ?? null, Date.now(), hostId)
}

function publicAuth(auth: string | null | undefined): SshAuth {
  if (auth === "keypath" || auth === "password") return auth
  return "agent"
}

function toPublicHost(row: HostRow, sqlite: DatabaseSync): SshHost {
  const workspaces = sqlite
    .prepare(`SELECT id, name, remote_path as remotePath FROM workspaces WHERE ssh_host_id = ? ORDER BY name`)
    .all(row.id) as Array<{ id: string; name: string; remotePath: string | null }>
  return {
    id: row.id,
    alias: row.alias,
    host: row.host,
    user: row.user,
    port: row.port,
    auth: publicAuth(row.auth),
    keyPath: row.key_path ?? undefined,
    source: row.source === "wsl" ? "wsl" : row.source === "ssh_config" ? "ssh_config" : "manual",
    workspaceCount: workspaces.length,
    workspaces: workspaces.map((item) => ({
      id: item.id,
      name: item.name,
      remotePath: item.remotePath ?? ""
    }))
  }
}
