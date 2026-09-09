/**
 * 本机助手导轨：已装 / 未装都上轨。未装点开下面板一键安装。
 */

export function splitCliReady<T extends { status: string }>(cli: T[]): {
  installed: T[]
  missing: T[]
} {
  return {
    installed: cli.filter((item) => item.status === "ready"),
    missing: cli.filter((item) => item.status !== "ready")
  }
}
