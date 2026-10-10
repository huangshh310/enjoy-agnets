/**
 * 重启回挂：库行缺 args 时回读 requestArgs；仍空则不弹允许卡。
 */

export function parseStoredApprovalArgs(row?: {
  args?: string | null
  requestArgs?: string | null
}): unknown | null {
  const fromArgs = parseJson(row?.args)
  if (!isEmptyArgs(fromArgs)) return fromArgs
  const fromRequest = parseJson(row?.requestArgs)
  if (!isEmptyArgs(fromRequest)) return fromRequest
  return null
}

function isEmptyArgs(args: unknown): boolean {
  return args == null
}

function parseJson(raw: string | null | undefined): unknown {
  if (raw == null || raw === "") return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}
