/**
 * 真 SSH 连接层：本机 spawn ssh，stdio 回 main。测试请注入工厂，不要 mock 本文件的 host。
 */
import { spawn } from "node:child_process"
import type { SshConnSpec, SshConnectionFactory, SshConnectionLayer, SshExecResult } from "./ssh.types.ts"
import { quoteRemote } from "./ssh-path.ts"
import { mapSshFailure, parseLs } from "./ssh-listing.ts"
import { launchRemoteProcess } from "./ssh-launch.ts"
import { createWslConnection } from "./wsl-connection.ts"

export function createLiveSshConnection(spec: SshConnSpec): Promise<SshConnectionLayer> {
  if (spec.transport === "wsl") return createWslConnection(spec)
  return connectLive(spec)
}

async function connectLive(spec: SshConnSpec): Promise<SshConnectionLayer> {
  const layer: SshConnectionLayer = {
    status: "connecting",
    ping: async () => {
      const result = await execRemote(spec, "true")
      if (result.exitCode !== 0) throw mapSshFailure(result)
      layer.status = "connected"
      return "ok"
    },
    exec: (command) => execRemote(spec, command),
    readFile: async (absPath) => {
      const result = await execRemote(spec, `cat -- ${quoteRemote(absPath)}`)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
      return result.stdout
    },
    writeFile: async (absPath, content) => {
      const result = await execRemote(spec, `cat > ${quoteRemote(absPath)}`, content)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
    },
    listDir: async (absPath) => {
      const result = await execRemote(spec, `ls -1p -- ${quoteRemote(absPath)}`)
      if (result.exitCode !== 0) throw mapSshFailure(result, absPath)
      return parseLs(result.stdout)
    },
    dispose: () => {
      layer.status = "disconnected"
    }
  }
  await layer.ping()
  return layer
}

function execRemote(spec: SshConnSpec, remoteCommand: string, stdin?: string): Promise<SshExecResult> {
  const launched = launchRemoteProcess(spec, remoteCommand, false)
  return new Promise((resolve, reject) => {
    const child = spawn(launched.command, launched.args, {
      shell: false,
      windowsHide: true,
      cwd: launched.cwd,
      env: { ...process.env, ...launched.env }
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    const finish = () => launched.cleanup?.()
    child.on("error", (error) => {
      finish()
      reject(error)
    })
    child.on("close", (code) => {
      finish()
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
    if (stdin != null) child.stdin?.end(stdin)
    else child.stdin?.end()
  })
}

export const defaultSshConnectionFactory: SshConnectionFactory = createLiveSshConnection
