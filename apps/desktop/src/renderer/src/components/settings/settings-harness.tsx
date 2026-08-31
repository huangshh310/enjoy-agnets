/**
 * Settings → Agent：本机 ToolLoop 与 Claude Code Harness（Vercel Sandbox）切换。
 */
import { useQueryClient } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SettingsHarnessCredentials } from "./settings-harness-credentials"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"

export function SettingsHarness() {
  const queryClient = useQueryClient()
  const runtime = useSettingsSnapshot().data?.preferences.codingRuntime ?? "local"

  async function onRuntimeChange(value: "local" | "harness") {
    await patchPreferences({ codingRuntime: value })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsCard title="Coding runtime">
      <SettingsRow
        title="Runtime"
        description="Local uses Enjoy tools in this folder. Harness runs Claude Code inside a Vercel Sandbox."
      >
        <Select value={runtime} onValueChange={(value) => void onRuntimeChange(value as typeof runtime)}>
          <SelectTrigger className="min-w-[12rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local (ToolLoop)</SelectItem>
            <SelectItem value="harness">Claude Code (Harness)</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsHarnessCredentials />
    </SettingsCard>
  )
}
