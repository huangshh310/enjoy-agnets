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

/** 自定义 ACP 助手入库的字段（和开跑时 openCustomAcpStream 用的一致）。 */
export type CustomAcpListRecord = {
  command: string
  args: string[]
  env: Record<string, string>
  modelId?: string
  enabled: boolean
}

export type AcpListSpawnPlan =
  | { kind: "spawn"; cwd: string; override: { binaryPath?: string; extraArgs?: string[]; modelId?: string }; env?: Record<string, string> }
  | { kind: "unsupported"; error?: string }

/**
 * 列本机 ACP 会话怎么起进程（luna -71）：
 * 预置引擎读「引擎覆盖」；自定义助手（custom:*）读它自己入库的 command / args / env / cwd，
 * 不能去读预置覆盖（那里永远没有自定义助手，结果什么都列不出来）。
 */
export function acpListSpawnPlan(input: {
  runtimeId: string
  isCustom: boolean
  presetOverride?: { binaryPath?: string; extraArgs?: string[]; modelId?: string }
  custom?: CustomAcpListRecord
  /** 自定义助手的工作目录（已按 cwdMode 解析）；预置引擎用工作区根。 */
  customCwd?: string
  workspaceRoot: string
  workspaceIsSsh: boolean
}): AcpListSpawnPlan {
  if (!input.isCustom) {
    return { kind: "spawn", cwd: input.workspaceRoot, override: acpListSpawnOverride(input.presetOverride) }
  }
  if (!input.custom || !input.custom.enabled) return { kind: "unsupported" }
  if (input.workspaceIsSsh) return { kind: "unsupported", error: "自定义助手暂不支持远程工作区" }
  return {
    kind: "spawn",
    cwd: input.customCwd || input.workspaceRoot,
    override: {
      binaryPath: input.custom.command,
      extraArgs: input.custom.args,
      ...(input.custom.modelId ? { modelId: input.custom.modelId } : {})
    },
    env: input.custom.env
  }
}
