# spec/appsnap

> macOS 独立截图，贴进 Composer。最后更新：2026-10-07

## 当前真相

AppSnap 和电脑操控是两条链。它只把窗口 PNG 贴进当前焦点会话的 Composer 草稿，不自动发送，也不注册 `desktop_*`。连续截图进同一份草稿。没有焦点会话时先新建一条再贴上。

仅 macOS 真截图。其它系统打开 `#/settings/appsnap` 只看到「此系统还不能截取其它应用窗口」，开关禁用。设置在「智能体与模型」里，导航带 Beta。

Helper 在 `apps/desktop/native/appsnap/darwin/`，用 ScreenCaptureKit 截最前窗口或用户点选的窗口。PNG 上限跟资产库一样是 8MB，超时约 6 秒，窗口列表最多 50 个。打包走 `scripts/stage-native.cjs`，它再调用 `stage-appsnap.cjs`。签名规则与 computer-use helper 相同：没有身份就不报就绪，设置页写「请安装带签名的版本」，不把未签名开发包画成已授权。

默认快捷键是左 Option + 右 Option（`alt.left+alt.right`）。必须正好两键，其中一键是修饰键。保存前对照快捷键表和系统保留键；冲突则点名并拒绝，不把对方的键挪走。全局快捷键只在开关打开且在 macOS 上时由 main 登记。左右修饰键由 helper 轮询物理键；带主键的组合用 Electron `globalShortcut`。

Composer 溢出菜单有「选取窗口」：图标、标题、是否能截。这不是 Goal / Plan / Debug。渲染进程不调用 ScreenCaptureKit。

## 不变量

- 渲染进程不截屏。
- AppSnap 不打开桌面工具，不把电脑操控总开关写成开。
- Windows / Linux 不标成可以截其它应用窗口。
- 未签名 helper 不得显示就绪。
- 和命令快捷键或系统保留键冲突时拒绝保存。

## 代码入口

- 合约：`packages/ipc-contract/src/appsnap.ts`
- helper：`apps/desktop/native/appsnap/darwin/main.swift`
- main：`services/appsnap/`、`ipc-appsnap.ts`
- 设置：`components/settings/appsnap/`
- 贴图：`appsnap-attach.ts`；窗口选择：`composer/appsnap-window-picker.tsx`
- 打包：`scripts/stage-native.cjs`、`scripts/stage-appsnap.cjs`

## 已知坑

- Electron `globalShortcut` 分不清左右 Option。默认组合由 helper 用 `CGEventSource.keyState`（键码 58 / 61）检测，需要输入监听才能在别的应用前台看见。
- JSON 模式不能只把 `readLine` 丢进后台队列就结束顶层语句。进程会在读到请求前退出。主线程要停在 `dispatchMain()`，stdin 关闭后再 `exit`。`watch` 自己是死循环，不走这条。
- 开发目录 `.build/appsnap` 未签名。医生不报就绪。真要截图仍取决于系统是否把屏幕录制授给这份二进制。
- 资产库单文件上限是 8MB。超过的 PNG 会被 helper 拒绝，不会贴进草稿。
