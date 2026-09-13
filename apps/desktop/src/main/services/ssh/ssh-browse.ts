/**
 * 浏览远端目录：开项目选已有文件夹用。无工作区 jail；路径必须是绝对 POSIX。
 */
import { posix } from "node:path"
import type { SshBrowseResult } from "@enjoy-agents/ipc-contract"
import type { SshConnSpec, SshConnectionLayer, SshDirEntry } from "./ssh.types.ts"
import { createLiveSshConnection } from "./ssh-connection.ts"

const ENTRY_CAP = 400
let browseFactory = createLiveSshConnection

export function setSshBrowseFactory(next: typeof createLiveSshConnection) {
  browseFactory = next
}

export function resetSshBrowseFactory() {
  browseFactory = createLiveSshConnection
}

export async function browseSsh(
  spec: Omit<SshConnSpec, "remotePath">,
  path?: string
): Promise<SshBrowseResult> {
  const layer = await browseFactory({ ...spec, remotePath: "." })
  try {
    const home = await readHome(layer)
    const target = normalizeBrowsePath(path, home)
    const listed = await layer.listDir(target)
    return {
      path: target,
      home,
      parent: parentOf(target),
      entries: sortEntries(listed).slice(0, ENTRY_CAP)
    }
  } finally {
    layer.dispose()
  }
}

export function normalizeBrowsePath(path: string | undefined, home: string): string {
  const raw = (path ?? "").trim() || home
  const expanded = expandHome(raw, home)
  if (!expanded.startsWith("/") || expanded.includes("\0")) {
    throw new Error("远端路径必须是绝对 POSIX 路径")
  }
  const normalized = posix.normalize(expanded)
  if (normalized.includes("\n") || normalized.length > 1024) {
    throw new Error("远端路径无效")
  }
  return normalized === "" ? "/" : normalized
}

function expandHome(raw: string, home: string): string {
  if (raw === "~") return home
  if (raw.startsWith("~/")) return posix.join(home, raw.slice(2))
  return raw
}

async function readHome(layer: SshConnectionLayer): Promise<string> {
  const result = await layer.exec('printf %s "$HOME"')
  const home = result.stdout.trim()
  if (result.exitCode !== 0 || !home.startsWith("/")) return "/"
  return posix.normalize(home)
}

function parentOf(path: string): string | null {
  if (path === "/") return null
  const parent = posix.dirname(path)
  return parent || "/"
}

function sortEntries(entries: SshDirEntry[]): SshDirEntry[] {
  return [...entries]
    .filter((item) => item.name !== "." && item.name !== "..")
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1
      return left.name.localeCompare(right.name)
    })
}
