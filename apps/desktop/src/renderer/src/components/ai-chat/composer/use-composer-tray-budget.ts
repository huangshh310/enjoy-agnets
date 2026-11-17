/**
 * 运行时量状态栏 top、表单高、验收框底与对话区，算 slot；slot < 108 才转横向单行条。
 * 不用 max-height 媒体查询当开关：同 480 高无验收时并不缺位。
 * 没有验收框时另有两路兜底（OR）：K12 squeeze（Composer 外壳放不下）与审批裁切（审批 footer 被对话外壳裁到，
 * composer-tray-approval-clip.ts）。审批裁切只读 DOM 几何；对话列地板复用下面同一次 computed min-height 读数。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"
import { readStatusBarTop, shouldUseTrayStrip, trayStripSlot } from "./composer-tray-leftover.ts"
import { nextTraySqueeze, TRAY_SQUEEZE_OFF, type TraySqueeze } from "./composer-tray-squeeze.ts"
import {
  nextTrayApprovalClip,
  refreshHandoverNeed,
  squeezeHandoverOnRelease,
  TRAY_APPROVAL_CLIP_OFF,
  trayStripFromPaths,
  type TrayApprovalClip
} from "./composer-tray-approval-clip.ts"
import { listComposerAssets, subscribeComposerAssets } from "@renderer/hooks/composer-assets"
import { useChatStore } from "@renderer/stores/chat-store"

export type ComposerTrayBudget = {
  /** 横向单行条 + mb=0。 */
  strip: boolean
  /** 单行条时表单收回垂直余量（同一开关，不另判）。 */
  reclaimSlack: boolean
  /** 最近一次 slot（取整），没有验收框时为 null。只用于 data 属性与排查。 */
  slot: number | null
  /** 没有验收框、但 Composer 外壳被挤到内容放不下时（composer-tray-squeeze.ts）。 */
  squeezed: boolean
  /** 没有验收框、审批 footer 被对话外壳裁到时（composer-tray-approval-clip.ts）。 */
  approvalClip: boolean
}

export const IDLE_COMPOSER_TRAY_BUDGET: ComposerTrayBudget = {
  strip: false,
  reclaimSlack: false,
  slot: null,
  squeezed: false,
  approvalClip: false
}

function sameBudget(a: ComposerTrayBudget, b: ComposerTrayBudget): boolean {
  return (
    a.strip === b.strip && a.reclaimSlack === b.reclaimSlack && a.slot === b.slot && a.squeezed === b.squeezed &&
    a.approvalClip === b.approvalClip
  )
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
  const clipRef = useRef<TrayApprovalClip>(TRAY_APPROVAL_CLIP_OFF)
  // 审批消失时交给 K12 的长回量（squeezeHandoverOnRelease）；K12 放掉 / 附件数变即清。
  const handoverRegrowRef = useRef<number | null>(null)
  // 只读订阅：审批出现 / 消失时重跑 effect，把 dock 挂进 RO（dock 挂载时对话列尺寸可能不变）。
  const hasApproval = useChatStore((state) => state.pendingApproval != null)

  useLayoutEffect(() => {
    if (!args.enabled) {
      squeezeRef.current = TRAY_SQUEEZE_OFF
      clipRef.current = TRAY_APPROVAL_CLIP_OFF
      handoverRegrowRef.current = null
      if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) setBudget(IDLE_COMPOSER_TRAY_BUDGET)
      return
    }
    // 附件数只作审批裁切长回量的失效键；只读订阅，effect 清理时退订。
    let attachCount = listComposerAssets().length

    // sync：RO 回调（布局后、绘制前）与 resize 回调里，React 会把非离散事件的 setState 排到绘制之后（晚一帧）。
    // 只有审批裁切这一路翻转时 flushSync，让判定在同一帧绘制前提交（C3）；#224 slot / K12 squeeze 时序不变。
    const measure = (sync = false) => {
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
        if (handoverRegrowRef.current != null && squeezeRef.current.on && prev.strip) {
          squeezeRef.current = {
            ...squeezeRef.current,
            needPx: refreshHandoverNeed(squeezeRef.current.needPx, shell.scrollHeight, handoverRegrowRef.current)
          }
        }
        squeezeRef.current = nextTraySqueeze(squeezeRef.current, {
          contentPx: shell.scrollHeight,
          boxPx: shell.clientHeight,
          conversationSlackPx: slack
        })
      } else {
        squeezeRef.current = TRAY_SQUEEZE_OFF
      }
      if (!squeezeRef.current.on) handoverRegrowRef.current = null
      // 审批裁切：裁切线 = 对话外壳（chat-conversation 的父级），不是对话列本身。
      if (slot == null && conv) {
        const clipShell = conv.parentElement
        const clipBox = clipShell ? clipShell.getBoundingClientRect() : null
        const footer = conv.querySelector('[data-testid="permission-dock"] article > footer')
        // 列内容压到最小后到 footer 底的需求（leo ②，只量 DOM）：footer 底 − 对话列顶 − 消息区可让出的高 − 审批卡可让出的高；
        // 可让出 = 该节点 rect 高 − 它自己的 computed min-height（同 K6 的读法），排队坞 / 「马上发」提示整块按实高计入、不写死行高。
        // 排队坞跨释放只可能「行模式 → 折叠」（useDockTight 只在列长高到 restoreAt 才回行模式，释放只会让列变矮），
        // 折叠态（一行）需求 ≤ 行模式，所以当前态实测即两态中较大的那个。
        const slackOf = (el: Element | null | undefined) => {
          if (!el) return 0
          const min = Number.parseFloat(getComputedStyle(el).minHeight)
          return Number.isFinite(min) ? Math.max(0, el.getBoundingClientRect().height - min) : 0
        }
        const footerBox = footer ? footer.getBoundingClientRect() : null
        const contentNeedPx =
          footerBox && footerBox.height > 0
            ? footerBox.bottom - conv.getBoundingClientRect().top - slackOf(conv.querySelector(":scope > [data-thread-root]")) - slackOf(footer?.parentElement)
            : null
        const before = clipRef.current
        clipRef.current = nextTrayApprovalClip(before, {
          footerBottom: visibleBottom(footer),
          clipBottom: clipBox && clipBox.height > 0 ? clipBox.bottom : null,
          clipH: clipBox && clipBox.height > 0 ? clipBox.height : null,
          floorPx: convFloor,
          contentNeedPx,
          clusterPx: shell ? shell.getBoundingClientRect().height : null,
          attachCount,
          stripApplied: prev.strip,
          stripHeldElsewhere: prev.strip && !before.on
        })
        // 审批消失（非几何释放）且条带已画：同一帧按释放后的布局代 K12 判一次，放不下就以 K12 态接手（不先画 108 再挤回）。
        if (before.on && !clipRef.current.on && !clipRef.current.releasedByGeometry && prev.strip && !squeezeRef.current.on && shell) {
          const handover = squeezeHandoverOnRelease({
            regrowPx: before.regrowUnknown ? null : before.regrowPx,
            contentPx: shell.scrollHeight,
            boxPx: shell.clientHeight,
            conversationSlackPx: convHeight != null && convFloor != null && Number.isFinite(convFloor) ? convHeight - convFloor : 0
          })
          if (handover) {
            squeezeRef.current = handover
            handoverRegrowRef.current = before.regrowPx
          }
        }
      } else {
        clipRef.current = TRAY_APPROVAL_CLIP_OFF
      }
      const squeezed = squeezeRef.current.on
      const approvalClip = clipRef.current.on
      const strip = trayStripFromPaths({ slotStrip: shouldUseTrayStrip(slot), slot, squeezed, approvalClip })
      const next: ComposerTrayBudget = {
        strip,
        reclaimSlack: strip,
        slot: slot == null ? null : Math.round(slot),
        squeezed,
        approvalClip
      }
      if (sameBudget(prev, next)) return
      if (sync && next.approvalClip !== prev.approvalClip) flushSync(() => setBudget(next))
      else setBudget(next)
    }

    measure()
    const syncMeasure = () => measure(true)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncMeasure)
    const form = args.formRef.current
    const tray = args.trayRef.current
    const conv = document.querySelector('[data-testid="chat-conversation"]')
    if (observer && form) observer.observe(form)
    if (observer && tray) observer.observe(tray)
    if (observer && conv) observer.observe(conv)
    if (observer && form?.parentElement) observer.observe(form.parentElement)
    // 审批裁切另观察：裁切外壳、它的 size 容器（列地板随容器高变）、审批 dock。
    const clipShell = conv?.parentElement ?? null
    if (observer && clipShell) observer.observe(clipShell)
    if (observer && clipShell?.parentElement) observer.observe(clipShell.parentElement)
    const dock = conv?.querySelector('[data-testid="permission-dock"]') ?? null
    if (observer && dock) observer.observe(dock)
    window.addEventListener("resize", syncMeasure)
    const unsubscribe = subscribeComposerAssets((items) => {
      if (items.length === attachCount) return
      attachCount = items.length
      handoverRegrowRef.current = null
      measure()
    })
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", syncMeasure)
      unsubscribe()
    }
  }, [args.enabled, args.formRef, args.trayRef, hasApproval])

  return budget
}
