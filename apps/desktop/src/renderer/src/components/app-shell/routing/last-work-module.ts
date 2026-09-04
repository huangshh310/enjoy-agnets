/**
 * Escape 从 Settings / Inbox 回到进入前的工作模块。
 */
import { WORK_MODULE_IDS, type WorkModuleId } from "../app-shell.types.ts"
import { LAST_WORK_MODULE_KEY } from "../constants.ts"
import { isWorkModule } from "./match-module.ts"

type StorageLike = Pick<Storage, "getItem" | "setItem">

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    }
  }
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage
  try {
    if (typeof localStorage !== "undefined") return localStorage
  } catch {
    // 无 window 时走内存
  }
  return memoryStorage()
}

export function readLastWorkModule(storage?: StorageLike): WorkModuleId {
  const raw = resolveStorage(storage).getItem(LAST_WORK_MODULE_KEY)
  if (raw && (WORK_MODULE_IDS as readonly string[]).includes(raw)) return raw as WorkModuleId
  return "chat"
}

export function writeLastWorkModule(id: WorkModuleId, storage?: StorageLike): void {
  if (!isWorkModule(id)) return
  resolveStorage(storage).setItem(LAST_WORK_MODULE_KEY, id)
}
