/**
 * 缺 Key 机器错：闸已放行但解析密钥时才确定没有 Key。
 * 叶子文件，测试可直接 import，禁止把这句英文摊进 UI。
 */

export const MISSING_RUN_SECRET = "Add an API key in Settings before running an agent."

export function isMissingRunSecretError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Add an API key in Settings")
}
