/**
 * Computer Use helper 身份：路径 + darwin codesign。
 * 医生绿必须验即将 spawn 的那份二进制，不能只信 Electron 宿主 AX。
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

export const CODESIGN_IDENTITY_ENV = ["CU_CODESIGN_IDENTITY", "CSC_NAME", "APPLE_CODESIGN_IDENTITY"] as const

export const HELPER_UNSIGNED = "executor_unsigned"
export const HELPER_MISMATCH = "executor_identity_mismatch"

export type CodesignInfo = {
  path: string
  exists: boolean
  signed: boolean
  adhoc: boolean
  identity: string | null
  teamId: string | null
}

export type HelperSidecar = {
  signed: boolean
  identity: string | null
  source?: string | null
  reason?: string | null
}

export type ExecutorIdentity = {
  ready: boolean
  code?: "executor_missing" | "executor_unsigned" | "executor_identity_mismatch"
  helperPath: string | null
  helperSigned: boolean
  helperIdentity: string | null
  helperMatchesSpawn: boolean
  teamId: string | null
}

/** `codesign -dv` 写在 stderr。无 Authority / ad-hoc / 未签名都不当作可发布身份。 */
export function parseCodesignDump(text: string): Omit<CodesignInfo, "path" | "exists"> {
  const raw = text.trim()
  if (!raw || /not signed/i.test(raw)) {
    return { signed: false, adhoc: false, identity: null, teamId: null }
  }
  const adhoc = /signature\s*=\s*adhoc/i.test(raw)
  const teamRaw = raw.match(/^TeamIdentifier=(.+)$/m)?.[1]?.trim() ?? ""
  const teamId = !teamRaw || teamRaw.toLowerCase() === "not set" ? null : teamRaw
  if (adhoc) return { signed: false, adhoc: true, identity: null, teamId: null }
  const identity = [...raw.matchAll(/^Authority=(.+)$/gm)].map((row) => row[1]?.trim() ?? "")[0] || null
  if (!identity) return { signed: false, adhoc: false, identity: null, teamId }
  return { signed: true, adhoc: false, identity, teamId }
}

export function inspectDarwinCodesign(
  filePath: string,
  dump: (target: string) => string = dumpCodesign
): CodesignInfo {
  if (!fs.existsSync(filePath)) {
    return { path: filePath, exists: false, signed: false, adhoc: false, identity: null, teamId: null }
  }
  try {
    return { path: filePath, exists: true, ...parseCodesignDump(dump(filePath)) }
  } catch {
    return { path: filePath, exists: true, signed: false, adhoc: false, identity: null, teamId: null }
  }
}

export function helperSidecarPath(binaryPath: string): string {
  return path.join(path.dirname(binaryPath), "computer-use.identity.json")
}

export function readHelperSidecar(binaryPath: string): HelperSidecar | null {
  const file = helperSidecarPath(binaryPath)
  if (!fs.existsSync(file)) return null
  try {
    const row = JSON.parse(fs.readFileSync(file, "utf8")) as HelperSidecar
    return {
      signed: row.signed === true,
      identity: typeof row.identity === "string" && row.identity.trim() ? row.identity.trim() : null,
      source: typeof row.source === "string" ? row.source : null,
      reason: typeof row.reason === "string" ? row.reason : null
    }
  } catch {
    return null
  }
}

export function resolveExpectedIdentity(
  env: NodeJS.ProcessEnv = process.env,
  sidecar?: HelperSidecar | null
): string | null {
  for (const key of CODESIGN_IDENTITY_ENV) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return sidecar?.identity ?? null
}

export function identityMatches(
  expected: string | null | undefined,
  info: Pick<CodesignInfo, "identity" | "teamId">
): boolean {
  const want = expected?.trim()
  if (!want) return true
  const have = info.identity?.trim() ?? ""
  const team = info.teamId?.trim() ?? ""
  const a = want.toLowerCase()
  const b = have.toLowerCase()
  const t = team.toLowerCase()
  if (b && (b === a || b.includes(a) || a.includes(b))) return true
  return Boolean(t && (t === a || a.includes(t)))
}

export function sameResolvedPath(left: string, right: string): boolean {
  const a = realOrResolve(left)
  const b = realOrResolve(right)
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b
}

/** darwin 必须团队签名且路径一致；Win/Linux 不在 §3.2c 做签名门。 */
export function evaluateHelperIdentity(input: {
  platform: string
  spawnPath: string | null
  livePath?: string | null
  rpcPath?: string | null
  codesign?: CodesignInfo | null
  sidecar?: HelperSidecar | null
  expectedIdentity?: string | null
}): ExecutorIdentity {
  const helperPath = input.spawnPath
  if (!helperPath) return identityResult(false, "executor_missing", null)
  if (input.platform !== "darwin") {
    return identityResult(true, undefined, helperPath, { helperSigned: true, helperMatchesSpawn: true })
  }
  return evaluateDarwinIdentity(helperPath, input)
}

function evaluateDarwinIdentity(
  helperPath: string,
  input: {
    livePath?: string | null
    rpcPath?: string | null
    codesign?: CodesignInfo | null
    sidecar?: HelperSidecar | null
    expectedIdentity?: string | null
  }
): ExecutorIdentity {
  const codesign = input.codesign ?? inspectDarwinCodesign(helperPath)
  const matches = pathsAgree(helperPath, input.livePath) && pathsAgree(helperPath, input.rpcPath)
  if (!codesign.exists) return identityResult(false, "executor_missing", helperPath, { helperMatchesSpawn: matches })
  if (!matches) {
    return identityResult(false, HELPER_MISMATCH, helperPath, {
      helperSigned: codesign.signed,
      helperIdentity: codesign.identity,
      helperMatchesSpawn: false,
      teamId: codesign.teamId
    })
  }
  if (!codesign.signed) return unsignedResult(helperPath, codesign)
  if (input.sidecar?.signed === true && !identityMatches(input.sidecar.identity, codesign)) {
    return mismatchResult(helperPath, codesign)
  }
  if (!identityMatches(input.expectedIdentity, codesign)) return mismatchResult(helperPath, codesign)
  return identityResult(true, undefined, helperPath, {
    helperSigned: true,
    helperIdentity: codesign.identity,
    helperMatchesSpawn: true,
    teamId: codesign.teamId
  })
}

function unsignedResult(helperPath: string, codesign: CodesignInfo): ExecutorIdentity {
  return identityResult(false, HELPER_UNSIGNED, helperPath, {
    helperSigned: false,
    helperIdentity: codesign.identity,
    helperMatchesSpawn: true,
    teamId: codesign.teamId
  })
}

function mismatchResult(helperPath: string, codesign: CodesignInfo): ExecutorIdentity {
  return identityResult(false, HELPER_MISMATCH, helperPath, {
    helperSigned: codesign.signed,
    helperIdentity: codesign.identity,
    helperMatchesSpawn: true,
    teamId: codesign.teamId
  })
}

function identityResult(
  ready: boolean,
  code: ExecutorIdentity["code"],
  helperPath: string | null,
  extra: Partial<ExecutorIdentity> = {}
): ExecutorIdentity {
  return {
    ready,
    code,
    helperPath,
    helperSigned: extra.helperSigned ?? false,
    helperIdentity: extra.helperIdentity ?? null,
    helperMatchesSpawn: extra.helperMatchesSpawn ?? Boolean(helperPath),
    teamId: extra.teamId ?? null
  }
}

function pathsAgree(spawn: string, other?: string | null): boolean {
  return !other || sameResolvedPath(spawn, other)
}

function realOrResolve(file: string): string {
  try {
    return fs.realpathSync(file)
  } catch {
    return path.normalize(path.resolve(file))
  }
}

function dumpCodesign(filePath: string): string {
  const result = spawnSync("codesign", ["-dv", "--verbose=4", filePath], {
    encoding: "utf8",
    windowsHide: true
  })
  return `${result.stderr ?? ""}\n${result.stdout ?? ""}`
}
