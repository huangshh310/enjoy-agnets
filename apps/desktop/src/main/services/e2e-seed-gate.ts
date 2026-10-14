/**
 * E2E 写盘 / 夹具闸：stub + 未打包 + 隔离 userData。
 */

export function e2eChatReadinessAllowed(env: NodeJS.ProcessEnv = process.env, packaged = false): boolean {
  return env.ENJOY_E2E_STUB === "1" && !packaged
}

/** 写盘夹具还要隔离 userData，避免误种到本机目录。 */
export function e2eChatReadySeedAllowed(input: {
  env?: NodeJS.ProcessEnv
  packaged?: boolean
  userData?: string
}): boolean {
  const env = input.env ?? process.env
  if (!e2eChatReadinessAllowed(env, input.packaged === true)) return false
  const isolated = env.ENJOY_E2E_USERDATA || env.ENJOY_DEV_USERDATA
  if (!isolated) return false
  if (input.userData && input.userData !== isolated) return false
  return true
}
