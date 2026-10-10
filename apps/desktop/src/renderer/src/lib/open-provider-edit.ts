/**
 * 打开某一档案的编辑抽屉，焦点落在密钥框。不要只跳供应商列表。
 */
export const PROVIDER_EDIT_FOCUS_KEY = "key"

export function providerEditSearch(id: string, from?: string): { edit: string; focus: string; from?: string } {
  return from ? { edit: id, focus: PROVIDER_EDIT_FOCUS_KEY, from } : { edit: id, focus: PROVIDER_EDIT_FOCUS_KEY }
}
