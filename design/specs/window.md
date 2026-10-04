# spec/window

> 无边框桌面窗：系统按钮在渲染进程，操作在主进程。最后更新：2026-10-04（macOS 菜单栏应用名是 Enjoy Agents；窗口按钮是左上角红绿灯）

## 当前真相

`BrowserWindow` 配置（`apps/desktop/src/main/index.ts`）：

- `frame: false`、`transparent: true`、`hasShadow: false`
- `backgroundColor: "#00000000"`。macOS 注入 `vibrancy: "fullscreen-ui"`。Windows **不要** `backgroundMaterial: "acrylic"`：acrylic 铺满矩形 HWND，CSS `rounded-2xl` 切不掉四角。磨砂只走 `WindowFrame` + `skins/glass.css`。
- 默认 1440×920，最小 1100×720
- `autoHideMenuBar: true`

路由根用 `WindowFrame` 包一层：外框 `rounded-2xl` + `border-border-button-default` + `bg-background-full`；最大化时 `rounded-none border-0` 贴边。`html` / `body` / `#root` 必须透明，否则四角会露出方底。顶栏 `WindowTitleBar`（高 36px）；内容区可选择文本。

标题栏：

- 整条 `-webkit-app-region: drag`，双击切换最大化
- 品牌区、辅助开关、窗口按钮 `no-drag`
- 品牌区：`AppMark`（16px `icon-small`）+ `AppWordmark`（enjoy / AGENT IDE），不是字母「E」圆或 lockup SVG。系统任务栏标题不改这行字标
- 窗口标题走 `BrowserWindow.setTitle`（Win 任务栏、macOS 程序坞窗口列表和调度中心、Linux 同一套）。Chat 有会话标题时用会话标题，否则用当前工作区名；设置、知识库等模块恢复 `Enjoy Agents`。renderer 只传 `label`（去掉换行，最长 80），main 写成 `{label} — Enjoy Agents`；空串恢复品牌名。renderer 不能传入完整标题。macOS 屏幕左上角菜单栏里的应用名不走 `setTitle`，那是 bundle 名，见 `brand` spec
- 右侧：有更新时先画「有更新」芯片（`no-drag`，点开发行说明），再接小号昼/夜与语言胶囊（`--toggle-size: 10px`）。Win / Linux 最后才是最小化 / 最大化·还原 / 关闭，线标，顺序从左到右是最小化、缩放、关闭
- macOS 不画这三颗线标。窗口按钮在左上角，品牌字标跟在后面：三颗 12px 圆点，顺序是关闭（红）、最小化（黄）、缩放（绿）。悬停才露出符号；窗口失焦时三颗变灰。renderer 用 `navigator.platform` 判断，不读 `process.platform`。仍然是自绘按钮，不改 `frame: false`，也不开原生标题栏 overlay
- 任务栏 / 最小化缩略图走 `BrowserWindow.icon`（Windows 用 `resources/icon.ico`）。macOS Dock / Cmd+Tab 另走 `app.dock.setIcon`，窗标选项在 Darwin 上无效。详见 `brand` spec。

IPC：`window.minimize` | `toggleMaximize` | `isMaximized` | `close` | `forceQuit` | `setTaskbarTitle`。最大化状态用 `window.maximized-changed` 推送，renderer 另听 `resize` 做一次校对。Windows 透明无边框不信 `BrowserWindow.isMaximized()`：放大按显示器 `workArea` `setBounds`，还原用放大前矩形；标题栏 drag 双击走 `WM_NCLBUTTONDBLCLK`。

关窗 / ⌘Q：有 `running`、当前或后台 `pendingApproval` / Attention 审批时弹出 ConfirmDialog，确认才 `forceQuit`（`markQuitAllowed` 后 `app.quit`）。空闲标题栏关闭仍走 `window.close`（macOS 可留 Dock）。`before-quit` 未放行时 `preventDefault` 并推 `window.quit-requested`；清理改到 `will-quit`。Win / macOS / Linux 同一套。

## 不变量

- 窗口控制不经过业务 agent 频道。preload 的 `ide.window` 是唯一入口。
- 可点击控件必须 `no-drag`，否则 Windows 上点不中。
- 最大化时 `WindowFrame` 去掉圆角与边框贴边。不要把 `frame: true` 开回去。
- 不要引入第二套原生标题栏或 OS caption overlay（除非补一份新 spec）。

## 代码入口

- 创建窗口：`apps/desktop/src/main/index.ts`
- IPC：`apps/desktop/src/main/ipc.ts`、`packages/ipc-contract/src/window.ts`
- 放大/还原：`apps/desktop/src/main/services/window-maximize.ts`
- UI：`apps/desktop/src/renderer/src/components/layout/window-frame.tsx`、`window-title-bar.tsx`、`window-chrome.ts`、`mac-traffic-lights.tsx`、`window-glyph-controls.tsx`、`title-bar-toggles.tsx`
- 调用：`apps/desktop/src/renderer/src/lib/window-control.ts`
- 退出确认：`main/services/window-quit.ts`、`layout/window-quit-guard.tsx`

## 已知坑

- `transparent: true` + 无阴影时，圆角靠 `WindowFrame` 的 `overflow-hidden` + `rounded-2xl` 裁切。`html`/`body` 若再铺 `background-full`，四角会露出方块。Windows 不要开 acrylic 抢 HWND。
- Windows 透明无边框上 `isMaximized()` 常为 false，`unmaximize()` 空操作，标题栏 drag 双击也不会还原。按钮仍显示 □。切换必须按 workArea 记忆 bounds，不要只调用 `maximize()`/`unmaximize()`。
- 在 drag 区域里放输入框 / 下拉必须单独标 `no-drag`，否则无法聚焦。
- macOS `activate` 会在无窗时重建窗口；IPC 必须能重新 `registerIpc`（先 `unregister` 或靠守卫）。
- `before-quit` 里 `preventDefault` 必须同步。放行旗 `isQuitAllowed` 未立时不要跑 `flushActiveRuns`；确认后走 `forceQuit`。空闲关最后一扇窗会再进 `before-quit`：窗口已毁则直接放行，不要对着 destroyed `webContents` 推事件。
- `autoUpdater.quitAndInstall` 也会进 `before-quit`。安装前必须 `markQuitAllowed()`，否则更新会被退出确认卡住。非 darwin 最后一扇窗 `window-all-closed` 里同样要先放行再 `app.quit()`。
