/** skipped 不当失败；只有 failed 累加。 */
export function nextConsecutiveFails(
  current: number | undefined,
  status: "ok" | "failed" | "skipped"
): number {
  return status === "failed" ? (current ?? 0) + 1 : 0
}
