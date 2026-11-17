/**
 * 运行时量状态栏 top、表单高、验收框底与对话区，算 slot；slot < 108 才转横向单行条。
 * 不用 max-height 媒体查询当开关：同 480 高无验收时并不缺位。
 * 没有验收框时另有两路兜底（OR）：K12 squeeze（Composer 外壳放不下）与审批裁切（审批 footer 被对话外壳裁到，
 * composer-tray-approval-clip.ts）。审批裁切只读 DOM 几何；对话列地板复用下面同一次 computed min-height 读数。
 * 446 刀：编排在 composer-cluster-yield.ts 的 stepTrayBudget（slot 期 K12 照常、slot 释放同帧交接、帽檐 rail 让位）；
 * 这里只读 DOM（send / stop 底、rail 与帽檐框、size 容器高）并只读订阅 followups / 附件（不写 store）。
 * 判定与布局同任务（leo M4′）：
 * - T2：hook 不订阅的 store 驱动的验收框（ComposerLiveChanges）用 MutationObserver（只 childList）在提交后的微任务里重测，
 *   翻转时 flushSync；验收框与帽檐框内部变高由现有 RO 兜；
 * - T1（提交时 layout effect 重测）按 V1 变异删掉：删后全矩阵 e2e 与行为单测全绿，不留死代码；
 *   rail 出现 / 消失、附件数变都会改帽檐框 / 托盘尺寸，由 RO 在同一 rendering 的绘制前判；
 * - 订阅回调不再 measure（它先于 React 提交，读到的是旧 DOM）；G1 输出不变不 setState，G2 每帧 T2 重测 ≤2 次。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"
import { readStatusBarTop } from "./composer-tray-leftover.ts"
import {
  admitTrayRemeasure,
  clusterYieldLatchBoxPx,
  followupRailWouldRender,
  hintRowPx,
  stepTrayBudget,
  TRAY_BUDGET_STATE_OFF,
  trayBudgetCommit,
  sameTrayBudget,
  type TrayBudgetMeasurement,
  type TrayBudgetState,
  type TrayHandover
} from "./composer-cluster-yield.ts"
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
  /** 446 P1-a：条带已画仍越线时帽檐 rail（「下一句」等）让位。 */
  hintYield: boolean
  /** 让位后仍越线的 px（data-cluster-residual，主路径必须 0）。 */
  residualPx: number
  /** rail 本来要画（followupRailWouldRender，data-cluster-hint）。 */
  hintPresent: boolean
  /** slot 释放 / 审批消失时条带由谁接手（data-tray-handover）。 */
  handover: TrayHandover
}

export const IDLE_COMPOSER_TRAY_BUDGET: ComposerTrayBudget = {
  strip: false,
  reclaimSlack: false,
  slot: null,
  squeezed: false,
  approvalClip: false,
  hintYield: false,
  residualPx: 0,
  hintPresent: false,
  handover: null
}

const sameBudget = sameTrayBudget

/** T2 只观察 childList（leo M4′-3）：不开 subtree / attributes / characterData，hook 自己的提交不会自触发。 */
export const REVIEW_FRAME_MUTATION_OPTIONS: MutationObserverInit = { childList: true }

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
  // K12 squeeze / 审批裁切 / 交接长回量（stepTrayBudget 的状态）。
  const stateRef = useRef<TrayBudgetState>(TRAY_BUDGET_STATE_OFF)
  // 只读订阅：审批出现 / 消失时重跑 effect，把 dock 挂进 RO（dock 挂载时对话列尺寸可能不变）。
  const hasApproval = useChatStore((state) => state.pendingApproval != null)
  // 只读：rail 谓词按会话判（leo M1）。
  const sessionId = useChatStore((state) => state.sessionId)
  // 主 effect 写入的同一个 measure（不重建 RO）；G2 计数（rAF 复位）。
  const measureRef = useRef<((sync?: boolean) => void) | null>(null)
  const remeasureRef = useRef({ count: 0, resetScheduled: false })
  const remeasure = (sync: boolean) => {
    const gate = remeasureRef.current
    const admitted = admitTrayRemeasure(gate.count)
    if (!admitted.admit) return
    gate.count = admitted.count
    if (!gate.resetScheduled && typeof requestAnimationFrame !== "undefined") {
      gate.resetScheduled = true
      requestAnimationFrame(() => {
        gate.count = 0
        gate.resetScheduled = false
      })
    }
    measureRef.current?.(sync)
  }
  const remeasureRefFn = useRef(remeasure)
  remeasureRefFn.current = remeasure

  useLayoutEffect(() => {
    if (!args.enabled) {
      stateRef.current = TRAY_BUDGET_STATE_OFF
      if (!sameBudget(budgetRef.current, IDLE_COMPOSER_TRAY_BUDGET)) setBudget(IDLE_COMPOSER_TRAY_BUDGET)
      return
    }
    // 附件数只作审批裁切长回量的失效键；只读订阅，effect 清理时退订。
    let attachCount = listComposerAssets().length

    // sync：RO 回调（布局后、绘制前）、resize 回调与 T2 MO 回调里，React 会把非离散事件的 setState 排到绘制之后（晚一帧）。
    // 条带 / 审批裁切 / 让位任一翻转时 flushSync，让判定在同一帧绘制前提交（C3 / C11 / leo M4′）；
    // layout effect（首测）里一律非 sync（普通 setState 已在绘制前同步提交）。
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
      // 没有验收框时的兜底：只看 Composer 外壳（表单的父级）自己内容放不放得下。
      const shell = form.parentElement
      // 审批裁切：裁切线 = 对话外壳（chat-conversation 的父级），不是对话列本身。
      let clipMeasure: TrayBudgetMeasurement["clip"] = null
      if (conv) {
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
        clipMeasure = {
          footerBottom: visibleBottom(footer),
          clipBottom: clipBox && clipBox.height > 0 ? clipBox.bottom : null,
          clipH: clipBox && clipBox.height > 0 ? clipBox.height : null,
          contentNeedPx
        }
      }
      // 帽檐 rail：让出量（luna R1 / leo M8）——rail 是框里唯一可见子项时整框（rect 高 + computed mb），否则子行高。
      const rail = shell?.querySelector("[data-composer-followup-rail]") ?? null
      const railBox = rail ? rail.getBoundingClientRect() : null
      let rowPx: number | null = null
      if (rail && railBox && railBox.height > 0) {
        const capFrame = rail.parentElement
        const sole = capFrame
          ? Array.from(capFrame.children).every((child) => child === rail || child.getBoundingClientRect().height <= 0)
          : false
        rowPx = capFrame
          ? hintRowPx({
              railPx: railBox.height,
              framePx: capFrame.getBoundingClientRect().height,
              frameMarginBottomPx: Number.parseFloat(getComputedStyle(capFrame).marginBottom),
              sole
            })
          : railBox.height
      }
      const step = stepTrayBudget(stateRef.current, prev, {
        slot: {
          statusBarTop: readStatusBarTop(document),
          viewportHeight: window.innerHeight,
          formHeight: form.getBoundingClientRect().height,
          frameBottom: visibleBottom(frame),
          conversationHeight: convHeight,
          conversationFloor: convFloor
        },
        shell: shell
          ? { contentPx: shell.scrollHeight, boxPx: shell.clientHeight, heightPx: shell.getBoundingClientRect().height }
          : null,
        conv: convHeight != null && convFloor != null ? { heightPx: convHeight, floorPx: convFloor } : null,
        clip: clipMeasure,
        attachCount,
        actions: {
          sendBottom: visibleBottom(form.querySelector('[data-testid="composer-send"]')),
          stopBottom: visibleBottom(form.querySelector('[data-testid="composer-stop"]'))
        },
        hint: { present: followupRailWouldRender(sessionId, hasApproval), rowPx },
        latchBoxPx: clusterYieldLatchBoxPx(conv)
      })
      stateRef.current = step.state
      const next: ComposerTrayBudget = step.budget
      const commit = trayBudgetCommit(prev, next, sync)
      if (commit === "flush") flushSync(() => setBudget(next))
      else if (commit === "set") setBudget(next)
    }

    measureRef.current = measure
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
    // 验收框与帽檐框内部变高（非 childList，例如文件列表展开）由现有 RO 兜（leo M4′-3）。
    const shellEl = form?.parentElement ?? null
    const capFrame = shellEl?.querySelector("[data-composer-cap-frame]") ?? null
    if (observer && capFrame) observer.observe(capFrame)
    const reviewFrameOf = () => shellEl?.querySelector('[data-testid="composer-review-frame"]') ?? null
    let reviewFrame = reviewFrameOf()
    if (observer && reviewFrame) observer.observe(reviewFrame)
    // T2：验收框内容 null ↔ 有（ComposerLiveChanges，由 hook 不订阅的 changes / messages 驱动）与验收框挂载 / 卸载。
    const mutations =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            const current = reviewFrameOf()
            if (current !== reviewFrame) {
              if (reviewFrame) observer?.unobserve(reviewFrame)
              reviewFrame = current
              if (reviewFrame) {
                mutations?.observe(reviewFrame, REVIEW_FRAME_MUTATION_OPTIONS)
                observer?.observe(reviewFrame)
              }
            }
            remeasureRefFn.current(true)
          })
    if (mutations && shellEl) mutations.observe(shellEl, REVIEW_FRAME_MUTATION_OPTIONS)
    if (mutations && reviewFrame) mutations.observe(reviewFrame, REVIEW_FRAME_MUTATION_OPTIONS)
    window.addEventListener("resize", syncMeasure)
    // 附件订阅只记数并作废交接长回量，不 measure（leo M4′-1）；托盘随附件变高 / 变矮由 RO 重测。
    const unsubscribe = subscribeComposerAssets((items) => {
      if (items.length === attachCount) return
      attachCount = items.length
      stateRef.current = { ...stateRef.current, handoverRegrow: null }
    })
    return () => {
      observer?.disconnect()
      mutations?.disconnect()
      window.removeEventListener("resize", syncMeasure)
      unsubscribe()
      if (measureRef.current === measure) measureRef.current = null
    }
  }, [args.enabled, args.formRef, args.trayRef, hasApproval, sessionId])

  return budget
}
