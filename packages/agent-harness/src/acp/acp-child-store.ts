/**
 * ACP 子进程账本存 userData。启动 reap 用 SIGKILL（已无会话可优雅退出）。
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import {
  parseAcpChildLedger,
  removeAcpChild,
  serializeAcpChildLedger,
  shouldReapAcpChild,
  upsertAcpChild,
  type AcpChildRecord
} from "./acp-child-ledger.ts"

let ledgerFile: string | null = null
let memory: AcpChildRecord[] = []

export function configureAcpChildLedger(path: string | null): void {
  ledgerFile = path
  memory = path ? readLedger(path) : []
}

export function rememberAcpChild(row: AcpChildRecord): void {
  memory = upsertAcpChild(memory, row)
  persist()
}

export function forgetAcpChild(pid?: number | null): void {
  if (pid == null) return
  memory = removeAcpChild(memory, pid)
  persist()
}

/** 启动时杀掉上一轮 Enjoy 留下的 ACP 入口进程。comm 对不上则当 pid 复用，不杀。 */
export function reapOrphanAcpChildren(): void {
  const leftover: AcpChildRecord[] = []
  for (const row of memory) {
    if (!dropFromLedger(row)) leftover.push(row)
  }
  memory = leftover
  persist()
}

function dropFromLedger(row: AcpChildRecord): boolean {
  const exists = pidExists(row.pid)
  const comm = exists ? processComm(row.pid) : null
  if (!shouldReapAcpChild(row, { exists, comm })) return true
  killPid(row.pid)
  return !pidExists(row.pid)
}

function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function killPid(pid: number): void {
  try {
    process.kill(pid, "SIGKILL")
  } catch {
    // 已经退出
  }
}

function processComm(pid: number): string | null {
  if (process.platform === "win32") return windowsImageName(pid)
  try {
    const out = execFileSync("ps", ["-p", String(pid), "-o", "comm="], {
      encoding: "utf8",
      timeout: 1000,
      windowsHide: true
    })
    return out.trim() || null
  } catch {
    return null
  }
}

function windowsImageName(pid: number): string | null {
  try {
    const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      encoding: "utf8",
      timeout: 2000,
      windowsHide: true
    })
    const first = out.split(",")[0]?.replace(/"/g, "").trim()
    return first && first !== "INFO:" ? first : null
  } catch {
    return null
  }
}

function readLedger(path: string): AcpChildRecord[] {
  if (!existsSync(path)) return []
  try {
    return parseAcpChildLedger(readFileSync(path, "utf8"))
  } catch {
    return []
  }
}

function persist(): void {
  if (!ledgerFile) return
  try {
    writeFileSync(ledgerFile, serializeAcpChildLedger(memory), "utf8")
  } catch {
    // 账本写失败不得挡住开流
  }
}
