/**
 * 改动条出现条件：有写盘 path，或本轮正在跑。不要常驻空卡片。
 */

export function sessionReviewVisible(fileCount: number, running: boolean): boolean {
  return running || fileCount > 0
}
