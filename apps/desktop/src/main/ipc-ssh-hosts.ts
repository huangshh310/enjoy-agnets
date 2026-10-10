/**
 * SSH 主机名册 IPC：list / upsert / remove / discover / probe。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { ipcMain, shell } from "electron"
import { pathIsInsideRoot } from "@enjoy-agents/db"
import {
  OpenSshConfigInput,
  SshBrowseInput,
  SshHostRemoveInput,
  SshHostUpsertInput,
  SshProbeInput
} from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./services/database"
import { isGitScmHost, readSshConfigCandidates } from "./services/ssh/ssh-config.ts"
import { listWslDistros } from "./services/ssh/wsl-distros.ts"
import { getSshHost, listSshHosts, removeSshHost, upsertSshHost } from "./services/ssh/ssh-hosts.ts"
import { browseSsh } from "./services/ssh/ssh-browse.ts"
import { probeSsh } from "./services/ssh/ssh-probe.ts"
import { deleteSshPassword, getSshPassword, setSshPassword } from "./services/ssh/ssh-password-vault.ts"
import { guardPasswordWrite, runSecretWrite } from "./services/secret-write-guard.ts"
import type { SshConnSpec } from "./services/ssh/ssh.types.ts"

export const SSH_HOST_CHANNELS = [
  "workspace.sshHosts.list",
  "workspace.sshHosts.upsert",
  "workspace.sshHosts.remove",
  "workspace.sshHosts.discover",
  "workspace.sshProbe",
  "workspace.sshBrowse",
  "workspace.openSshConfig"
] as const

export function registerSshHostIpc() {
  ipcMain.handle("workspace.sshHosts.list", () => listSshHosts(getDatabase()))
  ipcMain.handle("workspace.sshHosts.upsert", (_event, raw) => {
    const input = SshHostUpsertInput.parse(raw)
    const blocked = guardPasswordWrite(input.password)
    if (blocked) return blocked
    return runSecretWrite(() => {
      const host = upsertSshHost(input, getDatabase())
      if (input.password) setSshPassword(host.id, input.password)
      return host
    })
  })
  ipcMain.handle("workspace.sshHosts.remove", (_event, raw) => {
    const id = SshHostRemoveInput.parse(raw).id
    const removed = removeSshHost(id, getDatabase())
    deleteSshPassword(id)
    return removed
  })
  ipcMain.handle("workspace.sshHosts.discover", async () => discoverUnsaved())
  ipcMain.handle("workspace.sshProbe", async (_event, raw) => probeFromInput(SshProbeInput.parse(raw)))
  ipcMain.handle("workspace.sshBrowse", async (_event, raw) => {
    const input = SshBrowseInput.parse(raw)
    return browseSsh(await specFromProbe(input), input.path)
  })
  ipcMain.handle("workspace.openSshConfig", async (_event, raw) => {
    return openSshConfigFile(OpenSshConfigInput.parse(raw ?? {}).path)
  })
}

export async function openSshConfigFile(customPath?: string): Promise<{ ok: boolean; path: string; error?: string }> {
  try {
    const sshDir = resolve(homedir(), ".ssh")
    let targetPath = customPath?.trim()
    if (!targetPath) {
      targetPath = join(sshDir, "config")
      if (!existsSync(sshDir)) {
        mkdirSync(sshDir, { recursive: true, mode: 0o700 })
      }
      if (!existsSync(targetPath)) {
        writeFileSync(
          targetPath,
          "# SSH Config File\n# Host devbox\n#   HostName 192.168.1.100\n#   User ubuntu\n#   Port 22\n",
          { mode: 0o600 }
        )
      }
    } else {
      if (targetPath.startsWith("~/")) {
        targetPath = join(homedir(), targetPath.slice(2))
      }
      targetPath = resolve(targetPath)
      if (!pathIsInsideRoot(sshDir, targetPath)) {
        return { ok: false, path: targetPath, error: "Access denied: SSH config must reside within ~/.ssh" }
      }
    }

    if (!existsSync(targetPath)) {
      return { ok: false, path: targetPath, error: `File not found: ${targetPath}` }
    }

    const errorMsg = await shell.openPath(targetPath)
    if (errorMsg) {
      shell.showItemInFolder(targetPath)
    }
    return { ok: true, path: targetPath }
  } catch (err) {
    return { ok: false, path: customPath || "", error: err instanceof Error ? err.message : String(err) }
  }
}

async function discoverUnsaved() {
  const saved = listSshHosts(getDatabase())
  const taken = new Set(saved.map((host) => endpointKey(host.user, host.host, host.port)))
  const found = await readSshConfigCandidates()
  const sshHosts = found.filter((item) => {
    if (isGitScmHost(item.host) || isGitScmHost(item.alias)) return false
    if (!item.user) return true
    return !taken.has(endpointKey(item.user, item.host, item.port ?? 22))
  })
  const wslHosts = listWslDistros().flatMap((distro) => {
    if (taken.has(endpointKey("wsl", distro, 22))) return []
    return [
      {
        alias: `WSL · ${distro}`,
        host: distro,
        user: "wsl",
        port: 22,
        source: "wsl" as const
      }
    ]
  })
  return [...wslHosts, ...sshHosts]
}

async function probeFromInput(input: SshProbeInput) {
  return probeSsh(await specFromProbe(input))
}

async function specFromProbe(input: SshProbeInput): Promise<Omit<SshConnSpec, "remotePath">> {
  if (input.hostId) {
    const host = getSshHost(input.hostId, getDatabase())
    return attachPassword(
      {
        host: host.host,
        user: host.user,
        port: host.port,
        auth: host.auth,
        keyPath: host.keyPath,
        transport: host.source === "wsl" ? "wsl" : "ssh"
      },
      input.password,
      host.id
    )
  }
  const auth = input.auth ?? (input.keyPath ? "keypath" : input.password ? "password" : "agent")
  return attachPassword(
    {
      host: input.host!.trim(),
      user: input.user!.trim(),
      port: input.port ?? 22,
      auth,
      keyPath: input.keyPath,
      transport: input.source === "wsl" ? "wsl" : "ssh"
    },
    input.password
  )
}

function attachPassword(
  spec: Omit<SshConnSpec, "remotePath">,
  explicit?: string,
  hostId?: string
): Omit<SshConnSpec, "remotePath"> {
  const typed = explicit?.trim()
  if (typed && spec.auth !== "keypath") return { ...spec, auth: "password", password: typed }
  if (spec.auth !== "password") return spec
  return { ...spec, password: typed || getSshPassword(hostId) }
}

function endpointKey(user: string, host: string, port: number): string {
  return `${user}@${host}:${port}`
}
