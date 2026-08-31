# spec/window

> 无边框桌面窗：系统按钮在渲染进程，操作在主进程。最后更新：2026-08-31

## 当前真相

`BrowserWindow` 配置（`apps/desktop/src/main/index.ts`）：

- `frame: false`、`transparent: true`、`hasShadow: false`
- `backgroundColor: "#00000000"`
- 默认 1440×920，最小 1100×720
- `autoHideMenuBar: true`

路由根用 `WindowFrame` 包一层：外框 `rounded-2xl` + `border-border-button-default` + `bg-background-full`；顶栏 `WindowTitleBar`（高 36px）；内容区可选择文本。

标题栏：

- 整条 `-webkit-app-region: drag`，双击切换最大化
- 品牌区与窗口按钮 `no-drag`
- 按钮：最小化 / 最大化·还原 / 关闭（Remix 图标，关闭 hover 用 error token）

IPC：`window.minimize` | `toggleMaximize` | `isMaximized` | `close`。最大化状态用 `window.maximized-changed` 推送，renderer 另听 `resize` 做一次校对。

## 不变量

- 窗口控制不经过业务 agent 频道。preload 的 `ide.window` 是唯一入口。
- 可点击控件必须 `no-drag`，否则 Windows 上点不中。
- 最大化时外框圆角仍在 CSS 里；若以后要贴边去圆角，改 `WindowFrame` 而不是把 `frame: true` 开回去。
- 不要引入第二套原生标题栏或 OS caption overlay（除非补一份新 spec）。

## 代码入口

- 创建窗口：`apps/desktop/src/main/index.ts`
- IPC：`apps/desktop/src/main/ipc.ts`、`packages/ipc-contract/src/window.ts`
- UI：`apps/desktop/src/renderer/src/components/layout/window-frame.tsx`、`window-title-bar.tsx`
- 调用：`apps/desktop/src/renderer/src/lib/window-control.ts`

## 已知坑

- `transparent: true` + 无阴影时，圆角靠渲染层边框才能看见。改背景色不要用纯黑，用 `background-full`。
- 在 drag 区域里放输入框 / 下拉必须单独标 `no-drag`，否则无法聚焦。
- macOS `activate` 会在无窗时重建窗口；IPC 必须能重新 `registerIpc`（先 `unregister` 或靠守卫）。
