/**
 * 写密钥 IPC 回包：成功 `{ ok:true, ... }`，失败 `{ ok:false, code }`。
 * 不要 throw 原文（渲染进程会卡在对话框）。禁止明文回落。
 */
import { z } from "zod"

/**
 * 写密钥失败码。新码只往这个 enum 加。
 * Electron 39 `safeStorage` 分不开「没装」和「锁了」，**不加** `KEYCHAIN_LOCKED`。
 */
export const SecretWriteErrorCode = z.enum(["KEYCHAIN_UNAVAILABLE"])
export type SecretWriteErrorCode = z.infer<typeof SecretWriteErrorCode>

/** 本包 `types: []`，不能 `new URL`。只认 https、拒 userinfo。 */
function isHttpsRevokeUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false
  const host = value.slice("https://".length).split(/[/?#]/, 1)[0] ?? ""
  return host.length > 0 && !host.includes("@") && !host.includes(" ")
}

const HttpsRevokeUrl = z.string().refine(isHttpsRevokeUrl)

export const SecretWriteBlocked = z
  .object({
    ok: z.literal(false),
    code: SecretWriteErrorCode,
    revokeUrl: HttpsRevokeUrl.optional(),
    providerLabel: z.string().min(1).optional()
  })
  .strict()
export type SecretWriteBlocked = z.infer<typeof SecretWriteBlocked>
export type SecretWriteRevokeHint = Pick<SecretWriteBlocked, "revokeUrl" | "providerLabel">

/** 成功基座。各通道把既有 payload 摊在旁边。 */
export const SecretWriteOk = z.object({ ok: z.literal(true) }).strict()
export type SecretWriteOk = z.infer<typeof SecretWriteOk>

export function secretWriteBlocked(
  code: SecretWriteErrorCode = "KEYCHAIN_UNAVAILABLE",
  hint?: SecretWriteRevokeHint
): SecretWriteBlocked {
  return SecretWriteBlocked.parse({
    ok: false,
    code,
    ...(hint?.revokeUrl ? { revokeUrl: hint.revokeUrl } : {}),
    ...(hint?.providerLabel ? { providerLabel: hint.providerLabel } : {})
  })
}

export function secretWriteOk<T extends Record<string, unknown>>(
  payload: T
): { ok: true } & T {
  return { ok: true, ...payload }
}

/** 解开成功回包里的既有 payload，不要把 ok 留在设置快照上。 */
export function secretWriteOkPayload<T extends Record<string, unknown>>(
  result: { ok: true } & T
): T {
  const { ok: _ok, ...payload } = result
  return payload as unknown as T
}

export function isSecretWriteBlocked(result: unknown): result is SecretWriteBlocked {
  return SecretWriteBlocked.safeParse(result).success
}

export function secretWriteBlockedCode(result: unknown): SecretWriteErrorCode | null {
  const parsed = SecretWriteBlocked.safeParse(result)
  return parsed.success ? parsed.data.code : null
}

/** 写密钥入口频道。测试与文档共用这份名单。 */
export const SECRET_WRITE_CHANNELS = [
  "settings.upsertProvider",
  "settings.saveSecret",
  "settings.setHarness",
  "settings.activateProvider",
  "settings.duplicateProvider",
  "settings.setProviderEnabled",
  "settings.setActiveModel",
  "settings.setDefaultModel",
  "settings.probeProvider",
  "agentTools.upsert",
  "agentTools.upsertCustom",
  "workspace.openSsh",
  "workspace.sshHosts.upsert"
] as const
export type SecretWriteChannel = (typeof SECRET_WRITE_CHANNELS)[number]
