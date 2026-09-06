/**
 * Settings → Agent：本机 CLI 工具箱 + 进阶沙箱 + 作曲器默认值。
 */
import { AgentToolsCommandHub } from "./agent-tools/agent-tools-command-hub"
import { AgentToolsPage } from "./agent-tools/agent-tools-page"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
export function AgentSettings() {
  return (
    <div className="flex flex-col gap-6">
      <AgentToolsCommandHub />
      <AgentToolsPage />
      <SettingsHarness />
      <SettingsDefaults />
    </div>
  )
}
