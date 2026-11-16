/**
 * 运行时量状态栏 top、表单高、验收框底与对话区，算 slot；slot < 108 才转横向单行条。
 * 不用 max-height 媒体查询当开关：同 480 高无验收时并不缺位。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { readStatusBarTop, shouldUseTrayStrip, trayStripSlot } from "./composer-tray-leftover.ts"
import { nextTraySqueeze, TRAY_SQUEEZE_OFF, type TraySqueeze } from "./composer-tray-squeeze.ts"

export type ComposerTrayBudget = {
  /** 横向单行条 + mb=0。 */
  strip: boolean
  /** 单行条时表单收回垂直余量（同一开关，不另判）。 */
  reclaimSlack: boolean
  /** 最近一次 slot（取整），没有验收框时为 null。只用于 data 属性与排查。 */
  slot: number | null
  /** 没有验收框、但 Composer 外壳被挤到内容放不下时（composer-tray-squeeze.ts）。 */
  squeezed: boolean
}

export const IDLE_COMPOSER_TRAY_BUDGET: ComposerTrayBudget = {
  strip: false,
  reclaimSlack: false,
  slot: null,
  squeezed: false
}

function sameBudget(a: ComposerTrayBudget, b: ComposerTrayBudget): boolean {
  return a.strip === b.strip && a.reclaimSlack === b.reclaimSlack && a.slot === b.slot && a.squeezed === b.squeezed
}

function visibleBottom(el: Element | null): number | null {
  if (!el) return null
  const box = el.getBoundingClientRect()
  return box.height > 0 ? box.bottom : null
}

export function useComposerTrayBudget(args: {
  enabled: boolean
  formRef: RefObject<HTMLElement | null>
  trayRef: RefObject<HTMLElement | null>
}): ComposerTrayBudget {
  const [budget, setBudget] = useState<ComposerTrayBudget>(IDLE_COMPOSER_TRAY_BUDGET)
  const budgetRef = useRef(budget)
  budgetRef.current = budget
  const squeezeRef = useRef<TraySqueeze>(TRAY_SQUEEZE_OFF)

  useLayoutEffect(() => {
    if (!args.enabled) {
      squeezeRef.current = TRAY_SQUEEZE_OFF
      if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) setBudget(IDLE_COMPOSER_TRAY_BUDGET)
      return
    }

    const measure = () => {
      const form = args.formRef.current
      if (!form || typeof window === "undefined") {
        if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) setBudget(IDLE_COMPOSER_TRAY_BUDGET)
        return
      }
      const frame = form.parentElement?.querySelector('[data-testid="composer-review-frame"]') ?? null
      const conv = document.querySelector('[data-testid="chat-conversation"]')
      const convHeight = conv ? conv.getBoundingClientRect().height : null
      const convFloor = conv ? Number.parseFloat(getComputedStyle(conv).minHeight) : null
      const prev = budgetRef.current
      const slot = trayStripSlot({
        statusBarTop: readStatusBarTop(document),
        viewportHeight: window.innerHeight,
        formHeight: form.getBoundingClientRect().height,
        slackApplied: prev.reclaimSlack,
        frameBottom: visibleBottom(frame),
        conversationHeight: convHeight,
        conversationFloor: convFloor
      })
      // 没有验收框时的兜底：只看 Composer 外壳（表单的父级）自己内容放不放得下。
      const shell = form.parentElement
      if (slot == null && shell) {
        const slack = convHeight != null && convFloor != null && Number.isFinite(convFloor) ? convHeight - convFloor : 0
        squeezeRef.current = nextTraySqueeze(squeezeRef.current, {
          contentPx: shell.scrollHeight,
          boxPx: shell.clientHeight,
          conversationSlackPx: slack
        })
      } else {
        squeezeRef.current = TRAY_SQUEEZE_OFF
      }
      const squeezed = squeezeRef.current.on
      const strip = shouldUseTrayStrip(slot) || squeezed
      const next: ComposerTrayBudget = {
        strip,
        reclaimSlack: strip,
        slot: slot == null ? null : Math.round(slot),
        squeezed
      }
      if (!sameBudget(prev, next)) setBudget(next)
    }

    measure()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    const form = args.formRef.current
    const tray = args.trayRef.current
    const conv = document.querySelector('[data-testid="chat-conversation"]')
    if (observer && form) observer.observe(form)
    if (observer && tray) observer.observe(tray)
    if (observer && conv) observer.observe(conv)
    if (observer && form?.parentElement) observer.observe(form.parentElement)
    window.addEventListener("resize", measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [args.enabled, args.formRef, args.trayRef])

  return budget
}
