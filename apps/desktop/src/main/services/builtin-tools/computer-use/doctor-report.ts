/**
 * desktop_doctor 合并：即将 spawn 的 helper 身份 + 该进程自己的 AX。
 * success 仅当点击链也能过辅助功能；宿主 Electron AX 不能单独报绿。
 */
import { backgroundClickPossible, displaySession } from "./display-session.ts"
import { asRecord, failureOf } from "./desktop-session-snapshot.ts"
import type { DesktopPermissions, DesktopSessionHooks } from "./desktop-session.types.ts"
import type { ExecutorHandle } from "./executor-client.ts"
import { spawnTargetPath } from "./executor-command.ts"
import {
  evaluateHelperIdentity,
  inspectDarwinCodesign,
  readHelperSidecar,
  resolveExpectedIdentity,
  type ExecutorIdentity,
  type HelperSidecar
} from "./executor-identity.ts"

export async function doctorReport(
  ready: ExecutorHandle | null,
  perms: DesktopPermissions,
  hooks: DesktopSessionHooks = {}
): Promise<Record<string, unknown>> {
  const platform = hooks.identityPlatform ?? process.platform
  const session = displaySession()
  const identity = resolveDoctorIdentity(ready, platform, hooks)
  const base = doctorBase(session, perms, identity)
  if (!identity.ready) return { success: false, ...base, code: identity.code ?? "executor_missing" }
  if (!ready) return { success: false, ...base, code: "executor_missing" }
  return finishDoctorRpc(ready, platform, perms, identity, hooks, base)
}

/** 人话：未签名 / 错位指向 helper 与重装签名包，禁止假绿。 */
export function formatDoctorLine(report: Record<string, unknown>): string {
  if (report.code === "executor_missing") {
    return "找不到桌面执行器。开发机需要 swiftc / python3 / PowerShell；安装包应带 bin/<platform>-<arch>/computer-use。"
  }
  if (report.code === "executor_unsigned") {
    return "当前 Enjoy Computer Use helper 没有有效签名，不能当作已就绪。请重装签名安装包；开发机 swiftc / .build 未签名二进制不会报绿。"
  }
  if (report.code === "executor_identity_mismatch") {
    return "即将点击的 helper 与医生看到的路径或签名不一致。请重装签名包，不要混用 .build 与打包二进制。"
  }
  if (report.code === "no_display") return "没有图形会话（没有 DISPLAY / WAYLAND_DISPLAY）。"
  if (helperNeedsAccessibility(report)) {
    return "请为 Enjoy Computer Use helper 打开辅助功能，不要只授权给 Enjoy Agents 窗口进程。未签名开发包请重装签名安装包。"
  }
  if (report.session === "wayland") return "Wayland 没有后台点击，动作会先停在审批卡。"
  if (report.backgroundClick === true) return "后台点击可用。"
  return typeof report.message === "string" ? report.message : "桌面执行器已连接。"
}

async function finishDoctorRpc(
  ready: ExecutorHandle,
  platform: string,
  perms: DesktopPermissions,
  identity: ExecutorIdentity,
  hooks: DesktopSessionHooks,
  base: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const rpc = asRecord(await ready.request("doctor", {}))
    const checked = refineWithRpcPath(identity, platform, rpc, hooks)
    if (!checked.ready) {
      return { success: false, ...base, ...identityFields(checked), code: checked.code ?? "executor_identity_mismatch" }
    }
    if (platform === "darwin" && rpc.trusted !== true) return deniedHelper(base, checked)
    return { ...base, ...rpc, ...identityFields(checked), success: true, ...greenFlags(platform, perms, rpc) }
  } catch (error) {
    return { success: false, ...base, ...failureOf(error), backgroundClick: false }
  }
}

function resolveDoctorIdentity(
  ready: ExecutorHandle | null,
  platform: string,
  hooks: DesktopSessionHooks
): ExecutorIdentity {
  const resolved = hooks.resolveCommand?.() ?? null
  const spawnPath = resolved ? spawnTargetPath(resolved, platform) : ready?.command ?? null
  const sidecar = spawnPath ? readHelperSidecar(spawnPath) : null
  const inspect = hooks.inspectCodesign ?? inspectDarwinCodesign
  return evaluateHelperIdentity({
    platform,
    spawnPath,
    livePath: ready?.command,
    codesign: platform === "darwin" && spawnPath ? inspect(spawnPath) : null,
    sidecar,
    expectedIdentity: expectedIdentityOf(hooks, sidecar)
  })
}

function expectedIdentityOf(hooks: DesktopSessionHooks, sidecar?: HelperSidecar | null): string | null {
  return hooks.expectedIdentity !== undefined
    ? hooks.expectedIdentity
    : resolveExpectedIdentity(process.env, sidecar)
}

function refineWithRpcPath(
  identity: ExecutorIdentity,
  platform: string,
  rpc: Record<string, unknown>,
  hooks: DesktopSessionHooks
): ExecutorIdentity {
  const rpcPath = typeof rpc.executablePath === "string" ? rpc.executablePath : null
  if (!rpcPath || !identity.helperPath) return identity
  const inspect = hooks.inspectCodesign ?? inspectDarwinCodesign
  return evaluateHelperIdentity({
    platform,
    spawnPath: identity.helperPath,
    livePath: rpcPath,
    rpcPath,
    codesign: platform === "darwin" ? inspect(identity.helperPath) : null,
    sidecar: readHelperSidecar(identity.helperPath),
    expectedIdentity: expectedIdentityOf(hooks, identity.helperPath ? readHelperSidecar(identity.helperPath) : null)
  })
}

function doctorBase(
  session: ReturnType<typeof displaySession>,
  perms: DesktopPermissions,
  identity: ExecutorIdentity
): Record<string, unknown> {
  return {
    session,
    backgroundClick: false,
    accessibility: false,
    screenCapture: perms.screenCapture,
    hostAccessibility: perms.accessibility,
    ...identityFields(identity)
  }
}

function identityFields(identity: ExecutorIdentity): Record<string, unknown> {
  return {
    helperPath: identity.helperPath,
    helperSigned: identity.helperSigned,
    helperIdentity: identity.helperIdentity,
    helperMatchesSpawn: identity.helperMatchesSpawn,
    helperTeamId: identity.teamId
  }
}

function deniedHelper(base: Record<string, unknown>, identity: ExecutorIdentity): Record<string, unknown> {
  return {
    success: false,
    ...base,
    ...identityFields(identity),
    code: "permission_denied",
    trusted: false,
    accessibility: false,
    backgroundClick: false
  }
}

function greenFlags(platform: string, perms: DesktopPermissions, rpc: Record<string, unknown>) {
  const trusted = rpc.trusted === true
  if (platform === "darwin") return { accessibility: true, backgroundClick: trusted, trusted: true }
  return {
    accessibility: perms.accessibility,
    backgroundClick: typeof rpc.backgroundClick === "boolean" ? rpc.backgroundClick : backgroundClickPossible(displaySession())
  }
}

function helperNeedsAccessibility(report: Record<string, unknown>): boolean {
  if (report.code === "permission_denied" || report.trusted === false) return true
  return report.session === "macos" && report.accessibility === false
}
