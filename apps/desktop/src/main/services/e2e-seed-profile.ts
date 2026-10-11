/**
 * stub 夹具档案按「名 + 类型」复用。upsertProfile 只拿 id 找旧档，找不到就新发随机 id；
 * 不复用时同一 userData 每重启一次多两条档案、activeId / defaultRoute.profileId 跟着漂，
 * 重启后的首发与第一次启动走的不是同一条路线（jojo 复测 userData 里攒了 8 条）。
 */
export type SeedProfileRow = { id: string; name: string; kind: string }

export function existingSeedProfileId(
  profiles: readonly SeedProfileRow[],
  want: { name: string; kind: string }
): string | undefined {
  return profiles.find((row) => row.name === want.name && row.kind === want.kind)?.id
}
