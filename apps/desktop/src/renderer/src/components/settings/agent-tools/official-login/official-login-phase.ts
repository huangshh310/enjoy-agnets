/**
 * 仅官方密表行：PATH 就绪仍要走登录四态，禁止把检测中 / 授权中画成已就绪。
 */
import {
  classifyPowerSource,
  officialLoginState,
  type OfficialLoginLoop,
  type OfficialLoginState,
  type PowerSourceKind
} from "@enjoy-agents/ipc-contract/power-source"

export type OfficialLoginRowPhase = "idle" | OfficialLoginState

export function officialLoginRowPhase(input: {
  runtimeId: string
  pathReady: boolean
  canLogin: boolean
  loggedIn?: boolean | null
  inspecting?: boolean
  loginLoop?: OfficialLoginLoop
}): OfficialLoginRowPhase {
  const kind: PowerSourceKind = classifyPowerSource(input.runtimeId)
  if (kind !== "official" || !input.pathReady || !input.canLogin) return "idle"
  return officialLoginState(input.loggedIn, input.inspecting, input.loginLoop)
}

/** 覆盖助手点 / 主槽：未确认登录都不走「已就绪 / 设为主引擎」。 */
export function overridesOfficialListReady(phase: OfficialLoginRowPhase): boolean {
  return phase === "check" || phase === "out" || phase === "auth" || phase === "fail"
}

/** 预览：检测中 / 打开授权中不画 ⚙，已登录与失败才留配置。 */
export function showsOfficialConfigure(phase: OfficialLoginRowPhase): boolean {
  return phase === "idle" || phase === "in" || phase === "fail" || phase === "out"
}
