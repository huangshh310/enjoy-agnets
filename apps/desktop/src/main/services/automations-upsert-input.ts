/**
 * Automations 主进程入口的纯函数（node:test 可直接加载，不碰 electron / database）。
 * - 写入（upsert）：说明（prompt）去首尾空白后不能为空（leo #151），不只靠 UI 禁用保存。
 * - 读（parseStoredAutomations）：生产读取路径 readAutomations 走这里；读 schema 不收紧，旧的空说明记录照常加载。
 * - 开关（applyAutomationEnabled）：只改 enabled，不过说明校验，旧的空说明记录也能暂停。
 */
import {
  Automation,
  SetAutomationEnabledInput,
  UpsertAutomationInput
} from "@enjoy-agents/ipc-contract/automations"

export function parseAutomationUpsert(raw: unknown): UpsertAutomationInput {
  return UpsertAutomationInput.parse(raw)
}

export function parseSetAutomationEnabled(raw: unknown): SetAutomationEnabledInput {
  return SetAutomationEnabledInput.parse(raw)
}

/** settings 行 JSON → 列表；坏条目丢弃，不让手改的行炸穿消费方。 */
export function parseStoredAutomations(raw: string | null | undefined): Automation[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const row = Automation.safeParse(item)
      return row.success ? [row.data] : []
    })
  } catch {
    return []
  }
}

/** 只翻 enabled；找不到返回 undefined。其它字段（含空说明）原样保留。 */
export function applyAutomationEnabled(
  list: readonly Automation[],
  input: SetAutomationEnabledInput,
  now: number
): { next: Automation[]; item: Automation } | undefined {
  const existing = list.find((row) => row.id === input.id)
  if (!existing) return undefined
  const item = { ...existing, enabled: input.enabled, updatedAt: now }
  return { next: list.map((row) => (row.id === input.id ? item : row)), item }
}
