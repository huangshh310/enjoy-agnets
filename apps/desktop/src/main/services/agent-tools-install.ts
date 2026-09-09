/**
 * 白名单安装 / 登录：只 spawn npm、brew 或已探测到的 CLI，不跑 curl|bash。
 */
import { spawn } from "node:child_process"
import { basename } from "node:path"
import type {
  AgentToolId,
  InstallAgentToolResult,
  LoginAgentToolResult,
  UninstallAgentToolResult
} from "@enjoy-agents/ipc-contract"
import { catalogFor, loginBinaryFor, lookupOnPath } from "@enjoy-agents/agent-harness"
import { agentToolsCwd } from "./agent-tools-account/cwd"
import { invalidateAccountCache } from "./agent-tools-account/inspect"
import { assertSafeAgentCommand, safeCustomBinaryPath } from "./agent-tools-guard"
import { spawnOmpLogin } from "./agent-tools-account/spawn-omp-login"
import { resolveLoginArgv } from "./agent-tools-login-args"
import { listAgentTools } from "./agent-tools-service"

const INSTALL_MS = 240_000
const OUT_CAP = 64 * 1024
const INSTALL_MANAGERS = new Set(["npm", "brew"])

export async function installAgentTool(id: AgentToolId): Promise<InstallAgentToolResult> {
  const catalog = catalogFor(id)
  if (!catalog) {
    return { id, ok: false, message: "This tool has no installer.", command: "", path: null }
  }
  if (catalog.steps.length === 0) {
    return {
      id,
      ok: false,
      message: "Copy the official install command. Enjoy will not pipe curl to bash.",
      command: catalog.installCommand,
      path: null
    }
  }
  let lastCommand = catalog.installCommand
  let lastMessage = ""
  let ranAny = false
  for (const step of catalog.steps) {
    const manager = await lookupOnPath(step.manager)
    if (!manager || !isInstallManager(manager)) continue
    ranAny = true
    lastCommand = displayCommand(step.manager, step.args)
    const ran = await runCommand(manager, [...step.args], INSTALL_MS)
    lastMessage = ran.message
    if (!ran.ok) {
      return {
        id,
        ok: false,
        message: ran.message,
        command: lastCommand,
        path: null
      }
    }
  }
  const listed = await listAgentTools()
  const found = listed.find((item) => item.id === id)
  if (ranAny || found?.status === "ready") {
    return {
      id,
      ok: true,
      message: lastMessage || found?.detectedPath || "Installed.",
      command: lastCommand,
      path: found?.detectedPath ?? null
    }
  }
  return {
    id,
    ok: false,
    message: `Need ${catalog.steps.map((item) => item.manager).join(" or ")} on PATH, or run: ${catalog.installCommand}`,
    command: catalog.installCommand,
    path: null
  }
}
export async function uninstallAgentTool(id: AgentToolId): Promise<UninstallAgentToolResult> {
  const catalog = catalogFor(id)
  const step = catalog?.steps.find((item) => item.uninstallArgs?.length)
  if (!step?.uninstallArgs?.length) {
    return { id, ok: false, message: "This tool has no uninstall recipe. Remove the binary yourself." }
  }
  const manager = await lookupOnPath(step.manager)
  if (!manager || !isInstallManager(manager)) {
    return { id, ok: false, message: `Need ${step.manager} on PATH to uninstall.` }
  }
  const ran = await runCommand(manager, [...step.uninstallArgs], INSTALL_MS)
  return {
    id,
    ok: ran.ok,
    message: ran.ok ? `Uninstalled ${step.uninstallArgs.at(-1) ?? id}.` : ran.message
  }
}


/** 后台拉起官方 login，立即返回；不假装打开了终端。OMP 必须带 provider。 */
export async function loginAgentTool(id: AgentToolId, provider?: string): Promise<LoginAgentToolResult> {
  const listed = await listAgentTools()
  const tool = listed.find((item) => item.id === id)
  const loginName = loginBinaryFor(id)
  const loginPath = loginName ? await lookupOnPath(loginName) : undefined
  const command = loginName
    ? (loginPath && safeCustomBinaryPath(id, loginPath)) || undefined
    : safeCustomBinaryPath(id, tool?.binaryPath) || tool?.detectedPath
  const argv = resolveLoginArgv(id, provider, catalogFor(id)?.loginArgs ?? [])
  if (!argv.ok) {
    return { id, ok: false, message: tool?.needsLoginHint || argv.message }
  }
  if (!command) {
    return { id, ok: false, message: loginName ? `Install ${loginName} first.` : "Install the CLI first." }
  }
  try {
    assertSafeAgentCommand(id, command)
  } catch (error) {
    return { id, ok: false, message: error instanceof Error ? error.message : String(error) }
  }
  if (id === "omp") {
    return loginOmpTool(id, command, argv.args, await agentToolsCwd())
  }
  try {
    const child = spawn(command, argv.args, {
      cwd: await agentToolsCwd(),
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsHide: false
    })
    child.unref()
  } catch (error) {
    return { id, ok: false, message: error instanceof Error ? error.message : String(error) }
  }
  invalidateAccountCache(id)
  return {
    id,
    ok: true,
    message: "Login started. Finish authorization in the browser or CLI window."
  }
}

/** 授权页打开就先回执（设备码要马上给 UI）；凭证写入后再清 inspect 缓存。 */
function loginOmpTool(
  id: AgentToolId,
  command: string,
  args: string[],
  cwd: string
): Promise<LoginAgentToolResult> {
  return new Promise((resolve) => {
    let sent = false
    const send = (result: { ok: boolean; message: string }) => {
      if (sent) return
      sent = true
      resolve({ id, ok: result.ok, message: result.message })
    }
    void spawnOmpLogin(command, args, cwd, { onOpened: send }).then((final) => {
      invalidateAccountCache(id)
      send(final)
    })
  })
}

function isInstallManager(command: string): boolean {
  const name = basename(command).replace(/\.(exe|cmd|bat)$/i, "")
  return INSTALL_MANAGERS.has(name)
}

function displayCommand(manager: string, args: readonly string[]): string {
  return [manager, ...args].join(" ")
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, windowsHide: true })
    let out = ""
    let settled = false
    const take = (chunk: Buffer | string) => {
      if (out.length >= OUT_CAP) return
      out += String(chunk)
      if (out.length > OUT_CAP) out = out.slice(0, OUT_CAP)
    }
    const finish = (ok: boolean, fallback: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const line = out.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).at(-1)
      resolve({ ok, message: line || fallback })
    }
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      const force = setTimeout(() => child.kill("SIGKILL"), 2000)
      force.unref?.()
      finish(false, "Timed out.")
    }, timeoutMs)
    child.stdout?.on("data", take)
    child.stderr?.on("data", take)
    child.on("error", (error) => finish(false, error.message))
    child.on("close", (code) => finish(code === 0, code === 0 ? "Done." : `Exit ${code ?? "null"}.`))
  })
}
