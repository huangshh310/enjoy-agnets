/**
 * 工作区 SSH 位置：kind + 连接字段。私钥内容禁止入库。
 */
import type { Migration } from "./types.ts"

export const workspaceSshMigration: Migration = {
  version: 8,
  name: "workspace-ssh",
  sql: `
    ALTER TABLE workspaces ADD COLUMN kind TEXT NOT NULL DEFAULT 'local';
    ALTER TABLE workspaces ADD COLUMN ssh_host TEXT;
    ALTER TABLE workspaces ADD COLUMN ssh_user TEXT;
    ALTER TABLE workspaces ADD COLUMN ssh_port INTEGER;
    ALTER TABLE workspaces ADD COLUMN ssh_auth TEXT;
    ALTER TABLE workspaces ADD COLUMN ssh_key_path TEXT;
    ALTER TABLE workspaces ADD COLUMN remote_path TEXT;
    ALTER TABLE workspaces ADD COLUMN ssh_status TEXT;
  `
}
