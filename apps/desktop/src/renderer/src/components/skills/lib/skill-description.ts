/**
 * 技能描述：YAML 空折叠标 `>-` / `|` 不当成正文。
 */

const EMPTY_MARKUP = /^(>-?|\||>)$/

export function displaySkillDescription(raw: string | undefined, fallback: string): string {
  const text = (raw ?? "").trim()
  if (!text || EMPTY_MARKUP.test(text)) return fallback
  return text
}
