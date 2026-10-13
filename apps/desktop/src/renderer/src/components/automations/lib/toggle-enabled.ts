/**
 * 列表开关：只走 automations.setEnabled，不发整条 upsert（旧的空说明记录也能暂停，leo #151）。
 * 失败不吞：交给 onError 出 toast。
 */
export type ToggleEnabledIde = {
  setEnabled: (input: { id: string; enabled: boolean }) => Promise<unknown>
}

export async function toggleAutomationEnabled(
  ide: ToggleEnabledIde,
  id: string,
  enabled: boolean,
  onError: (message: string) => void
): Promise<boolean> {
  try {
    await ide.setEnabled({ id, enabled })
    return true
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error))
    return false
  }
}
