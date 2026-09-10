/**
 * 排队项：立即纠偏、编辑回填引用、调序、删除。
 */
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiTimeLine } from "@remixicon/react"
import { queueComposerAsset } from "@renderer/hooks/composer-assets"
import { focusComposerEnd } from "@renderer/hooks/composer-focus"
import {
  editQueuedMessage,
  elevateToSteer,
  moveFollowup,
  takeFollowup,
  type FollowupItem
} from "@renderer/hooks/followup-queue"
import { setQuotedContexts } from "@renderer/hooks/quoted-context"
import { setComposerSkillChips } from "../mentions/composer-skill-chips.ts"
import { sendComposerMessage, steerPreparedText } from "@renderer/hooks/send-composer"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function FollowupRow({
  item,
  canMoveUp,
  canMoveDown
}: {
  item: FollowupItem
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-button-default/70 bg-background-secondary-default/90 px-2.5 py-1.5">
      <RiTimeLine className="size-3.5 shrink-0 text-accent-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption-1-regular text-text-secondary">{item.draft ?? item.prompt}</p>
        {item.quotedContexts?.length ? (
          <p className="truncate text-caption-2-regular text-text-tertiary">
            {item.quotedContexts.map((quote) => quote.title).join(" · ")}
          </p>
        ) : null}
      </div>
      <button type="button" className={iconClass} disabled={!canMoveUp} onClick={() => moveFollowup(item.id, -1)}>
        <RiArrowUpSLine className="size-3.5" aria-hidden />
        <span className="sr-only">{t("chat.runtimeMoveUp")}</span>
      </button>
      <button type="button" className={iconClass} disabled={!canMoveDown} onClick={() => moveFollowup(item.id, 1)}>
        <RiArrowDownSLine className="size-3.5" aria-hidden />
        <span className="sr-only">{t("chat.runtimeMoveDown")}</span>
      </button>
      <button type="button" className={actionClass} onClick={() => void elevateFollowup(item)}>
        {t("chat.runtimeSteerItem")}
      </button>
      <button type="button" className={actionClass} onClick={() => editFollowup(item)}>
        {t("chat.runtimeEditFollowup")}
      </button>
      <button
        type="button"
        aria-label={t("chat.runtimeRemoveFollowup")}
        onClick={() => takeFollowup(item.id)}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      >
        <RiCloseLine className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

const actionClass =
  "shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 text-caption-2-medium text-accent-500 hover:bg-accent-500/10"

const iconClass =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary disabled:cursor-default disabled:opacity-30"

async function elevateFollowup(item: FollowupItem) {
  const taken = elevateToSteer(item.id)
  if (!taken) return
  if (useChatStore.getState().running) {
    await steerPreparedText(taken.prompt)
    return
  }
  await sendComposerMessage({ content: taken.prompt, assets: taken.assets })
}

function editFollowup(item: FollowupItem) {
  const taken = editQueuedMessage(item.id)
  if (!taken) return
  useChatStore.getState().setComposer(taken.draft ?? taken.prompt)
  setQuotedContexts(taken.quotedContexts ?? [])
  setComposerSkillChips(taken.skillChips ?? [])
  for (const asset of taken.assets) queueComposerAsset(asset)
  focusComposerEnd()
}
