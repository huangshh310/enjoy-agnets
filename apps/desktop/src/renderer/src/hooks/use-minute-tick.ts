/**
 * 每 60 秒让调用方重画一次（侧栏「刚刚 / N 分钟」相对时间往前走）。
 * 只是一个计数 state，不写 store；一分钟一次重画，不会引起连锁刷新。
 */
import { useEffect, useState } from "react"

export const MINUTE_TICK_MS = 60_000

export function useMinuteTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), MINUTE_TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return tick
}
