/**
 * 把 `plan>act>verify` 解析成带 dependsOn 的步骤列表。
 */
export function stepsFromChain(raw: string) {
  const ids = raw
    .split(/[>,]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return ids.map((id, index) => ({
    id,
    label: id,
    dependsOn: index === 0 ? [] : [ids[index - 1] as string]
  }))
}
