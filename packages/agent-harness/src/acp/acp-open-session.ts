/**
 * resume 失败则 new，并标明是否回落，避免静默丢掉本机会话。
 */
export async function openAcpSession(input: {
  resumeId?: string
  canResume: boolean
  resume: (id: string) => Promise<string>
  create: () => Promise<string>
}): Promise<{ sessionId: string; resumed: boolean }> {
  const resumeId = input.resumeId?.trim()
  if (resumeId && input.canResume) {
    try {
      const sessionId = await input.resume(resumeId)
      return { sessionId, resumed: true }
    } catch {
      const sessionId = await input.create()
      return { sessionId, resumed: false }
    }
  }
  return { sessionId: await input.create(), resumed: false }
}
