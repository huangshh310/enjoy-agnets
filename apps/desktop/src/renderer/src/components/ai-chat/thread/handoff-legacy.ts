/**
 * 交接切点：切点当时及之前的气泡算上一引擎记录。
 */
export function isLegacyHandoffTurn(createdAt: number, cutAt: number | undefined): boolean {
  return cutAt != null && createdAt <= cutAt
}
