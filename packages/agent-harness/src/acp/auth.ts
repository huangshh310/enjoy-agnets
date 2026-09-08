/**
 * ACP 认证握手：解析 authMethods，agent 型可自动 authenticate，
 * terminal 型变成 ACP_AUTH_REQUIRED，让 UI 去走官方 login。
 */
export const ACP_AUTH_REQUIRED = "ACP_AUTH_REQUIRED"

export type AcpAuthMethod = {
  id: string
  name?: string
  description?: string
  type?: string
}

export class AcpRpcError extends Error {
  readonly code: number | undefined
  readonly data: unknown

  constructor(message: string, code?: number, data?: unknown) {
    super(message)
    this.name = "AcpRpcError"
    this.code = code
    this.data = data
  }
}

export class AcpAuthRequiredError extends Error {
  readonly methods: AcpAuthMethod[]

  constructor(message: string, methods: AcpAuthMethod[] = []) {
    super(message)
    this.name = ACP_AUTH_REQUIRED
    this.methods = methods
  }
}

export function toAcpRpcError(error: unknown): AcpRpcError {
  const rec = asRecord(error)
  const message = String(rec.message ?? JSON.stringify(error))
  const code = typeof rec.code === "number" ? rec.code : undefined
  return new AcpRpcError(message, code, rec.data)
}

export function parseAuthMethods(result: unknown): AcpAuthMethod[] {
  const rec = asRecord(result)
  if (!Array.isArray(rec.authMethods)) return []
  const methods: AcpAuthMethod[] = []
  for (const item of rec.authMethods) {
    const row = asRecord(item)
    const id = String(row.id ?? "").trim()
    if (!id) continue
    methods.push({
      id,
      name: typeof row.name === "string" ? row.name : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
      type: typeof row.type === "string" ? row.type : undefined
    })
  }
  return methods
}

/** 只自动调用 agent 型；缺 type 时按 Registry 默认视为 agent。 */
export function pickAgentAuthMethod(methods: AcpAuthMethod[]): AcpAuthMethod | undefined {
  return methods.find((item) => !item.type || item.type === "agent")
}

export function isAuthRequiredError(error: unknown): boolean {
  if (error instanceof AcpAuthRequiredError) return true
  const message = error instanceof Error ? error.message : String(error)
  if (/auth[_ ]required/i.test(message)) return true
  if (/authentication required/i.test(message)) return true
  if (error instanceof AcpRpcError) {
    if (error.code === -32000 && /auth/i.test(message)) return true
    const data = asRecord(error.data)
    const code = String(data.code ?? data.error ?? data.type ?? "")
    if (/auth/i.test(code)) return true
  }
  return false
}

export async function completeAcpHandshake(input: {
  initialize: () => Promise<unknown>
  authenticate: (methodId: string) => Promise<void>
  newSession: () => Promise<string>
}): Promise<string> {
  const initialized = await input.initialize()
  const methods = parseAuthMethods(initialized)
  try {
    return await input.newSession()
  } catch (error) {
    if (!isAuthRequiredError(error)) throw error
    const method = pickAgentAuthMethod(methods)
    if (!method) {
      throw new AcpAuthRequiredError(
        "ACP_AUTH_REQUIRED: this CLI needs login before a session can start.",
        methods
      )
    }
    await input.authenticate(method.id)
    try {
      return await input.newSession()
    } catch (retryError) {
      if (isAuthRequiredError(retryError)) {
        throw new AcpAuthRequiredError(
          "ACP_AUTH_REQUIRED: login did not complete.",
          methods
        )
      }
      throw retryError
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
