/**
 * 运行中：停止常在；有草稿时停止 + 排队并排（E1 M3 · luna §1.4）——排队留最右发送位，停止紧挨左侧、间距 8。
 * 空闲：有草稿出发送，空草稿出禁用占位。空草稿运行中只出停止，仍占最右槽（不左移）。
 */
import { RiArrowUpLine, RiLoader4Line, RiStopLine } from "@remixicon/react"
import { composerActionButtons } from "@renderer/hooks/composer-submit-intent"
import { restopComposerRun } from "@renderer/hooks/composer-run-control"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useStopPhase, type StopPhaseView } from "@renderer/stores/stop-settle"

export function ComposerSendSplit({
  running,
  hasDraft,
  ready = true,
  onSend,
  onStop
}: {
  running: boolean
  hasDraft: boolean
  ready?: boolean
  onSend: () => void
  onStop: () => void
}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const stopPhase = useStopPhase(sessionId)
  if (stopPhase) return <SettlingStop phase={stopPhase} hasDraft={hasDraft} onRestop={() => restopComposerRun(sessionId)} />
  const buttons = composerActionButtons(running, hasDraft)
  if (buttons.paired) {
    return (
      <div className="flex shrink-0 items-center gap-2" data-testid="composer-action-pair">
        <button
          type="button"
          data-testid="composer-stop"
          aria-label={t("chat.stopRunEsc")}
          title={t("chat.stopRunEsc")}
          onClick={onStop}
          className={pairedStopClassName}
        >
          <RiStopLine className="size-5" aria-hidden />
        </button>
        <SendButton running={running} ready={ready} onSend={onSend} />
      </div>
    )
  }
  if (buttons.stop) {
    return (
      <button
        type="button"
        data-testid="composer-stop"
        aria-label={t("chat.stop")}
        title={t("chat.stopRunEsc")}
        onClick={onStop}
        className={sendClassName}
      >
        <RiStopLine className="size-5" aria-hidden />
      </button>
    )
  }
  if (buttons.send !== "none") return <SendButton running={running} ready={ready} onSend={onSend} />
  return (
    <button
      type="button"
      disabled
      data-testid="composer-send"
      aria-label={t("chat.send")}
      title={t("chat.send")}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default/80 text-foreground-icon-tertiary/40 transition-all cursor-not-allowed opacity-40 select-none"
    >
      <RiArrowUpLine className="size-5" aria-hidden />
    </button>
  )
}

/**
 * E1 M2 收尾态（luna §1.1 / §1.2）：停止钮留在原位（32px），收尾中转圈、aria-busy、不可点；
 * 卡住时恢复可点，aria / title「再停一次」。有草稿时排队位禁用、草稿不动；发送一律禁用到真正落定。
 */
function SettlingStop({ phase, hasDraft, onRestop }: { phase: Exclude<StopPhaseView, null>; hasDraft: boolean; onRestop: () => void }) {
  const t = useT()
  const stuck = phase === "stuck"
  const label = stuck ? t("chat.stopAgain") : t("chat.stopStopping")
  const stop = (
    <button
      type="button"
      data-testid="composer-stop"
      data-stop-phase={phase}
      aria-label={label}
      title={label}
      aria-busy={stuck ? undefined : true}
      disabled={!stuck}
      onClick={stuck ? onRestop : undefined}
      className={cx(hasDraft ? pairedStopClassName : sendClassName, !stuck && "cursor-default opacity-80 active:scale-100")}
    >
      {stuck ? <RiStopLine className="size-5" aria-hidden /> : <RiLoader4Line className="size-4 animate-spin" aria-hidden />}
    </button>
  )
  if (!hasDraft) return stop
  return (
    <div className="flex shrink-0 items-center gap-2" data-testid="composer-action-pair">
      {stop}
      <button
        type="button"
        disabled
        data-testid="composer-send"
        aria-label={t("chat.runtimeQueue")}
        title={label}
        className={cx(mutedSendClassName, "cursor-not-allowed opacity-40")}
      >
        <RiArrowUpLine className="size-5" aria-hidden />
      </button>
    </div>
  )
}

/** 有草稿：空闲是发送（submit），运行中是排队（button）；testid / aria 与现网同一颗。 */
function SendButton({ running, ready, onSend }: { running: boolean; ready: boolean; onSend: () => void }) {
  const t = useT()
  return (
    <button
      type={running ? "button" : "submit"}
      data-testid="composer-send"
      aria-label={running ? t("chat.runtimeQueue") : ready ? t("chat.send") : t("chat.sendNotReady")}
      title={running ? t("chat.runtimeQueuedHint") : ready ? t("chat.send") : t("chat.sendNotReady")}
      onClick={running ? onSend : undefined}
      className={ready ? sendClassName : mutedSendClassName}
    >
      <RiArrowUpLine className="size-5" aria-hidden />
    </button>
  )
}

/**
 * 亮色走主按钮 token（默认 accent-700 白图标，悬停 800；琥珀 500 墨色图标 + 700 描边，对白色输入框 5.05）。
 * 暗色输入框是深底，700 / 800 跟它几乎糊在一起（石墨灰 1.46），所以暗色换 500 底 + 近黑图标 on-accent-bright（图标 ≥ 3.8，按钮对输入框 ≥ 3）。
 * 不用 hover:brightness-110：白图标在 500 上琥珀只有 2.15。
 * 亮色不要 shadow-nav-selected：它在描边外再画一圈 1px accent-500（琥珀对 neutral-100 输入框 2.00、绿 2.37），最外圈只留 border-cta-edge。
 * 最外圈 = 1px border-send-edge：亮色 = cta-edge（琥珀 700、其它 800），暗色 accent-400（所有皮肤；手绘暗色靛蓝 #323755 上 500 只有 2.43），
 * 手绘亮色墨色 #1A1612（输入框是天空蓝渐变 #5caad4 → #569ac3，accent 边只有 1.53–2.83）。token 在 theme.css / skins/ink.css。底色不变。
 * Tab 焦点走全站统一的 focus-ring（theme.css @utility：2px --color-focus-ring + 2px 间隔，间隔色 = 输入框底 --focus-ring-offset）。
 */
const sendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-send-edge bg-cta text-cta-foreground shadow-none transition-all hover:bg-cta-hover active:scale-95 focus-ring dark:bg-accent-500 dark:text-on-accent-bright dark:hover:bg-accent-400"

const mutedSendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-separator-border bg-background-secondary-default text-text-tertiary transition-all hover:text-text-primary focus-ring"

/**
 * 并排时的停止：32px 描边圆钮（1px 分隔线描边、主背景、主图标色，悬停淡 warn 底），
 * 不做成第二颗填充 CTA，避免「两个发送」（luna §1.4）。
 */
const pairedStopClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-separator-border bg-background-primary-default text-text-primary transition-all hover:bg-status-yellow-background/40 active:scale-95 focus-ring"
