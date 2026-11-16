/**
 * 底栏选级 hook：RO 只看 row / leftInner / right 三个节点；回调先读完再判，最多写一次。
 * 宽度缓存只放 ref，不进 store。contentKey 一变，所有级缓存全清（C1）。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"
import {
  FOOTER_MAX_STEPS,
  footerDecide,
  footerDensityOf,
  footerOverflowOf,
  type FooterDecideState,
  type FooterStep
} from "./footer-density"

type RowStyle = { padL: number; padR: number; gapX: number }

export function useFooterDensity({
  rowRef,
  leftRef,
  rightRef,
  contentKey
}: {
  rowRef: RefObject<HTMLElement | null>
  leftRef: RefObject<HTMLElement | null>
  rightRef: RefObject<HTMLElement | null>
  contentKey: string
}) {
  const [step, setStep] = useState<FooterStep>("0")
  const stepRef = useRef<FooterStep>(step)
  stepRef.current = step
  const state = useRef<FooterDecideState>({ cache: {}, stepsUsed: 0 })
  const rowStyle = useRef<{ key: string; style: RowStyle } | null>(null)
  const keyRef = useRef(contentKey)
  keyRef.current = contentKey

  /** 读相 + 判定；返回下一级（不写）。 */
  const decide = useCallback((): FooterStep | null => {
    const row = rowRef.current
    const left = leftRef.current
    const right = rightRef.current
    if (!row || !left || !right) return null
    // —— 读相：一次读完 ——
    const clientWidth = row.clientWidth
    if (rowStyle.current?.key !== keyRef.current) {
      const cs = getComputedStyle(row)
      rowStyle.current = {
        key: keyRef.current,
        style: {
          padL: parseFloat(cs.paddingLeft) || 0,
          padR: parseFloat(cs.paddingRight) || 0,
          gapX: parseFloat(cs.columnGap) || 0
        }
      }
    }
    const leftW = left.getBoundingClientRect().width
    const rightW = right.getBoundingClientRect().width
    if (clientWidth <= 0) return null
    // —— 计算 ——
    const { padL, padR, gapX } = rowStyle.current.style
    const st = state.current
    const before = st.stepsUsed
    const next = footerDecide(st, {
      cur: stepRef.current,
      rowInner: clientWidth - padL - padR,
      gapX,
      left: leftW,
      right: rightW
    })
    if (next === null && before >= FOOTER_MAX_STEPS && import.meta.env?.DEV) {
      console.warn("[composer-footer] density step budget exhausted", { cur: stepRef.current })
    }
    return next
  }, [rowRef, leftRef, rightRef])

  // 换级瞬间关掉底栏后代的 CSS 过渡（fast / approval / 思考强度 / 引擎 chip 有 transition-all）：
  // 否则宽度 / 内边距会动画过去，layout effect 里量到的是过渡中途的窄宽，按它判升级 → 落定后才发现差几 px，
  // 下一次 ±4 抖动就降级。只在换级那一两帧挂 data-footer-switching，平时（含 L0）不生效，hover 过渡照旧。
  const switchRaf = useRef(0)
  const freezeTransitions = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    row.setAttribute("data-footer-switching", "")
    if (switchRaf.current) cancelAnimationFrame(switchRaf.current)
    switchRaf.current = requestAnimationFrame(() => {
      switchRaf.current = requestAnimationFrame(() => {
        switchRaf.current = 0
        rowRef.current?.removeAttribute("data-footer-switching")
      })
    })
  }, [rowRef])
  useEffect(() => () => {
    if (switchRaf.current) cancelAnimationFrame(switchRaf.current)
  }, [])
  const commit = useCallback(
    (next: FooterStep, sync: boolean) => {
      freezeTransitions()
      if (sync) flushSync(() => setStep(next))
      else setStep(next)
    },
    [freezeTransitions]
  )

  // RO：只观察三个节点；回调内最多一次 flushSync 写。
  useEffect(() => {
    const row = rowRef.current
    const left = leftRef.current
    const right = rightRef.current
    if (!row || !left || !right || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      state.current.stepsUsed = 0
      const next = decide()
      if (next) commit(next, true)
    })
    ro.observe(row)
    ro.observe(left)
    ro.observe(right)
    return () => ro.disconnect()
  }, [rowRef, leftRef, rightRef, decide, commit])

  // 字体换完：清全部缓存，合并到一个 rAF 再判一次。
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    if (!fonts) return
    let raf = 0
    let alive = true
    const schedule = () => {
      if (raf || !alive) return
      raf = requestAnimationFrame(() => {
        raf = 0
        state.current.cache = {}
        state.current.stepsUsed = 0
        const next = decide()
        if (next) commit(next, false)
      })
    }
    void fonts.ready.then(schedule)
    fonts.addEventListener?.("loadingdone", schedule)
    return () => {
      alive = false
      if (raf) cancelAnimationFrame(raf)
      fonts.removeEventListener?.("loadingdone", schedule)
    }
  }, [decide, commit])

  // 内容键一变：所有级缓存全清（C1），从当前级重新量。
  useLayoutEffect(() => {
    state.current.cache = {}
    rowStyle.current = null
    state.current.stepsUsed = 0
    const next = decide()
    if (next) commit(next, false)
  }, [contentKey, decide, commit])

  // 换级后、绘制前探一次（与 RO 回调共享步数计数），用户看不到中间态。
  const mounted = useRef(false)
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const next = decide()
    if (next) commit(next, false)
  }, [step, decide, commit])

  return { step, density: footerDensityOf(step), overflow: footerOverflowOf(step) }
}
