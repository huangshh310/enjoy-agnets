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
import { catalogFor, loginBinaryFor, lookupOnPath, spawnPathCommand } from "@enjoy-agents/agent-harness"
import { isBehindLatest } from "@enjoy-agents/ipc-contract/cli-compat"
import { agentToolsCwd } from "./agent-tools-account/cwd"
import { inspectAgentTool, invalidateAccountCache } from "./agent-tools-account/inspect"
import { invalidateLatestCache } from "./agent-tools-latest"
import { assertSafeAgentCommand, safeCustomBinaryPath } from "./agent-tools-guard"
import { spawnOmpLogin } from "./agent-tools-account/spawn-omp-login"
import { resolveLoginArgv } from "./agent-tools-login-args"
import { listAgentTools } from "./agent-tools-service"
import { emitInstallProgress } from "./agent-tools-install-progress"
import { sanitizeInstallLog } from "./agent-tools-install-log"

const INSTALL_MS = 240_000
const OUT_CAP = 64 * 1024
const INSTALL_MANAGERS = new Set(["npm", "brew"])

export async function installAgentTool(id: AgentToolId): Promise<InstallAgentToolResult> {
  emitInstallProgress({ id, step: "start" })
  try {
    return await installAgentToolBody(id)
  } finally {
    emitInstallProgress({ id, step: "done" })
  }
}

async function installAgentToolBody(id: AgentToolId): Promise<InstallAgentToolResult> {
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
  const listedBefore = await listAgentTools()
  const alreadyReady = listedBefore.find((item) => item.id === id)?.status === "ready"
  if (alreadyReady) {
    const self = await trySelfUpdate(id, listedBefore.find((item) => item.id === id)?.detectedPath)
    if (self) return self
  }
  let lastCommand = catalog.installCommand
  let lastMessage = ""
  let ranAny = false
  for (const step of catalog.steps) {
    const manager = await lookupOnPath(step.manager)
    if (!manager || !isInstallManager(manager)) continue
    ranAny = true
    const args = argsForStep(step.manager, step.args, alreadyReady)
    lastCommand = displayCommand(step.manager, args)
    emitInstallProgress({ id, step: step.manager === "brew" ? "brew" : "npm", detail: lastCommand })
    const ran = await runCommand(manager, args, INSTALL_MS, (line) => {
      const detail = sanitizeInstallLog(line)
      if (detail) emitInstallProgress({ id, step: "log", detail })
    })
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
  if (ranAny) {
    invalidateLatestCache(id)
    invalidateAccountCache(id)
    if (alreadyReady) {
      emitInstallProgress({ id, step: "verify" })
      const after = await inspectAgentTool(id, true)
      const current = after.version ?? after.authAccount?.cliVersion
      if (isBehindLatest(current, after.latestVersion)) {
        return {
          id,
          ok: false,
          message: `UPDATE_VERSION_UNCHANGED: still ${current ?? "unknown"}; ran ${lastCommand}`,
          command: lastCommand,
          path: found?.detectedPath ?? null
        }
      }
    }
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
    message: "browser_opened"
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

async function trySelfUpdate(
  id: AgentToolId,
  detectedPath: string | null | undefined
): Promise<InstallAgentToolResult | null> {
  const args = catalogFor(id)?.selfUpdateArgs
  if (!args?.length || !detectedPath?.trim()) return null
  try {
    assertSafeAgentCommand(id, detectedPath)
  } catch {
    return null
  }
  emitInstallProgress({ id, step: "self_update" })
  const ran = await runCommand(detectedPath, [...args], INSTALL_MS, (line) => {
    const detail = sanitizeInstallLog(line)
    if (detail) emitInstallProgress({ id, step: "log", detail })
  })
  if (!ran.ok) return null
  invalidateLatestCache(id)
  invalidateAccountCache(id)
  const after = await inspectAgentTool(id, true)
  const current = after.version ?? after.authAccount?.cliVersion
  if (isBehindLatest(current, after.latestVersion)) return null
  return {
    id,
    ok: true,
    message: ran.message || "Updated.",
    command: displayCommand(basename(detectedPath), args),
    path: detectedPath
  }
}

function argsForStep(manager: string, args: readonly string[], updating: boolean): string[] {
  if (!updating) return [...args]
  if (manager === "brew") return ["upgrade", ...args.filter((part) => part !== "install")]
  if (manager === "npm") {
    const pkg = args.filter((part) => !part.startsWith("-") && part !== "install").at(-1)
    if (!pkg) return [...args]
    const bare = pkg.replace(/@latest$/, "")
    return ["install", "-g", `${bare}@latest`]
  }
  return [...args]
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
  timeoutMs: number,
  onLog?: (line: string) => void
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const child = spawnPathCommand(command, args, {
      env: { ...process.env, CI: "1" }
    })
    let out = ""
    let pending = ""
    let settled = false
    const take = (chunk: Buffer | string) => {
      const text = String(chunk)
      if (out.length < OUT_CAP) {
        out += text
        if (out.length > OUT_CAP) out = out.slice(0, OUT_CAP)
      }
      pending += text
      const parts = pending.split(/\r?\n/)
      pending = parts.pop() ?? ""
      for (const line of parts) onLog?.(line)
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
    child.on("close", (code) => {
      if (pending.trim()) onLog?.(pending)
      finish(code === 0, code === 0 ? "Done." : `Exit ${code ?? "null"}.`)
    })
  })
}
