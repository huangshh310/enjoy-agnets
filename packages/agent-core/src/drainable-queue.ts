/**
 * 可排干队列：drain 等到队列空且当前项 process 结束。空队列 ≠ idle。
 */

export class DrainableQueue<T> {
  private pending: T[] = []
  private inflight = 0
  private waiters: Array<() => void> = []
  private readonly process: (item: T) => Promise<void>

  constructor(process: (item: T) => Promise<void>) {
    this.process = process
  }

  get size(): number {
    return this.pending.length + this.inflight
  }

  enqueue(item: T): void {
    this.pending.push(item)
    void this.kick()
  }

  /** 队列空且当前项做完才 resolve。测试用，不要拿来当 UI 超时。 */
  drain(): Promise<void> {
    if (this.pending.length === 0 && this.inflight === 0) return Promise.resolve()
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  private async kick(): Promise<void> {
    if (this.inflight > 0) return
    const item = this.pending.shift()
    if (item === undefined) {
      this.flushWaiters()
      return
    }
    this.inflight = 1
    try {
      await this.process(item)
    } finally {
      this.inflight = 0
      void this.kick()
    }
  }

  private flushWaiters(): void {
    const due = this.waiters
    this.waiters = []
    for (const resolve of due) resolve()
  }
}
