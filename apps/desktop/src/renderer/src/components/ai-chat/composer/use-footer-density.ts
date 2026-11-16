/**
 * 底栏选级 hook：RO 只看 row / leftInner / right 三个节点；回调先读完再判，最多写一次。
 * 宽度缓存只放 ref，不进 store。contentKey 一变，所有级缓存全清（C1）。
 * #228 H2：另读停靠侧栏（[data-nav-card]）现在占主区多宽，并按侧栏自己的自动收起判断推它落定后的宽（footerSidebarIntent，订阅 store 的侧栏状态），
 * 侧栏收展动画期间与跨窄窗断点拖窗时级别只单向走（footerResizeGate / footerTargetInner），终态仍按同宽静态选级。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"
import {
  FOOTER_MAX_STEPS,
  FOOTER_SUBPIXEL_PX,
  footerDecide,
  footerDensityOf,
  footerSidebarIntent,
  footerResizeGate,
  footerOverflowOf,
  footerSidebarShift,
  footerStepIndex,
  footerTargetInner,
  type FooterDecideState,
  type FooterStep
} from "./footer-density"
import { NAV_CARD_COLLAPSED_PX, NAV_CARD_EXPANDED_PX } from "../../app-shell/constants"
import { useChatStore } from "@renderer/stores/chat-store"

type RowStyle = { padL: number; padR: number; gapX: number }

/** 停靠侧栏（app-shell nav-card）：现在占主区多宽（浮层只占轨道宽的槽）。只读，不改它。 */
const NAV_CARD_SELECTOR = "[data-nav-card]"
function readNavCardMain(): number | null {
  if (typeof document === "undefined") return null
  const nav = document.querySelector<HTMLElement>(NAV_CARD_SELECTOR)
  if (!nav) return null
  return nav.getAttribute("data-overlay") === "true" ? NAV_CARD_COLLAPSED_PX : nav.getBoundingClientRect().width
}

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

  /** 最近一次读到的行内宽（RO 闸门用：判断这一下宽度是在变大还是变小）。 */
  const lastInner = useRef<number | null>(null)
  /** 最近一次读到的侧栏 shift（footerSidebarShift）。 */
  const lastShift = useRef(0)
  /** 最近一次读到的「当前级整行所需宽 − 行内宽」。 */
  const lastOverflow = useRef(0)
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
    const navMain = readNavCardMain()
    // 侧栏落定后占主区多宽：按侧栏自己的自动收起判断（narrowSidebarWindow / onSidebarWidth）推，不等它的 React 渲染 / 动画开始。
    const windowW = typeof window !== "undefined" ? window.innerWidth : NaN
    const intent = footerSidebarIntent({
      state: useChatStore.getState().sidebarCollapseState,
      windowW,
      expandedPx: NAV_CARD_EXPANDED_PX,
      collapsedPx: NAV_CARD_COLLAPSED_PX
    })
    const shift = navMain == null ? 0 : footerSidebarShift({ current: navMain, target: intent.target, overlay: false })
    if (clientWidth <= 0) return null
    // —— 计算 ——
    const { padL, padR, gapX } = rowStyle.current.style
    lastInner.current = clientWidth - padL - padR
    lastShift.current = shift
    lastOverflow.current = leftW + gapX + rightW - (clientWidth - padL - padR)
    // 显示层：左组此刻被裁就挂 data-footer-clipped（尾部渐隐，FOOTER_LEFT_CLIP_FADE）；只是属性，不影响布局 / 选级
    row.toggleAttribute("data-footer-clipped", lastOverflow.current > FOOTER_SUBPIXEL_PX)
    const st = state.current
    const before = st.stepsUsed
    const next = footerDecide(st, {
      cur: stepRef.current,
      // 侧栏正在收展 / 目标态已变：按落定后的宽度选级（见 footerTargetInner）。
      rowInner: footerTargetInner(clientWidth - padL - padR, shift, intent.ahead),
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
    // 闸门（footerResizeGate）：一串 RO 的第一下、以及串内与宽度走向相反的换级先不提交，
    // 由尾随复核（最后一下 RO 之后两帧）按落定的宽度再判一次。被闸住的那一两帧左组只被裁切壳裁，不折行、右组不动。
    let lastRoAt = -Infinity
    let tail = 0
    const schedTail = () => {
      if (tail) cancelAnimationFrame(tail)
      tail = requestAnimationFrame(() => {
        tail = requestAnimationFrame(() => {
          tail = 0
          state.current.stepsUsed = 0
          const prevInner = lastInner.current
          const cur = stepRef.current
          const next = decide()
          if (!next) return
          // 宽度还在变（窗口这一帧又动了，侧栏收展可能还没开始）：交给随后的 RO；侧栏正把聊天区推宽 / 即将收起：只升不降。
          if (prevInner != null && Math.abs((lastInner.current ?? 0) - prevInner) > FOOTER_SUBPIXEL_PX) return
          if (lastShift.current > 0 && footerStepIndex(next) > footerStepIndex(cur)) return
          commit(next, false)
        })
      })
    }
    const ro = new ResizeObserver(() => {
      const now = performance.now()
      const sinceLastMs = now - lastRoAt
      lastRoAt = now
      const prevInner = lastInner.current
      const cur = stepRef.current
      state.current.stepsUsed = 0
      const next = decide()
      schedTail()
      if (!next) return
      const gate = footerResizeGate({
        cur,
        next,
        inner: lastInner.current ?? 0,
        lastInner: prevInner,
        sinceLastMs,
        shift: lastShift.current,
        overflow: lastOverflow.current
      })
      if (gate === "commit") commit(next, true)
    })
    ro.observe(row)
    ro.observe(left)
    ro.observe(right)
    // 侧栏状态一变（点开关 / 跨窄窗断点自动收展，store 里先变、DOM 后变）就按新目标判一次：
    // 要挤窄时动画第一帧前就落到终态级，左组不越出裁切壳。订阅 store 而不是盯 DOM 节点（浮层切换会换父节点重挂，leo S5）。
    const unsub = useChatStore.subscribe((s, prev) => {
      if (s.sidebarCollapseState === prev.sidebarCollapseState) return
      const cur = stepRef.current
      state.current.stepsUsed = 0
      const next = decide()
      schedTail()
      if (!next) return
      if (lastShift.current < 0 || footerStepIndex(next) < footerStepIndex(cur)) commit(next, true)
    })
    return () => {
      ro.disconnect()
      unsub()
      if (tail) cancelAnimationFrame(tail)
    }
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
        const cur = stepRef.current
        const next = decide()
        if (!next) return
        // 侧栏正把聊天区推宽时只升不降（同 RO 闸门），否则字形补载正好落在动画头几帧会画出一次反向降级。
        if (lastShift.current > 0 && footerStepIndex(next) > footerStepIndex(cur)) return
        commit(next, false)
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
