/**
 * 列本机 ACP 会话时的 spawn 覆盖。没写过覆盖不得读 modelId。
 */
export function acpListSpawnOverride(override?: {
  binaryPath?: string
  extraArgs?: string[]
  modelId?: string
}): { binaryPath?: string; extraArgs?: string[]; modelId?: string } {
  return {
    ...(override?.binaryPath ? { binaryPath: override.binaryPath } : {}),
    extraArgs: override?.extraArgs,
    modelId: override?.modelId
  }
}
