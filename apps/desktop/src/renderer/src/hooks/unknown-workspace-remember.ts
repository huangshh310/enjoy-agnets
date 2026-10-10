/**
 * loadWorkspace 撞到已删项目：remember 的 Unknown workspace 必须中止，不要继续灌。
 */
export function isUnknownWorkspaceRememberError(message: string): boolean {
  return /unknown workspace/i.test(message)
}

/** 真实切换写入 MRU。Unknown 刷新名单并中止；其它失败不挡住。 */
export async function rememberWorkspaceOnLoad(input: {
  remember: () => Promise<void>
  onUnknown: () => Promise<void>
}): Promise<"abort" | "continue"> {
  try {
    await input.remember()
    return "continue"
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (isUnknownWorkspaceRememberError(message)) {
      await input.onUnknown()
      return "abort"
    }
    return "continue"
  }
}
