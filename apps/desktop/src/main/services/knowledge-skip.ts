/**
 * 增量索引纯函数：hash 与「未变则跳过」。不碰 SQLite。
 */
import { createHash } from "node:crypto"

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

export function skipIfUnchanged(
  existing: { path: string; hash: string; status: string } | undefined,
  hash: string
): boolean {
  return Boolean(existing && existing.hash === hash && existing.status === "ready")
}
