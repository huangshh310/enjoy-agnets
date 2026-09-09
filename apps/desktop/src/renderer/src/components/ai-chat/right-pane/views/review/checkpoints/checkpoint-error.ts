/**
 * 检查点还原错误码翻成界面文案。
 */
import type { TranslateFn } from "@renderer/i18n"

export function checkpointErrorMessage(raw: string, t: TranslateFn): string {
  if (raw.includes("CHECKPOINT_REF_INVALID")) return t("chat.reviewCheckpointRefInvalid")
  if (raw.includes("CHECKPOINT_NOT_FOUND")) return t("chat.reviewCheckpointNotFound")
  if (raw.includes("CHECKPOINT_RESTORE_FAILED")) return t("chat.reviewCheckpointRestoreFailed")
  return t("chat.reviewCheckpointRestoreFailed")
}
