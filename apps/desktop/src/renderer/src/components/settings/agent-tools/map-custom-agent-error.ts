/**
 * 自定义 ACP 表单错误：main 英文 throw 只给日志，UI 映射成人话。
 */
const REFUSE_SPAWN = /Refusing to spawn '([^']+)'/i
const REFUSE_BASENAME = /Basename must be a known ACP CLI/i

type Translate = (path: string, vars?: Record<string, string | number>) => string

/** 白名单拒绝不把 Basename / spawn 行话摊给用户。 */
export function mapCustomAgentFormError(
  raw: string,
  t: Translate,
  fallbackCommand = ""
): string {
  const match = raw.match(REFUSE_SPAWN)
  if (match || REFUSE_BASENAME.test(raw)) {
    const command = match?.[1] || fallbackCommand.trim()
    return t("settings.registry.customCommandRefused", { command })
  }
  return raw
}
