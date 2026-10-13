# message_parts_quarantine：误挂附件隔离与恢复

迁移 v17 `misbackfilled-file-parts` 会把旧版「读时回填」误挂到别的会话用户消息上的 file 部件，**整行**搬进 `message_parts_quarantine`（不硬删）：

| 列 | 含义 |
| --- | --- |
| `id` / `message_id` / `idx` / `type` / `payload` / `created_at` | `message_parts` 原行，逐字段保留 |
| `reason` | 隔离原因，目前只有 `read-time-backfill-cross-session` |
| `migrated_at` | 搬走的时间（毫秒） |

隔离的是所有疑似误挂的 file 部件（不限图片）。判定条件见 `packages/db/src/migrations/misbackfilled-file-parts.ts` 文件头。

## 查看

```sql
SELECT q.id, q.message_id, m.session_id, json_extract(q.payload, '$.assetId') AS asset_id,
       json_extract(q.payload, '$.name') AS name, q.created_at, q.reason, q.migrated_at
FROM message_parts_quarantine q LEFT JOIN messages m ON m.id = q.message_id
ORDER BY q.migrated_at, q.id;
```

## 恢复

**先退出应用并备份 `app.db`**（含 `app.db-wal` / `app.db-shm`）。用 `sqlite3 app.db` 执行。只恢复某几行时把 `WHERE` 换成 `WHERE id IN ('prt_…', …)`：

```sql
BEGIN;
INSERT OR IGNORE INTO message_parts (id, message_id, idx, type, payload, created_at)
  SELECT id, message_id, idx, type, payload, created_at
  FROM message_parts_quarantine
  WHERE reason = 'read-time-backfill-cross-session'
    AND message_id IN (SELECT id FROM messages);
DELETE FROM message_parts_quarantine
  WHERE id IN (SELECT id FROM message_parts)
    AND reason = 'read-time-backfill-cross-session';
COMMIT;
```

- 消息已被删的部件不恢复（留在隔离表）。
- 恢复后迁移不会再跑（v17 已记账），不会再次隔离。
