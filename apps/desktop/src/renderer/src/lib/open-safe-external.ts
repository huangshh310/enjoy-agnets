/**
 * renderer 外链出口：只走 window.openExternal（main 再闸 http(s)）。
 */
import { getIde, hasIde } from "./ide"

/** 失败回 `{ ok: false, code }` 或 reject 都吞掉，不 toast。 */
export function requestOpenExternalQuiet(url: string): void {
  if (!hasIde()) return
  void getIde()
    .window.openExternal({ url })
    .then(
      () => undefined,
      () => undefined
    )
}
