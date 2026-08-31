# spec/settings

> 设置是路由，不是弹层。加载器页与设置同构。最后更新：2026-08-31

## 当前真相

TanStack Router + **Hash History**。根布局包 `WindowFrame`。

| Hash | 页面 | `contentWidth` |
|---|---|---|
| `#/` | Agent 工作区 | — |
| `#/settings/general` 等 | 设置分段 | `wide`（尤其 Providers） |
| `#/automations` | 自动化列表 | `stage` |
| `#/customize/instructions` | 用户说明；Skills / Rules 后续 | `article` |

设置分段 ID：`general` `appearance` `shortcuts` `providers` `agent` `workspace` `mcp` `git`。未完成的段标 `soon`，但导航仍要进页，不能做死按钮。

快捷键：`Ctrl+,` / `Cmd+,` → General；在 settings / automations / customize 上按 Escape → `#/`。

Providers 页是协议工厂（见 `providers` spec + visual-system §14）：顶部分段 Configured / Explore Presets，编辑走 Dialog 四页签（Connection / Models / Parameters / Overrides），不是页脚堆表单。

Automations 存 `settings` 表的 `automations` JSON。触发：`manual` / `on_save`。

## 不变量

- 侧栏条目必须 `navigate`，禁止 no-op。
- Providers 禁用 `article`（760px），目录三列会被裁。
- 设置行：标题 + 说明 + 右侧控件，放在内层 bordered card。
- 不要把 Codex `auth.json` / 原始 `config.toml` 编辑器当本页模型。

## 代码入口

- 路由：`apps/desktop/src/renderer/src/router.tsx`
- 分段目录：`apps/desktop/src/renderer/src/components/settings/settings-catalog.ts`
- 壳：`settings-shell.tsx`、`secondary-page-shell.tsx`
- 视觉细节：[../references/visual-system.md](../references/visual-system.md) §6 / §14

## 已知坑

- Customize 的 Skills / Rules 还是后续加载器（`.agents/skills`、项目规则）。页面可以先占位，文案不要写成已经扫描技能包。
- `mcp` / `git` 设置段多数是 soon：实现落地时同步改 catalog 的 `soon` 和本 spec。
