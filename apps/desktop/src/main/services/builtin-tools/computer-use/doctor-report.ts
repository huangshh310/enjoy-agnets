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

/**
 * 与设置页中文阻断句同一套。不写编译器、路径或签名身份。
 * Wayland / Windows / X11 用平台提示，不说成缺系统权限。
 */
export function formatDoctorLine(report: Record<string, unknown>): string {
  if (report.code === "doctor_unavailable") return "还不能确认能不能点击。请再检测一次权限。"
  if (report.code === "executor_missing") return "还不能点击。本机还没有桌面执行器。"
  if (report.code === "no_display" || report.session === "none") return "当前没有图形会话，桌面动作不可用。"
  if (report.code === "executor_unsigned" || report.code === "executor_identity_mismatch") {
    return "还不能点击。请安装带签名的版本后再试。"
  }
  if (report.session === "wayland") return "Wayland 尚未标为可用，须等真机 GUI 冒烟。没有后台点击。"
  if (report.session === "windows" || report.session === "x11") return "这个桌面会话尚未标为可用，须等真机 GUI 冒烟。"
  if (helperNeedsAccessibility(report) || report.screenCapture === false) {
    return "还不能点击。请打开下面仍是未授权的那一项。"
  }
  if (report.backgroundClick === true || report.success === true) return "可以点击。"
  return typeof report.message === "string" ? report.message : "还不能点击。请打开下面仍是未授权的那一项。"
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
    if (platform === "darwin" && rpc.trusted !== true) {
      return { ...deniedHelper(base, checked), inputMonitoring: rpc.inputMonitoring === true }
    }
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
