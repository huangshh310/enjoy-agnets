/**
 * 用户规则解析、撞键与恢复默认。非法条目点名后丢掉，不扔掉整份配置。
 */
import {
  DEFAULT_KEYBINDINGS,
  KEYBINDING_COMMANDS,
  KEYBINDING_LIMIT,
  KeybindingRule,
  chordAllowsRecording,
  defaultWhen,
  isReservedChord,
  normalizeChord,
  type KeybindingCommand,
  type KeybindingPlatform,
  type KeybindingWhen
} from "./keybindings"

const EXCLUSIVE: ReadonlyArray<readonly [KeybindingWhen, KeybindingWhen]> = [
  ["terminalFocus", "composerFocus"],
  ["terminalFocus", "!terminalFocus"],
  ["composerFocus", "!inputFocus"]
]

/** 两段 when 能否在同一次按键里同时成立。缺省 when 表示始终，和谁都重叠。 */
export function whensOverlap(left?: KeybindingWhen, right?: KeybindingWhen): boolean {
  if (!left || !right) return true
  return !EXCLUSIVE.some(([a, b]) => (left === a && right === b) || (left === b && right === a))
}

export function partitionKeybindings(
  raw: unknown,
  platform: KeybindingPlatform = "other"
): { rules: KeybindingRule[]; invalid: string[] } {
  if (raw == null) return { rules: [], invalid: [] }
  if (!Array.isArray(raw)) return { rules: [], invalid: ["keybindings"] }
  const invalid: string[] = []
  if (raw.length > KEYBINDING_LIMIT) invalid.push("keybindings.overflow")
  const rules: KeybindingRule[] = []
  for (const item of raw.slice(0, KEYBINDING_LIMIT)) {
    const accepted = acceptRule(item, platform)
    if (accepted.ok) rules.push(accepted.rule)
    else invalid.push(accepted.label)
  }
  return { rules, invalid }
}

function acceptRule(
  item: unknown,
  platform: KeybindingPlatform
): { ok: true; rule: KeybindingRule } | { ok: false; label: string } {
  const parsed = KeybindingRule.safeParse(item)
  if (!parsed.success) return { ok: false, label: labelOf(item) }
  const key = normalizeChord(parsed.data.key)
  if (!key) return { ok: false, label: parsed.data.command }
  if (key !== "unassigned" && isReservedChord(key, platform)) return { ok: false, label: parsed.data.command }
  return { ok: true, rule: { ...parsed.data, key, when: parsed.data.when ?? defaultWhen(parsed.data.command) } }
}

function labelOf(item: unknown): string {
  if (item && typeof item === "object" && "command" in item && typeof item.command === "string") {
    return item.command.slice(0, 80)
  }
  return "keybindings"
}

export type ResolvedBinding = {
  key: string
  command: KeybindingCommand
  when?: KeybindingWhen
}

/** 同名命令的用户规则整组盖住默认。只有 unassigned 时该命令没有键。 */
export function resolveKeybindings(userRules: readonly KeybindingRule[]): ResolvedBinding[] {
  const map = bindingsByCommand(userRules)
  const resolved: ResolvedBinding[] = []
  for (const command of KEYBINDING_COMMANDS) {
    const keys = map.get(command) ?? []
    const when = defaultWhen(command)
    if (keys.length === 0) {
      resolved.push(when ? { key: "unassigned", command, when } : { key: "unassigned", command })
      continue
    }
    for (const key of keys) {
      resolved.push(when ? { key, command, when } : { key, command })
    }
  }
  return resolved
}

export type RebindResult =
  | { ok: true; rules: KeybindingRule[]; stolenCommands: KeybindingCommand[] }
  | { ok: false; code: "invalid" | "modifier" | "reserved" | "limit" }

/** 改一条键。撞上可重叠 when 的命令时把键挪过来，对方没有别的键就变成未分配。 */
export function rebindKeybinding(input: {
  userRules: readonly KeybindingRule[]
  command: KeybindingCommand
  fromKey: string | null
  toKey: string
  platform: KeybindingPlatform
}): RebindResult {
  const nextKey = input.toKey === "unassigned" ? "unassigned" : normalizeChord(input.toKey)
  if (!nextKey) return { ok: false, code: "invalid" }
  if (nextKey !== "unassigned" && !chordAllowsRecording(nextKey)) return { ok: false, code: "modifier" }
  if (nextKey !== "unassigned" && isReservedChord(nextKey, input.platform)) return { ok: false, code: "reserved" }
  const map = bindingsByCommand(input.userRules)
  map.set(input.command, replaceKey(map.get(input.command) ?? [], input.fromKey, nextKey))
  const stolen = nextKey === "unassigned" ? [] : stealChord(map, input.command, nextKey)
  return finish(map, stolen)
}

/** 恢复一条命令的默认键，并把这些键从会冲突的命令上挪走。 */
export function resetKeybindingCommand(
  userRules: readonly KeybindingRule[],
  command: KeybindingCommand
): KeybindingRule[] {
  const map = bindingsByCommand(userRules)
  const defaults = defaultKeys(command)
  map.set(command, defaults)
  for (const key of defaults) stealChord(map, command, key)
  return userRulesFromBindings(map)
}

export function findChordConflicts(
  userRules: readonly KeybindingRule[],
  command: KeybindingCommand,
  chord: string
): KeybindingCommand[] {
  const key = normalizeChord(chord)
  if (!key || key === "unassigned") return []
  const map = bindingsByCommand(userRules)
  return stealChord(map, command, key)
}

function finish(map: Map<KeybindingCommand, string[]>, stolenCommands: KeybindingCommand[]): RebindResult {
  const rules = userRulesFromBindings(map)
  if (rules.length > KEYBINDING_LIMIT) return { ok: false, code: "limit" }
  return { ok: true, rules, stolenCommands }
}

function bindingsByCommand(userRules: readonly KeybindingRule[]): Map<KeybindingCommand, string[]> {
  const map = new Map<KeybindingCommand, string[]>()
  for (const command of KEYBINDING_COMMANDS) {
    const custom = userRules.filter((rule) => rule.command === command)
    const source = custom.length > 0 ? custom : DEFAULT_KEYBINDINGS.filter((rule) => rule.command === command)
    map.set(command, uniqueKeys(source.map((rule) => rule.key)))
  }
  return map
}

function uniqueKeys(keys: string[]): string[] {
  return [...new Set(keys.filter((key) => key !== "unassigned"))]
}

function defaultKeys(command: KeybindingCommand): string[] {
  return uniqueKeys(DEFAULT_KEYBINDINGS.filter((rule) => rule.command === command).map((rule) => rule.key))
}

function replaceKey(keys: string[], fromKey: string | null, toKey: string): string[] {
  const removed = fromKey && fromKey !== "unassigned" ? keys.filter((key) => key !== fromKey) : keys.slice()
  if (toKey === "unassigned" || removed.includes(toKey)) return removed
  return [...removed, toKey]
}

function stealChord(
  map: Map<KeybindingCommand, string[]>,
  owner: KeybindingCommand,
  chord: string
): KeybindingCommand[] {
  const stolen: KeybindingCommand[] = []
  for (const command of KEYBINDING_COMMANDS) {
    if (command === owner || !whensOverlap(defaultWhen(owner), defaultWhen(command))) continue
    const keys = map.get(command) ?? []
    if (!keys.includes(chord)) continue
    map.set(command, keys.filter((key) => key !== chord))
    stolen.push(command)
  }
  return stolen
}

function userRulesFromBindings(map: Map<KeybindingCommand, string[]>): KeybindingRule[] {
  const rules: KeybindingRule[] = []
  for (const command of KEYBINDING_COMMANDS) {
    const keys = map.get(command) ?? []
    if (sameKeys(keys, defaultKeys(command))) continue
    const when = defaultWhen(command)
    if (keys.length === 0) {
      rules.push(when ? { key: "unassigned", command, when } : { key: "unassigned", command })
      continue
    }
    for (const key of keys) rules.push(when ? { key, command, when } : { key, command })
  }
  return rules
}

function sameKeys(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const bag = new Set(right)
  return left.every((key) => bag.has(key))
}
