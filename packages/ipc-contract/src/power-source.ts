/**
 * 本机 CLI 列表「动力源」同构：每行都有，按能力分类，不按品牌特判。
 * 绑定白名单 = providerBind !== none；OMP 共用槽位但文案不是 Enjoy 档案。
 */
import { isCustomAgentId } from "./custom-agent.ts"
import { capabilitiesFor } from "./runtime-capabilities.ts"

export type PowerSourceKind = "enjoy-vault" | "bindable" | "official" | "omp"

/** 官方登录态：已登录 / 未登录 / 检测中 / 授权中 / 失败。 */
export type OfficialLoginState = "in" | "out" | "check" | "auth" | "fail"

/** renderer 登录闭环：打开授权中或失败。idle 表示没有进行中的 login。 */
export type OfficialLoginLoop = "idle" | "authorizing" | "failed"

export type PowerSourceMode = "vault" | "official" | "omp"

/** 列表列永远 present。renderer 只负责把 parts 翻成人话。 */
export type PowerSourceParts = {
  kind: PowerSourceKind
  present: true
  mode: PowerSourceMode
  archive?: string
  model?: string
  official?: OfficialLoginState
}

export type PowerSourceInput = {
  runtimeId: string
  useCustomProvider?: boolean
  boundProviderName?: string
  selectedModel?: string
  loggedIn?: boolean | null
  inspecting?: boolean
  /** 打开授权中 / 失败。inspect 已确认登录时仍以 loggedIn 为准。 */
  loginLoop?: OfficialLoginLoop
  enjoyArchive?: string
  enjoyModel?: string
  ompSupplier?: string
  ompModel?: string
}

/** 按 runtime 能力分类。Cursor/Grok 等只因 providerBind=none 才走官方。 */
export function classifyPowerSource(runtimeId: string): PowerSourceKind {
  if (runtimeId === "enjoy-local") return "enjoy-vault"
  if (runtimeId === "omp") return "omp"
  if (isCustomAgentId(runtimeId)) return "official"
  if (capabilitiesFor(runtimeId).providerBind !== "none") return "bindable"
  return "official"
}

/** 每条助手都有动力源列；禁止再按品牌藏行。 */
export function describePowerSource(input: PowerSourceInput): PowerSourceParts {
  const kind = classifyPowerSource(input.runtimeId)
  if (kind === "enjoy-vault") {
    return vaultParts(kind, input.enjoyArchive, input.enjoyModel)
  }
  if (kind === "omp") {
    return {
      kind,
      present: true,
      mode: "omp",
      archive: trimOrEmpty(input.ompSupplier),
      model: trimOrEmpty(input.ompModel)
    }
  }
  if (kind === "bindable" && input.useCustomProvider) {
    return vaultParts(kind, input.boundProviderName, input.selectedModel)
  }
  return {
    kind,
    present: true,
    mode: "official",
    official: officialLoginState(input.loggedIn, input.inspecting, input.loginLoop)
  }
}

/** OMP 的 selector 是 `供应商/模型`；不要当成 Enjoy vault 档案名。 */
export function ompPowerFromSelection(
  selectedModel?: string,
  providers?: ReadonlyArray<{ id: string; label?: string; loggedIn?: boolean }>
): { supplier: string; model: string } {
  const selected = selectedModel?.trim() ?? ""
  const slash = selected.indexOf("/")
  if (slash > 0) {
    const id = selected.slice(0, slash)
    const model = selected.slice(slash + 1)
    const hit = providers?.find((item) => item.id === id)
    return { supplier: hit?.label?.trim() || id, model }
  }
  const logged = providers?.find((item) => item.loggedIn)
  return {
    supplier: logged?.label?.trim() || logged?.id || "",
    model: selected
  }
}

export function officialLoginState(
  loggedIn?: boolean | null,
  inspecting?: boolean,
  loginLoop?: OfficialLoginLoop
): OfficialLoginState {
  if (loginLoop === "authorizing" && loggedIn !== true) return "auth"
  if (loginLoop === "failed" && loggedIn !== true) return "fail"
  if (loggedIn === true) return "in"
  if (inspecting || loggedIn == null) return "check"
  return "out"
}

function vaultParts(
  kind: PowerSourceKind,
  archive?: string,
  model?: string
): PowerSourceParts {
  return {
    kind,
    present: true,
    mode: "vault",
    archive: trimOrEmpty(archive),
    model: trimOrEmpty(model)
  }
}

function trimOrEmpty(value?: string): string {
  return value?.trim() ?? ""
}
