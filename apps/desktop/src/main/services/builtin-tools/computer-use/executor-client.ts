/**
 * 跟桌面执行器讲换行 JSON。请求串行，超时杀掉进程，崩溃只重启一次。
 */
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { spawnPathCommand } from "@enjoy-agents/agent-harness/probe"

const DEFAULT_TIMEOUT_MS = 15_000

export class ExecutorFailure extends Error {
  readonly code: string

  constructor(code: string, message = code) {
    super(message)
    this.name = "ExecutorFailure"
    this.code = code
  }
}

export type ExecutorHandle = {
  request: (method: string, params: Record<string, unknown>) => Promise<unknown>
  dispose: () => void
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type Reply = { id?: string; result?: unknown; error?: { code?: string; message?: string } }

/** 拉起一个执行器进程。`command` 是可执行文件，不是参数数组。 */
export function startExecutor(command: string, args: string[] = [], timeoutMs = DEFAULT_TIMEOUT_MS): ExecutorHandle {
  const proc = new ExecutorProcess(command, args, timeoutMs)
  return { request: (method, params) => proc.request(method, params), dispose: () => proc.dispose() }
}

class ExecutorProcess {
  private child: ChildProcessWithoutNullStreams
  private restarted = false
  private disposed = false
  private seq = 0
  private buffer = ""
  private chain: Promise<unknown> = Promise.resolve()
  private readonly pending = new Map<string, Pending>()
  private readonly command: string
  private readonly args: string[]
  private readonly timeoutMs: number

  constructor(command: string, args: string[], timeoutMs: number) {
    this.command = command
    this.args = args
    this.timeoutMs = timeoutMs
    this.child = this.launch()
  }

  request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const run = this.chain.then(() => this.send(method, params))
    this.chain = run.then(() => undefined, () => undefined)
    return run
  }

  dispose(): void {
    this.disposed = true
    this.failAll(new ExecutorFailure("executor_disposed"))
    this.child.kill()
  }

  private launch(): ChildProcessWithoutNullStreams {
    const proc = spawnPathCommand(this.command, this.args, { stdio: ["pipe", "pipe", "pipe"] }) as ChildProcessWithoutNullStreams
    proc.stdout.setEncoding("utf8")
    proc.stdout.on("data", (chunk: string) => this.push(chunk))
    proc.on("error", (error) => this.failAll(new ExecutorFailure("executor_missing", error.message)))
    proc.on("exit", () => this.onExit(proc))
    return proc
  }

  private onExit(proc: ChildProcessWithoutNullStreams): void {
    if (this.disposed || proc !== this.child) return
    this.failAll(new ExecutorFailure("executor_exited"))
    if (this.restarted) return
    this.restarted = true
    this.buffer = ""
    this.child = this.launch()
  }

  private push(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split("\n")
    this.buffer = lines.pop() ?? ""
    for (const line of lines) this.accept(line)
  }

  private accept(line: string): void {
    const row = parseReply(line)
    if (!row?.id) return
    const job = this.pending.get(row.id)
    if (!job) return
    clearTimeout(job.timer)
    this.pending.delete(row.id)
    if (row.error) job.reject(new ExecutorFailure(row.error.code || "executor_error", row.error.message || row.error.code))
    else job.resolve(row.result)
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = String(++this.seq)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.timeOut(id), this.timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.child.stdin.write(`${JSON.stringify({ id, method, params })}\n`)
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error instanceof ExecutorFailure ? error : new ExecutorFailure("executor_exited"))
      }
    })
  }

  private timeOut(id: string): void {
    const job = this.pending.get(id)
    if (!job) return
    this.pending.delete(id)
    job.reject(new ExecutorFailure("executor_timeout"))
    this.child.kill()
  }

  private failAll(error: Error): void {
    for (const job of this.pending.values()) {
      clearTimeout(job.timer)
      job.reject(error)
    }
    this.pending.clear()
  }
}

function parseReply(line: string): Reply | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as Reply
  } catch {
    return null
  }
}
