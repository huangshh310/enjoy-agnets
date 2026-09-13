import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations } from "../../../../../../packages/db/src/migrations/runner.ts"
import { ensureSshHostsBackfill, listSshHosts, removeSshHost, upsertSshHost } from "./ssh-hosts.ts"

function memoryDb() {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  return db
}

function insertSshWorkspace(db: DatabaseSync, id: string, path: string) {
  const now = Date.now()
  db.prepare(
    `INSERT INTO workspaces (id, name, root_path, created_at, updated_at, kind, ssh_host, ssh_user, ssh_port, ssh_auth, remote_path, ssh_status)
     VALUES (?, ?, ?, ?, ?, 'ssh', 'dev.internal', 'alice', 22, 'agent', ?, 'idle')`
  ).run(id, id, `alice@dev.internal:${path}`, now, now, path)
}

test("两条同 endpoint 工作区 backfill 成一台 host", () => {
  const db = memoryDb()
  insertSshWorkspace(db, "ws_a", "/home/alice/a")
  insertSshWorkspace(db, "ws_b", "/home/alice/b")
  ensureSshHostsBackfill(db)
  const hosts = listSshHosts(db)
  assert.equal(hosts.length, 1)
  assert.equal(hosts[0]?.host, "dev.internal")
  assert.equal(hosts[0]?.workspaceCount, 2)
})

test("upsert 按 endpoint 去重；仍有项目时 remove 抛 HOST_IN_USE", () => {
  const db = memoryDb()
  const first = upsertSshHost({ alias: "dev", host: "dev.internal", user: "alice", auth: "agent", port: 22 }, db)
  const second = upsertSshHost({ alias: "devbox", host: "dev.internal", user: "alice", auth: "agent", port: 22 }, db)
  assert.equal(first.id, second.id)
  assert.equal(second.alias, "devbox")
  insertSshWorkspace(db, "ws_a", "/home/alice/a")
  db.prepare("UPDATE workspaces SET ssh_host_id = ? WHERE id = ?").run(first.id, "ws_a")
  assert.throws(() => removeSshHost(first.id, db), (error: Error) => error.message.includes("HOST_IN_USE"))
  db.prepare("DELETE FROM workspaces WHERE id = ?").run("ws_a")
  assert.deepEqual(removeSshHost(first.id, db), { id: first.id })
  assert.equal(listSshHosts(db).length, 0)
})
