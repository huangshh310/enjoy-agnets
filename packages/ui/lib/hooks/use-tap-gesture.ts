"use client"

/**
 * click 没有 pointerType：用 pointerdown 记下这次激活来自鼠标还是触摸。
 */
import { useMemo, useRef } from "react"

export type TapRecord<S> = { pointerType: string; state: S }

export function useTapGesture<S>() {
  const record = useRef<TapRecord<S> | null>(null)

  return useMemo(
    () => ({
      start: (event: { pointerType: string }, state: S) => {
        record.current = { pointerType: event.pointerType, state }
      },
      take: () => {
        const spent = record.current
        record.current = null
        return spent
      },
      drop: () => {
        record.current = null
      }
    }),
    []
  )
}
