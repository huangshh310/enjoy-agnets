/** 锁 §降级：SSH / wasm 失败时诚实文案，不得静默假装有符号。 */
export const SYMBOL_MAP_UNAVAILABLE_NOTE = "符号地图不可用 · 目录模式"

export function directoryModeBanner(): string {
  return `# Workspace outline (directory mode)\n${SYMBOL_MAP_UNAVAILABLE_NOTE}\nUse glob/grep for more.`
}
