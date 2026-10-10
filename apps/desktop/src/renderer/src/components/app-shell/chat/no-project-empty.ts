/**
 * 无项目空态门闩：有项目或名单未到齐时不准画「选文件夹」。
 */
export function shouldShowNoProjectEmpty(input: {
  workspaceId: string | null | undefined
  surface: string
  workspacesSettled: boolean
  workspaceCount: number
}): boolean {
  if (input.workspaceId) return false
  if (input.surface !== "thread") return false
  if (!input.workspacesSettled) return false
  return input.workspaceCount === 0
}
