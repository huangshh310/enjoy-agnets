/**
 * WSL 连接层：本机 wsl.exe -d <发行版> 跑 POSIX 命令，不要求发行版里开 sshd。
 */
import { spawn } from "node:child_process"
import { quoteRemote } from "./ssh-path.ts"
import { mapSshFailure, parseLs } from "./ssh-listing.ts"
import { resolveWslExecutable, sshClientCwd } from "./ssh-client.ts"
import type { SshConnSpec, SshConnectionLayer, SshDirEntry, SshExecResult } from "./ssh.types.ts"

export function createWslConnection(spec: SshConnSpec): Promise<SshConnectionLayer> {
  return connectWsl(spec)
}

function wslUserArgs(spec: SshConnSpec): string[] {
  const user = spec.user.trim()
  if (!user || user === "wsl" || user === spec.host) return []
  return ["-u", user]
}

function wslArgv(spec: SshConnSpec, remoteCommand: string): { command: string; args: string[] } {
  return {
    command: resolveWslExecutable(),
    args: ["-d", spec.host, ...wslUserArgs(spec), "--", "bash", "-lc", remoteCommand]
  }
}

async function connectWsl(spec: SshConnSpec): Promise<SshConnectionLayer> {
  const layer: SshConnectionLayer = {
    status: "connecting",
    ping: async () => {
      const result = await execWsl(spec, "true")
      if (result.exitCode !== 0) throw mapSshFailure(result)
      layer.status = "connected"
      return "ok"
    },
    exec: (command) => execWsl(spec, command),
    readFile: async (absPath) => {
      const result = await execWsl(spec, `cat -- ${quoteRemote(absPath)}`)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
      return result.stdout
    },
    writeFile: async (absPath, content) => {
      const result = await execWsl(spec, `cat > ${quoteRemote(absPath)}`, content)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
    },
    listDir: async (absPath) => {
      const result = await execWsl(spec, `ls -1p -- ${quoteRemote(absPath)}`)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
      return parseLs(result.stdout) as SshDirEntry[]
    },
    dispose: () => {
      layer.status = "disconnected"
    }
  }
  await layer.ping()
  return layer
}

function execWsl(spec: SshConnSpec, remoteCommand: string, stdin?: string): Promise<SshExecResult> {
  const { command, args } = wslArgv(spec, remoteCommand)
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, cwd: sshClientCwd() })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    child.on("error", reject)
    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
    if (stdin != null) child.stdin?.end(stdin)
    else child.stdin?.end()
  })
}
