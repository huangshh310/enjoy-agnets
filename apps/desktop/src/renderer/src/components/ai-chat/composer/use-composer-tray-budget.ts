/**
 * 量测状态栏 top、托盘顶与表单/发送，算出托盘 leftover 与是否收回表单余量。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import {
  EXPANDED_TRAY_COMFORT_PX,
  FORM_SLACK_PX,
  TRAY_CHROME_COMFORT,
  TRAY_CHROME_TIGHT,
  capTrayHeight,
  galleryMaxHeightPx,
  leftoverAtNaturalFormHeight,
  preferredTrayBudget,
  readStatusBarTop,
  shouldReclaimFormSlack,
  shouldTightenTrayChrome,
  statusBarBottomEdge,
  trayLeftoverPx
} from "./composer-tray-leftover.ts"

export type ComposerTrayBudget = {
  reclaimSlack: boolean
  trayMaxHeight: number | null
  galleryMaxHeight: number | null
  tightenChrome: boolean
}

export const IDLE_COMPOSER_TRAY_BUDGET: ComposerTrayBudget = {
  reclaimSlack: false,
  trayMaxHeight: null,
  galleryMaxHeight: null,
  tightenChrome: false
}

function sameBudget(a: ComposerTrayBudget, b: ComposerTrayBudget): boolean {
  return (
    a.reclaimSlack === b.reclaimSlack &&
    a.trayMaxHeight === b.trayMaxHeight &&
    a.galleryMaxHeight === b.galleryMaxHeight &&
    a.tightenChrome === b.tightenChrome
  )
}

export function useComposerTrayBudget(args: {
  enabled: boolean
  formRef: RefObject<HTMLElement | null>
  trayRef: RefObject<HTMLElement | null>
  titleRef: RefObject<HTMLElement | null>
}): ComposerTrayBudget {
  const [budget, setBudget] = useState<ComposerTrayBudget>(IDLE_COMPOSER_TRAY_BUDGET)
  const budgetRef = useRef(budget)
  budgetRef.current = budget
  const naturalRef = useRef(EXPANDED_TRAY_COMFORT_PX)

  useLayoutEffect(() => {
    if (!args.enabled) {
      if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) {
        setBudget(IDLE_COMPOSER_TRAY_BUDGET)
      }
      return
    }

    const measure = () => {
      const form = args.formRef.current
      const tray = args.trayRef.current
      if (!form || !tray || typeof window === "undefined") {
        if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) {
          setBudget(IDLE_COMPOSER_TRAY_BUDGET)
        }
        return
      }
      const bottomEdge = statusBarBottomEdge({
        statusBarTop: readStatusBarTop(document),
        viewportHeight: window.innerHeight
      })
      const trayBox = tray.getBoundingClientRect()
      const formBox = form.getBoundingClientRect()
      const send = form.querySelector("[data-testid=composer-send]")
      const sendBox = send?.getBoundingClientRect()
      const sendOffset = sendBox ? formBox.bottom - sendBox.bottom : 0
      const prev = budgetRef.current
      const leftoverCurrent = trayLeftoverPx({
        bottomEdge,
        trayTop: trayBox.top,
        formHeight: formBox.height,
        sendOffsetFromFormBottom: sendOffset
      })
      const leftoverNatural = leftoverAtNaturalFormHeight({
        leftoverWithCurrentForm: leftoverCurrent,
        slackApplied: prev.reclaimSlack
      })
      const reclaimSlack = shouldReclaimFormSlack(leftoverNatural)
      // 本帧若刚打开余量，表单高还没落下；用自然 leftover + 余量预估。
      const leftoverAfterSlack = reclaimSlack ? leftoverNatural + FORM_SLACK_PX : leftoverNatural
      const title = args.titleRef.current
      const titleBarHeight = title ? title.getBoundingClientRect().height : 28
      const budgetPx = preferredTrayBudget(leftoverAfterSlack, { titleBarHeight })

      if (prev.trayMaxHeight == null) {
        naturalRef.current = Math.max(trayBox.height, tray.scrollHeight)
      } else {
        naturalRef.current = Math.max(naturalRef.current, tray.scrollHeight)
      }
      const trayMaxHeight = capTrayHeight(naturalRef.current, budgetPx)
      const tightenChrome = shouldTightenTrayChrome(trayMaxHeight)
      const galleryMaxHeight =
        trayMaxHeight != null
          ? galleryMaxHeightPx({
              trayBudget: trayMaxHeight,
              titleBarHeight,
              chrome: tightenChrome ? TRAY_CHROME_TIGHT : TRAY_CHROME_COMFORT
            })
          : null
      const next: ComposerTrayBudget = {
        reclaimSlack,
        trayMaxHeight,
        galleryMaxHeight,
        tightenChrome
      }
      if (!sameBudget(prev, next)) setBudget(next)
    }

    measure()
    const form = args.formRef.current
    const tray = args.trayRef.current
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    if (observer && form) observer.observe(form)
    if (observer && tray) observer.observe(tray)
    window.addEventListener("resize", measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [args.enabled, args.formRef, args.trayRef, args.titleRef])

  return budget
}
