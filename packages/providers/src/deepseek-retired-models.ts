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

/** 档案的每一条已填端点都必须是官方地址；一条都没有也不算。 */
export function isOfficialDeepseekProfile(kind: string, endpoints: Record<string, string | undefined>): boolean {
  if (kind !== "deepseek") return false
  const urls = Object.values(endpoints).filter((value): value is string => Boolean(value?.trim()))
  return urls.length > 0 && urls.every((value) => isOfficialDeepseekEndpointUrl(value))
}

function replacementFor(id: string | undefined, manualIds: ReadonlySet<string>): string | undefined {
  const key = id?.trim() ?? ""
  if (!key || manualIds.has(key)) return undefined
  return Object.hasOwn(DEEPSEEK_RETIRED_MODEL_IDS, key) ? DEEPSEEK_RETIRED_MODEL_IDS[key] : undefined
}

/**
 * 改写目录里的停用名，并去重。用户手动加的（source=manual）原样保留，同名的选中项也不动。
 * 被合并掉的停用项原来开着、保留项关着时，把保留项打开，用户不会因为迁移少一个能用的模型。
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

/** 改名后同 id 只留一条：优先留原本就是新名的那条；被合并的停用项开着时把保留项打开。没改动就返回原数组。 */
function remapList<M extends RetiredModel>(
  models: M[],
  manualIds: ReadonlySet<string>,
  labelFor: (id: string) => string | undefined
): M[] {
  const renamed = new Set<M>()
  const mapped = models.map((model) => {
    const target = replacementFor(model.id, manualIds)
    if (!target) return model
    const next = { ...model, id: target, label: labelFor(target) ?? target }
    renamed.add(next)
    return next
  })
  if (renamed.size === 0) return models
  const out: M[] = []
  for (const model of mapped) {
    const id = model.id?.trim() ?? ""
    const keeperIndex = out.findIndex((m) => (m.id?.trim() ?? "") === id && (renamed.has(m) || renamed.has(model)))
    if (keeperIndex < 0) {
      out.push(model)
      continue
    }
    const keeper = out[keeperIndex]!
    const original = renamed.has(keeper) && !renamed.has(model) ? model : keeper
    const dropped = original === model ? keeper : model
    out[keeperIndex] = dropped.enabled !== false && original.enabled === false ? { ...original, enabled: true } : original
  }
  return out
}

/**
 * 读档迁移入口：只在 kind=deepseek 且所有端点都是官方地址时改写目录与选中模型。
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
