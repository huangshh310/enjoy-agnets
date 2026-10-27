/**
 * 主进程 stdout / stderr 的管道断开不能打成未捕获异常。
 * pnpm 用管道接日志。读端关掉或缓冲被打满之后，
 * webFrameMain.send 失败时内部的 console.error 会写出 EPIPE。
 * Node 的错误栈默认只留 10 帧，对话框只剩 write EPIPE 和 s.send。
 * Electron 把它当成主进程崩溃弹窗。
 */
type StdioStream = NodeJS.WriteStream

const BENIGN_STDIO_CODES = new Set(["EPIPE", "ERR_STREAM_DESTROYED"])
const guarded = new WeakSet<StdioStream>()

export function isBenignStdioError(error: { code?: string } | undefined): boolean {
  return error?.code != null && BENIGN_STDIO_CODES.has(error.code)
}

/** 常驻 error 监听。只吞管道断开；其它写错误下一拍再抛，仍走原来的崩溃对话框。 */
export function installStdioEpipeGuard(
  stdout: StdioStream = process.stdout,
  stderr: StdioStream = process.stderr
): void {
  watch(stdout)
  watch(stderr)
}

function watch(stream: StdioStream): void {
  if (guarded.has(stream)) return
  guarded.add(stream)
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (isBenignStdioError(error)) return
    process.nextTick(() => {
      throw error
    })
  })
}
