/**
 * SSH 主机名册：一台机器多条远程工作区。私钥内容禁止入库。
 */
import type { Migration } from "./types.ts"

export const sshHostsMigration: Migration = {
  version: 9,
  name: "ssh-hosts",
  sql: `
    CREATE TABLE ssh_hosts (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL,
      host TEXT NOT NULL,
      user TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      auth TEXT NOT NULL,
      key_path TEXT,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX ssh_hosts_endpoint ON ssh_hosts (user, host, port);
    ALTER TABLE workspaces ADD COLUMN ssh_host_id TEXT;
  `
}
