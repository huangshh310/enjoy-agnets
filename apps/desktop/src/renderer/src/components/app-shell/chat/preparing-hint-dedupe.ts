/**
 * 灰条「上一条还在准备」在时，「正在准备…」小字不再叠一层（luna 3cf0）。
 * 哪个会话画小字由 #150 的 hooks/preparing-hint-visible 决定，这里只管去重。
 */
import { PREVIOUS_STILL_PREPARING } from "../../../lib/usage/classify-thread-error.ts"

export function railAlreadySaysPreparing(error: string | null | undefined): boolean {
  return error === PREVIOUS_STILL_PREPARING
}
