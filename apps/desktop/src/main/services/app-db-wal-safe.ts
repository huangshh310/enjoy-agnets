/**
 * soft-stop / SIGKILL 后 app.db 常留 WAL；门禁与 e2e 改库前先 checkpoint（失败则拷贝合并）。
 * 只给 e2e / 门禁脚本用，不碰产品主路径 restore/persist。
 */
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

/** 打开 userData/app.db：WAL checkpoint 后再交给调用方改写。 */
export function openAppDbWalSafe(dbPath: string): DatabaseSync {
  try {
    return checkpointOpen(dbPath)
  } catch (directError) {
    return openViaCopyMerge(dbPath, directError)
  }
}

/** 对 `$userData/app.db` 做一次安全改写；库不存在则静默跳过。 */
export function mutateAppDbWalSafe(userData: string, fn: (db: DatabaseSync) => void): void {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return
  const db = openAppDbWalSafe(dbPath)
  try {
    fn(db)
  } finally {
    db.close()
  }
}

/** 不可回挂：抹掉 waiting_review 检查点（soft-stop 后先 WAL 安全开库）。 */
export function wipeWaitingReviewCheckpoint(userData: string): void {
  mutateAppDbWalSafe(userData, (db) => {
    db.exec("UPDATE runs SET checkpoint = NULL WHERE status = 'waiting_review'")
  })
}

function checkpointOpen(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath)
  try {
    db.exec("PRAGMA busy_timeout = 5000;")
    db.exec("PRAGMA journal_mode = WAL;")
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);")
  } catch (error) {
    db.close()
    throw error
  }
  return db
}

/**
 * 直接 open/checkpoint 失败时：拷贝 db+wal（不拷 -shm）到临时目录，合并后再写回主库。
 * 避开 soft-stop 残留 -shm 锁或热 WAL 导致的 `file is not a database`。
 */
function openViaCopyMerge(dbPath: string, cause: unknown): DatabaseSync {
  const dir = mkdtempSync(join(tmpdir(), "enjoy-wal-merge-"))
  try {
    const name = basename(dbPath)
    const copyPath = join(dir, name)
    copyFileSync(dbPath, copyPath)
    const wal = `${dbPath}-wal`
    if (existsSync(wal)) copyFileSync(wal, `${copyPath}-wal`)
    const copied = checkpointOpen(copyPath)
    copied.close()
    copyFileSync(copyPath, dbPath)
    for (const side of [`${dbPath}-wal`, `${dbPath}-shm`]) {
      if (existsSync(side)) rmSync(side)
    }
    return checkpointOpen(dbPath)
  } catch (error) {
    const direct = cause instanceof Error ? cause.message : String(cause)
    const merge = error instanceof Error ? error.message : String(error)
    throw new Error(`openAppDbWalSafe failed (${direct}); copy-merge: ${merge}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
