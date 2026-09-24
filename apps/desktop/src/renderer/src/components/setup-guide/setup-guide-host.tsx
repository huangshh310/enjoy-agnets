/**
 * 挂在应用壳上：决定何时打开，并画出引导。
 */
import { SetupGuideDialog } from "./setup-guide-dialog"
import { useSetupGuide } from "./use-setup-guide"

export function SetupGuideHost() {
  useSetupGuide()
  return <SetupGuideDialog />
}
