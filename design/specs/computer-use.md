# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-09-25

## 当前真相

设置里的 Computer Use 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。旧坐标工具已删。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。坐标或 `allowForeground: true` 每次都问。观察编号由 main 签发，30 秒、用过即废。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后点允许走 `executeStoredTool` → `resumeDesktopAct`。审批 `approval.required` 的 args 用账本里的应用名 / 控件名。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`。

设置开关下调用 `desktopDoctor` 写一句缺什么。右栏 Desktop 只读最近观察。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- 宿主：`desktop-session.ts`（无 Electron）
- 账本 / 审批策略：`packages/agent-core/src/computer-use/`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 右栏：`right-pane/views/desktop-view.tsx`

## 已知坑

- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。打包必须带签名二进制，否则医生以为开了权限，点击仍失败。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
