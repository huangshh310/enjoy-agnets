/**
 * loadWorkspace 撞到已删项目：remember 的 Unknown workspace 必须中止，不要继续灌。
 */
export function isUnknownWorkspaceRememberError(message: string): boolean {
  return /unknown workspace/i.test(message)
}
