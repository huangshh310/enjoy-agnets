/**
 * P0 Composer 瘦身密度锁：单一芯片、Goal 不贴分段、注入一行、思考不占宽行。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreview(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-composer-slim.html")
    try {
      return readFileSync(candidate, "utf8")
    } catch {
      cursor = join(cursor, "..")
    }
  }
  throw new Error("p0-composer-slim.html 必须在仓内")
}

const chrome = readFileSync(join(dir, "composer-top-chrome.tsx"), "utf8")
const composer = readFileSync(join(dir, "../ai-chat-composer.tsx"), "utf8")
const footer = readFileSync(join(dir, "composer-footer.tsx"), "utf8")
const bar = readFileSync(join(dir, "host-inject/host-inject-bar.tsx"), "utf8")
const pickerView = readFileSync(join(dir, "../agent-picker/agent-picker-view.tsx"), "utf8")
const pickerFlyout = readFileSync(join(dir, "../agent-picker/composer-model-flyout.tsx"), "utf8")
const pickerHook = readFileSync(join(dir, "../agent-picker/use-agent-picker.ts"), "utf8")
const thinking = readFileSync(join(dir, "thinking/composer-thinking-chrome.tsx"), "utf8")
const preview = readPreview()

test("顶栏铬序是探索/执行分段，模型与思考下沉至底栏", () => {
  assert.ok(chrome.includes("<ExploreExecuteToggle"))
  assert.equal(chrome.includes("<ComposerModelChip"), false)
  assert.equal(chrome.includes("<SessionGoalChip"), false)
  assert.ok(footer.includes("<AgentPicker"))
  assert.ok(footer.includes("<ComposerThinkingChrome"))
})

test("底栏溢出收目标/阶段，不并排探索分段", () => {
  assert.ok(footer.includes("ComposerOverflowMenu"))
  assert.equal(footer.includes("SessionGoalChip"), false)
})

test("有内容的 Goal/Recap 走输入壳上沿轨，不进顶栏分段", () => {
  assert.ok(composer.includes("ComposerActivityFrame"))
  assert.equal(chrome.includes("ComposerContextRail"), false)
  assert.equal(chrome.includes("<SessionGoalChip"), false)
})

test("任务与改动在输入框上方独立轨，不进输入壳", () => {
  assert.ok(composer.includes("ComposerActivityFrame"))
  const shell = composer.slice(composer.indexOf("<form"), composer.indexOf("</form>"))
  assert.equal(shell.includes("ComposerActivityFrame"), false)
  assert.equal(shell.includes("ComposerLiveChanges"), false)
})

test("引擎芯片面上不挂 UsagePill，点击落在 button 上", () => {
  const trigger = pickerView.slice(pickerView.indexOf("<PopoverTrigger"), pickerView.indexOf("</PopoverTrigger>"))
  assert.equal(trigger.includes("<UsagePill"), false)
  assert.match(trigger, /<PopoverTrigger asChild>\s*<button/)
  assert.ok(pickerHook.includes("useQuotaHint"))
  assert.ok(pickerFlyout.includes("<UsagePill"))
  assert.ok(pickerView.includes('data-testid="composer-engine-chip"'))
})

test("思考跟模型打开同一份 Picker，不另开模型芯片", () => {
  assert.ok(thinking.includes("setAgentPickerOpen(true)"))
  assert.equal(thinking.includes("onOpenModels"), false)
  assert.ok(thinking.includes("compact"))
})

test("HostInject 空不画；表面无脚注墙与双管理链", () => {
  assert.ok(bar.includes("view.kind === \"hidden\""))
  assert.ok(bar.includes("host-inject-chip"))
  assert.equal(bar.includes("hostInjectManageMcp"), false)
  assert.equal(bar.includes("hostInjectManageSkills"), false)
  assert.equal(bar.includes("to: \"/mcp\""), false)
  assert.equal(bar.includes("to: \"/skills\""), false)
  const surface = bar.slice(0, bar.indexOf("HostInjectPopover"))
  assert.equal(surface.includes("hostInjectFootnote"), false)
})

test("瘦身预览锁住勿画反例", () => {
  assert.ok(preview.includes("【视觉真源】P0 Composer 输入区瘦身"))
  assert.ok(preview.includes("扩展 · MCP 2 · Skills 3"))
  assert.ok(preview.includes("设置目标"))
  assert.ok(preview.includes("strike"))
})
