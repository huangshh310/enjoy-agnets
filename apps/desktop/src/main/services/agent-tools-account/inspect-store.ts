/**
 * inspect 结果：内存 5 分钟 + 磁盘一份。
 * 未过期立刻返回；过期也先返回旧值，后台再刷新。对标 OpenUsage 五分钟快照。
 */
import { app } from "electron"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"

export const INSPECT_CACHE_MS = 5 * 60 * 1000

type CacheEntry = { at: number; value: InspectAgentToolResult }

const memory = new Map<AgentToolId, CacheEntry>()
let diskLoaded = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

function diskPath() {
  return join(app.getPath("userData"), "inspect-quota-cache.json")
}

function loadDisk() {
  if (diskLoaded) return
  diskLoaded = true
  try {
    const raw = JSON.parse(readFileSync(diskPath(), "utf8")) as Record<string, CacheEntry>
    for (const [id, entry] of Object.entries(raw)) {
      if (entry?.value && typeof entry.at === "number") memory.set(id as AgentToolId, entry)
    }
  } catch {
    /* 没有缓存文件或坏掉就当冷启动 */
  }
}

function saveDisk() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      const raw: Record<string, CacheEntry> = {}
      for (const [id, entry] of memory) raw[id] = entry
      writeFileSync(diskPath(), JSON.stringify(raw))
    } catch {
      /* 写失败不影响本次 inspect */
    }
  }, 400)
}

export function readInspectCache(id: AgentToolId): CacheEntry | undefined {
  loadDisk()
  return memory.get(id)
}

export function writeInspectCache(id: AgentToolId, value: InspectAgentToolResult) {
  memory.set(id, { at: Date.now(), value })
  saveDisk()
}

export function isInspectFresh(entry: CacheEntry | undefined): boolean {
  return Boolean(entry && Date.now() - entry.at < INSPECT_CACHE_MS)
}

export function invalidateInspectCache(id?: AgentToolId) {
  if (id) memory.delete(id)
  else memory.clear()
  saveDisk()
}
