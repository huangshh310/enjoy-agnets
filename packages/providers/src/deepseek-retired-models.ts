/**
 * DeepSeek 官方已停用、或只是临时转发的模型名 → 当前官方名。
 * 依据（2026-10-21 核对）：
 * - https://api-docs.deepseek.com/updates/ ：deepseek-chat / deepseek-reasoner 于 2026-07-24 停用；
 *   deepseek-v4-flash / deepseek-v4-flash-vision-exp 已退役，只是「temporarily routed」到 V4.1 Flash。
 * - https://api-docs.deepseek.com/quick_start/pricing/ ：当前模型名 deepseek-flash、deepseek-v4-pro。
 * 只对官方端点（https + 精确主机 api.deepseek.com）的 deepseek 档案改写；跑第二次不再有变化。
 */

/** 停用名 → 替代名。替代名本身不能出现在左边，否则迁移不幂等。 */
export const DEEPSEEK_RETIRED_MODEL_IDS: Readonly<Record<string, string>> = Object.freeze({
  "deepseek-chat": "deepseek-flash",
  "deepseek-reasoner": "deepseek-flash",
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-v4-flash-vision-exp": "deepseek-flash"
})

const OFFICIAL_HOST = "api.deepseek.com"

type RetiredModel = { id?: string; label?: string; enabled?: boolean; source?: string }

type RetiredSelection = { modelId?: string; fastModelId?: string; reasoningModelId?: string }

/** 只认 https、精确主机、无端口、无用户名密码。子域、http、中转、自定义地址一律 false。 */
export function isOfficialDeepseekEndpointUrl(value: string | undefined): boolean {
  let url: URL
  try {
    url = new URL(value?.trim() ?? "")
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.hostname !== OFFICIAL_HOST) return false
  return url.port === "" && !url.username && !url.password
}

/**
 * 档案的每一条已填端点都必须是官方地址。一条都没填时按官方算：
 * 请求会回落到预设 https://api.deepseek.com/v1（config.ts resolvedBaseURL），计价也把空地址当官方。
 */
export function isOfficialDeepseekProfile(kind: string, endpoints: Record<string, string | undefined>): boolean {
  if (kind !== "deepseek") return false
  const urls = Object.values(endpoints).filter((value): value is string => Boolean(value?.trim()))
  return urls.every((value) => isOfficialDeepseekEndpointUrl(value))
}

function replacementFor(id: string | undefined, manualIds: ReadonlySet<string>): string | undefined {
  const key = id?.trim() ?? ""
  if (!key || manualIds.has(key)) return undefined
  return Object.hasOwn(DEEPSEEK_RETIRED_MODEL_IDS, key) ? DEEPSEEK_RETIRED_MODEL_IDS[key] : undefined
}

/**
 * 改写目录里的停用名，并去重。用户手动加的（source=manual）原样保留，同名的选中项也不动。
 * 合并规则见 remapList。
 */
export function remapRetiredDeepseekModels<M extends RetiredModel, S extends RetiredSelection>(
  models: M[] | undefined,
  selection: S,
  labelFor: (id: string) => string | undefined
): { models: M[] | undefined; selection: S; changed: boolean } {
  const manualIds = new Set((models ?? []).filter((m) => m.source === "manual").map((m) => m.id?.trim() ?? ""))
  const nextModels = Array.isArray(models) ? remapList(models, manualIds, labelFor) : models
  let changed = nextModels !== models
  const nextSelection = { ...selection }
  for (const field of ["modelId", "fastModelId", "reasoningModelId"] as const) {
    const target = replacementFor(selection[field], manualIds)
    if (!target) continue
    nextSelection[field] = target as S[typeof field]
    changed = true
  }
  return { models: nextModels, selection: changed ? nextSelection : selection, changed }
}

/**
 * 改名后同 id 只留一条，结果与停用项的先后顺序无关：
 * - 列表里本来就有新名那一行（保留行）时，停用行全部丢掉，保留行赢。
 *   保留行是 manual 时一个字节都不改；不是 manual 时，只在它关着、而停用行有开着的情况下把 enabled 打开。
 * - 没有保留行时，在第一条停用行的位置放一条全新的新名行，只带 id / label / enabled / source。
 *   旧行的单价、上下文窗口、输出上限都属于旧模型，不带过来，让快照价生效。
 */
function remapList<M extends RetiredModel>(
  models: M[],
  manualIds: ReadonlySet<string>,
  labelFor: (id: string) => string | undefined
): M[] {
  const targets = models.map((model) => replacementFor(model.id, manualIds))
  if (targets.every((target) => !target)) return models
  const enabledTargets = new Set(
    models.flatMap((model, i) => {
      const target = targets[i]
      return target && model.enabled !== false ? [target] : []
    })
  )
  const out: M[] = []
  const placed = new Set<string>()
  models.forEach((model, i) => {
    const target = targets[i]
    if (!target) {
      out.push(keeperRow(model, enabledTargets))
      return
    }
    const hasKeeper = models.some((other, j) => !targets[j] && other.id?.trim() === target)
    if (hasKeeper || placed.has(target)) return
    placed.add(target)
    const label = labelFor(target) ?? target
    out.push({ id: target, label, enabled: enabledTargets.has(target), source: "preset" } as M)
  })
  return out
}

/** 保留行：manual 原样；其它只在需要时打开 enabled。 */
function keeperRow<M extends RetiredModel>(model: M, enabledTargets: ReadonlySet<string>): M {
  if (model.source === "manual" || model.enabled !== false) return model
  return enabledTargets.has(model.id?.trim() ?? "") ? { ...model, enabled: true } : model
}

/**
 * 读档迁移入口：只在 kind=deepseek 且所有已填端点都是官方地址（一条没填也算）时改写目录与选中模型。
 * 中转、代理、自定义地址、http、子域原样返回同一个对象。
 */
export function migrateRetiredDeepseekProfile<P extends RetiredSelection & { models?: RetiredModel[] }>(
  raw: P,
  kind: string,
  endpoints: Record<string, string | undefined>,
  labelFor: (id: string) => string | undefined
): { raw: P; changed: boolean } {
  if (!isOfficialDeepseekProfile(kind, endpoints)) return { raw, changed: false }
  const remapped = remapRetiredDeepseekModels(raw.models, raw, labelFor)
  if (!remapped.changed) return { raw, changed: false }
  return { raw: { ...remapped.selection, models: remapped.models }, changed: true }
}
