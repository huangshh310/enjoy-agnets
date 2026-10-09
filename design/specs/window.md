# spec/window

> 无边框桌面窗：系统按钮在渲染进程，操作在主进程。最后更新：2026-10-09（孤儿续跑等 did-finish-load；单实例失败者 exit）

## 当前真相

`BrowserWindow` 配置（`apps/desktop/src/main/index.ts`）：

- `frame: false`、`transparent: true`、`hasShadow: false`
- `backgroundColor: "#00000000"`。macOS 注入 `vibrancy: "fullscreen-ui"`。Windows **不要** `backgroundMaterial: "acrylic"`：acrylic 铺满矩形 HWND，CSS `rounded-2xl` 切不掉四角。磨砂只走 `WindowFrame` + `skins/glass.css`。
- 默认 1440×920，最小 1100×720
- `autoHideMenuBar: true`

路由根用 `WindowFrame` 包一层：外框 `rounded-2xl` + `border-border-button-default` + `bg-background-full`；最大化时 `rounded-none border-0` 贴边。`html` / `body` / `#root` 必须透明，否则四角会露出方底。顶栏 `WindowTitleBar`（高 36px）；内容区可选择文本。

标题栏：

- 整条 `-webkit-app-region: drag`，双击切换最大化
- 侧栏折叠、页面后退/前进、辅助开关、窗口按钮 `no-drag`
- 左侧不再放 `AppMark` / `AppWordmark`。紧跟 macOS 红绿灯（Win / Linux 无红绿灯，从左边距起）是侧栏折叠和后退/前进。不改 `titleBarStyle`，也不加原生 `hiddenInset` 的约 78px：自绘红绿灯已经占着左上角，再留一段空白会把按钮推离红绿灯
- 后退/前进是应用内页面历史，不是 `webContents.goBack()`。每个窗口一份栈，不持久化、不跨窗口共享。新窗口的渲染进程只 seed 当前页，不复制来源窗口的 past/future。拖出标签成新窗口这条路径没有做
- 鼠标侧键在 `mouseup` 上走应用内栈；`mousedown` 只 `preventDefault`。Windows 另在主进程 `app-command` 上拦住 `browser-backward` / `browser-forward`，避免 Chromium 再 `history.back()`。内容区 150ms 位移：后退向右，前进向左。是否位移在改栈的同一刻决定：当前页 `running`，或目标会话的 parked run 仍在输出，或系统减少动效时，不做位移
- 删除当前页落到 past 末尾。past 空则回到空的新聊天（不 `session.create`）。空项目页同样只切工作区并清前台会话，不打开第一条会话，也不新建
- 窗口标题走 `BrowserWindow.setTitle`（Win 任务栏、macOS 程序坞窗口列表和调度中心、Linux 同一套）。Chat 有会话标题时用会话标题，否则用当前工作区名；设置、知识库等模块恢复 `Enjoy Agents`。renderer 只传 `label`（去掉换行，最长 80），main 写成 `{label} — Enjoy Agents`；空串恢复品牌名。renderer 不能传入完整标题。macOS 屏幕左上角菜单栏里的应用名不走 `setTitle`，那是 bundle 名，见 `brand` spec
- 右侧：有更新时先画「有更新」芯片（`no-drag`，点开发行说明），再接小号昼/夜与语言胶囊（`--toggle-size: 10px`）。Win / Linux 最后才是最小化 / 最大化·还原 / 关闭，线标，顺序从左到右是最小化、缩放、关闭
- macOS 不画这三颗线标。窗口按钮在左上角，侧栏折叠和历史按钮跟在后面：三颗 12px 圆点，顺序是关闭（红）、最小化（黄）、缩放（绿）。悬停才露出符号；窗口失焦时三颗变灰。renderer 用 `navigator.platform` 判断，不读 `process.platform`。仍然是自绘按钮，不改 `frame: false`，也不开原生标题栏 overlay
- 任务栏 / 最小化缩略图走 `BrowserWindow.icon`（Windows 用 `resources/icon.ico`）。macOS Dock / Cmd+Tab 另走 `app.dock.setIcon`，窗标选项在 Darwin 上无效。详见 `brand` spec。

IPC：`window.minimize` | `toggleMaximize` | `isMaximized` | `close` | `forceQuit` | `setTaskbarTitle` | `openExternal`。最大化状态用 `window.maximized-changed` 推送，renderer 另听 `resize` 做一次校对。Windows 透明无边框不信 `BrowserWindow.isMaximized()`：放大按显示器 `workArea` `setBounds`，还原用放大前矩形；标题栏 drag 双击走 `WM_NCLBUTTONDBLCLK`。`openExternal` 入参 Zod `WindowOpenExternalInput`，只收 http(s)，拒 userinfo 凭据；main `URL` 复验后 `shell.openExternal`。失败回 `{ ok: false, code }`，不抛。`window.openExternal` **只能**从用户手势回调调用（目前是终端 WebLinks 点击）；禁止程序化 / 自动打开。

关窗 / ⌘Q：有 `running`、当前或后台 `pendingApproval` / Attention 审批时弹出 ConfirmDialog，确认才 `forceQuit`（`markQuitAllowed` 后 `app.quit`）。空闲标题栏关闭仍走 `window.close`（macOS 可留 Dock）。`before-quit` 未放行时 `preventDefault` 并推 `window.quit-requested`；清理改到 `will-quit`。Win / macOS / Linux 同一套。

单实例：`registerAssetScheme` 之后立刻 `app.requestSingleInstanceLock()`（`single-instance.ts`）。拿不到锁的进程 `markQuitAllowed()` 后 `app.exit(0)`（不是 `quit()`，避免再进 `will-quit` 碰共享库）。`will-quit` / `before-quit` / `window-all-closed` 都先看 `isPrimaryInstance()`。拿到锁的实例听 `second-instance`：已有窗则 `restore` + `show` + `focus`；无窗且 `app.isReady()` 才 `createWindow`。孤儿续跑挂第一扇窗的 `webContents.once("did-finish-load")`（`restore-after-load.ts`），每个进程一次；`createWindow` 当下和窗口重建都不再跑。三端差异：Windows / Linux 二次启动走 `second-instance`；macOS 点 Dock 重开已在跑的应用走 `activate`（无窗才重建），命令行再拉起第二份进程才走 `second-instance`。E2E 仍拿锁，并给独立 `ENJOY_E2E_USERDATA`。

## 不变量

- 窗口控制不经过业务 agent 频道。preload 的 `ide.window` 是唯一入口。
- 可点击控件必须 `no-drag`，否则 Windows 上点不中。
- 最大化时 `WindowFrame` 去掉圆角与边框贴边。不要把 `frame: true` 开回去。
- 不要引入第二套原生标题栏或 OS caption overlay（除非补一份新 spec）。

## 代码入口

- 创建窗口：`apps/desktop/src/main/index.ts`
- 单实例锁：`apps/desktop/src/main/services/single-instance.ts`（`index.ts` 在 `whenReady` 之前调用）
- 孤儿续跑时机：`apps/desktop/src/main/services/restore-after-load.ts`（首窗 `did-finish-load`）
- IPC：`apps/desktop/src/main/ipc.ts`、`packages/ipc-contract/src/window.ts`；外链 `main/services/window-open-external.ts`
- 放大/还原：`apps/desktop/src/main/services/window-maximize.ts`
- UI：`apps/desktop/src/renderer/src/components/layout/window-frame.tsx`、`window-title-bar.tsx`、`window-chrome.ts`、`mac-traffic-lights.tsx`、`window-glyph-controls.tsx`、`title-bar-toggles.tsx`
- 页面历史逻辑：`apps/desktop/src/renderer/src/hooks/nav-history/`（纯栈 `nav-history.ts`，观察与恢复 `nav-history-controller.ts`）。标题栏按钮和位移在 `components/layout/nav-history/`
- 拦住 Windows 原生侧键：`apps/desktop/src/main/services/block-native-history.ts`
- 调用：`apps/desktop/src/renderer/src/lib/window-control.ts`
- 退出确认：`main/services/window-quit.ts`、`layout/window-quit-guard.tsx`

## 已知坑

- `transparent: true` + 无阴影时，圆角靠 `WindowFrame` 的 `overflow-hidden` + `rounded-2xl` 裁切。`html`/`body` 若再铺 `background-full`，四角会露出方块。Windows 不要开 acrylic 抢 HWND。
- Windows 透明无边框上 `isMaximized()` 常为 false，`unmaximize()` 空操作，标题栏 drag 双击也不会还原。按钮仍显示 □。切换必须按 workArea 记忆 bounds，不要只调用 `maximize()`/`unmaximize()`。
- 在 drag 区域里放输入框 / 下拉必须单独标 `no-drag`，否则无法聚焦。
- macOS `activate` 会在无窗时重建窗口；IPC 必须能重新 `registerIpc`（先 `unregister` 或靠守卫）。Dock 重开不是 `second-instance`，不要把两件事写成一条路径。
- 第二实例若走 `app.quit()`，`will-quit` 会 `stopAutomationScheduler` → `stampAutomationAlive` → `getDatabase`，可能对主实例的库跑迁移或覆盖 `scanFromAt`。必须 `app.exit(0)`，且退出钩子先看是不是主实例。
- 第二实例若先注册 `before-quit` 再退出，退出确认会 `preventDefault` 把失败者卡住。必须先 `markQuitAllowed()`，且不要给失败者挂 `whenReady` 调度。
- `before-quit` 里 `preventDefault` 必须同步。放行旗 `isQuitAllowed` 未立时不要跑 `flushActiveRuns`；确认后走 `forceQuit`。空闲关最后一扇窗会再进 `before-quit`：窗口已毁则直接放行，不要对着 destroyed `webContents` 推事件。
- `autoUpdater.quitAndInstall` 也会进 `before-quit`。安装前必须 `markQuitAllowed()`，否则更新会被退出确认卡住。非 darwin 最后一扇窗 `window-all-closed` 里同样要先放行再 `app.quit()`。
- 页面历史在渲染进程内存里。刷新或新开窗口不会带回 past/future。删除当前会话或项目时落到 past 末尾；past 空则回到空的新聊天，不创建会话。项目已不在时只清工作区指针。不要把滚动、草稿、流式半截写进条目。
- 侧键不要只绑 `mousedown`。Chromium 在 `mouseup` 上后退；只在按下时 `preventDefault` 拦不住，应用内 `navigate` 推上去的条目会被原生 `history.back()` 弹掉。
- 内容区位移不要等恢复完成再看 `running`。`loadSession` 会把前台 run 停进 park，effect 里再读已经是 false，正在输出的页面仍会滑。要在 `back` / `forward` / `jump` 改栈时决定，结果放在 `slide`。
