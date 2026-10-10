/**
 * 面板把同一命令的多个键收成一行；设置页仍按绑定分行。
 */
export function mergeShortcutRows<T extends { command: string; key: string }>(
  rows: T[]
): Array<{ command: T["command"]; keys: string[] }> {
  const order: Array<{ command: T["command"]; keys: string[] }> = []
  for (const row of rows) {
    const existing = order.find((item) => item.command === row.command)
    if (existing) {
      if (!existing.keys.includes(row.key)) existing.keys.push(row.key)
      continue
    }
    order.push({ command: row.command, keys: [row.key] })
  }
  return order
}
