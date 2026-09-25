# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-09-25（CU-P1-A 本机 Always-allow 持久簿）

## 当前真相

设置里的 **电脑操控** 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。旧坐标工具已删。**§3.2e / H5**：未做真机 GUI 冒烟前，设置与文档不得把 Windows / Linux 标成「可用」或 available；macOS 是当前支持路径。`ENJOY_CU_GUI=1` 才跑拍树测试，跳过 ≠ 通过。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。坐标或 `allowForeground: true` 每次都问。观察编号由 main 签发，30 秒、用过即废。**待批冻结该观察的 TTL 时钟**（`freeze` / `unfreeze`，不改 `OBSERVATION_TTL_MS`）。Allow：解冻再 `take`；仍 stale（过期或账本无此号）则对同一应用 **重拍一次**，匹配 `appKey` + 控件稳定键（**role+name**；路径 `elementId` 不是跨快照指针，有 role/name 时必须对上）后点**新**观察，旧号作废。身份偏弱（只有路径 id）回 `needs_second_confirm`，不静默点。对不上返回 `needs_second_confirm`（带 `previousThumbnailPath` + `thumbnailPath`），**禁止对过期观察静默点击**。主循环 `executeStoredTool` / 活泵 `desktop_act.execute` 看到该码时 **再停一张 Permission Dock warn 卡**（SoT [`../previews/cu-p1-r-second-confirm.html`](../previews/cu-p1-r-second-confirm.html)），不是只把字符串丢给模型。确认（`allow`，testid `approval-second-confirm-allow`）只对**新**观察号 resume；取消（`deny`，`approval-second-confirm-cancel`）discard 新号，不 act。缺任一缩略图主按钮禁用；确认后若仍缺图则 `screenshot_unavailable`，绝不静默 click。不新开决策枚举。Deny：`discard`，不 act。已成功消费的编号再点是 `stale_observation`，不重拍。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后账本为空：`executeStoredTool` → `resumeDesktopAct` 必须显式 `stale_observation`（或随后 `needs_second_confirm`），走同一条重拍路；**禁止假放行 / 报 success**。待批 `parkDesktopActArgs` 冻结 TTL；`enrichDesktopActApprovalArgs` 再补 `appKey` / `appKeySource` / `appName` / `observationId` / `action` / `elementName` / `thumbnailPath?` / `bypassesSessionAllow` / 本观察缩略图。`needs_second_confirm` 记住批准时那张图（stash 键 = 新观察号）；主循环 / 活泵 **repark** 时 `enrichSecondConfirmApprovalArgs` 再补 `previousThumbnailPath` / `previousThumbnailDataUrl` 与 `thumbnailPath` / `thumbnailDataUrl`。Permission Dock 二次确认走同一张 `desktop-approval-card.tsx` 的 warn/danger 变体（左「批准时 · 批前观察」| 右「重拍后 · 新观察」），真源 #84。二次确认底栏 testid `approval-second-confirm-cancel` / `approval-second-confirm-allow`；缺任一 data URL 时主允许禁用。首次允许仍是单缩略图 + 摘要，底栏 CU-P0-B testid 不变。二次确认 args 带 `bypassesSessionAllow`，不写 P1-S 会话表。

**§3.2b / CU-P1-S 会话 Allow（policy B）**：SoT 是进程内 `conversationDesktopAllow`，按 Enjoy `sessionId`。键只认 `desktop_act:<appKey>` 与 `desktop_act:*`，**禁止**裸 `desktop_act`。`allow_session` write-through 会话表 + 本轮 `sessionApprovedTools`。新 run 从该会话表 **复制** 一份进 ActiveRun；run 结束 **不清** 会话表、**不**升全局。切焦点 / 离开再回来仍记得。清空只在：该对话删除、该对话归档、人手撤销某应用、关掉 anyDesktop、进程退出。设置「本会话任意桌面」默认关，开则写当前会话的 `desktop_act:*`，**禁止**写入 `builtin_tools` / 磁盘偏好。旧盘里的 `anyDesktopSession` 忽略。`approvalPolicyFromPrefs` 读会话表 ∪ run 副本，再读持久簿。无 appKey 不写白名单，只当一次允许。appKey 优先级：`bundleId` → `exe` / AUMID → 规范化 `appName`；pid 不是键。坐标 / `allowForeground`（`bypassesSessionAllow`）/ 敏感窗 / **二次确认**（stash 命中该 `observationId`，或 args.`needsSecondConfirm` / `code=needs_second_confirm` / 已有 previous 缩略图）每次问。`desktopActAlwaysAsks` 为真时 `sessionAllowsDesktopAct` 与 `persistentBookAllowsDesktopAct` 必须 false，**禁止**因会话表或持久簿已有该应用而跳过二次确认卡、直接 act。Permission Dock 桌面名片底栏：**允许一次** `approval-allow`→`allow` / **本会话允许此应用** `approval-always`→`allow_session` / **始终允许此应用** `approval-always-app`→`allow_always` / **拒绝** `approval-deny`→`deny`。`approval-always` **不是**持久 Always-allow。`bypassesSessionAllow` 或无稳 appKey 时隐藏会话钮与始终允许钮。二次确认卡 `showAlways=false` 且隐藏始终允许。一句话摘要走 `desktopActApprovalText`，副标题可显示 appKey。

**§3.2b / CU-P1-A Always-allow 持久簿**：SoT 是本机 `preferences.desktopAlwaysAllowAppKeys: string[]`，只存裸 `appKey`（bundleId / exe / AUMID / 规范化 appName）。**禁止**把 `desktop_act:<key>` 前缀或 `desktop_act:*` / `*` 写入 prefs。读/写都洗链：空、pid-only、带前缀、畸形键丢掉。`allow_always`（文案「始终允许此应用」）**只**把该 appKey 写入簿，**禁止** write-through 会话表。设置「撤销」**只**从簿删该键，**禁止**清会话表。覆盖同 appKey 的 click / type / key；`wait` 仍免批。命中顺序：硬每次问（坐标 / 前台 / 敏感 / 二次确认）→ 会话表 → 持久簿。簿盖不住 `needs_second_confirm`。禁持久任意桌面。本机 only，不进 `builtin_tools` 落盘、不云同步。设置「始终允许的应用」名单 +「撤销」走 `builtinTools.revokeAlwaysAllowApp`；`getState.computerUse.alwaysAllowAppKeys` 是洗过的只读投影。

设置页：标题「电脑操控」、就绪/未就绪徽章、开通三拍（开关 → 系统权限 → 执行器）、医生行指向**当前 helper**（路径/签名，不把 Electron-only AX 当绿）、动作「检测权限 / 拍一张屏 / 试一下 · 计算器」（试一下只切执行并预填 `@电脑`，不自动开跑）。高级「本会话任意桌面」从设置页把当前焦点 `sessionId` 传到 `DesktopAnyDesktopDetails`；**无焦点会话时开关禁用**，提示「请先打开对话」/ “Open a chat first”。main 无 `sessionId` 不写会话表（保持 no-op）。同卡「始终允许的应用」名单可撤销；空态「还没有始终允许的应用…」；说明必须含「坐标/前台/敏感仍每次问」。Composer 执行态露出 `@电脑` 与「电脑」芯片；探索态不注册桌面写工具，并出诚实条「探索模式没有桌面操控工具」。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`（darwin helper 须 codesign，见下）。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`，未签名不得报就绪。

设置开关下调用 `desktopDoctor` 写一句缺什么。**医生绿当且仅当即将 spawn 的 helper 路径一致、具备有效团队签名（`helperSigned`，非 ad-hoc / 未签名），且该 helper 进程自己也能过 AX。** 宿主 Electron `systemPreferences.isTrustedAccessibilityClient` / `hostAccessibility` / 遗留 `signed` 不能单独报绿。未签名或身份错位返回 `executor_unsigned` / `executor_identity_mismatch`，开通徽章与医生点不得当就绪。人话指向为 Enjoy Computer Use helper 开辅助功能或重装签名包。

打包 `beforePack`：`scripts/stage-computer-use.cjs` 编出 `native/computer-use/pack/<platform>-<arch>/`。darwin 在有 `CU_CODESIGN_IDENTITY` / `CSC_NAME` / `APPLE_CODESIGN_IDENTITY` 时 `codesign` 真实 helper，并写 `computer-use.identity.json`；没有身份不假装已签名。开发 `swiftc` → `.build/computer-use` 未签名不得报「已就绪」。

右栏 Desktop 只读最近观察（可带 appKey）。`desktop_act` 成功路径会点亮已有 overlay（不是第二套遥控器）。§3.2a TTL 冻结 / resume / 重拍已由 #80 落地；UI 待批文案写「TTL 已冻结」。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 待批冻结 TTL，禁止只靠加长 30s；过期观察禁止静默点击。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。
- 二次确认闸盖住会话白名单与持久簿：stash / `needsSecondConfirm` 时禁止 `sessionAllowsDesktopAct` / `persistentBookAllowsDesktopAct` 自动放行。
- darwin：`desktop_doctor.success` 只在 spawn helper 签名匹配且该进程过 AX 时为真。开通绿必须看 `helperSigned`，禁止用宿主 `signed` / `hostAccessibility` 冒充。
- 未开「任意桌面」时，禁止裸 `desktop_act` 会话级放行；开了只命中 `desktop_act:*`。
- 会话 Allow / anyDesktop 只活在 `conversationDesktopAllow`（按 sessionId）。禁止当全局 `builtin_tools` 偏好。归档或删除该对话必须清表。
- Always-allow 只活在 `preferences.desktopAlwaysAllowAppKeys`（裸 appKey）。`allow_always` 不写会话表；设置撤销不清会话表。禁止持久 `desktop_act:*` / `*`。
- 设置页无焦点 `sessionId` 时，「本会话任意桌面」开关必须禁用并提示先打开对话；禁止看起来能开、main 却 no-op。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- 宿主：`desktop-session.ts`（无 Electron）；act / 重拍：`desktop-session-act.ts`；医生：`doctor-report.ts`
- helper 身份 / codesign：`executor-identity.ts`；打包签名：`apps/desktop/scripts/codesign-helper.cjs`
- 会话 Allow 表：`packages/agent-core/src/computer-use/conversation-desktop-allow.ts`；run 复制 / write-through：`agent-run-state.ts` / `agent-runner.ts`；归档删除清表：`session-lifecycle.ts`
- Always-allow 簿：`packages/agent-core/src/computer-use/desktop-always-allow.ts`（洗链 / 命中 / `desktopActDecisionWrite`）；prefs IO：`desktop-always-allow-prefs.ts`；设置撤销：`builtinTools.revokeAlwaysAllowApp`
- 账本 / 冻结 / 重拍匹配：`packages/agent-core/src/computer-use/`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 二次确认数据面：`computer-use/desktop-second-confirm.ts`（#85：记住批准时图 → 审批 args 路径 / data URL；缺图诚实失败）；闸：`packages/agent-core/.../desktop-second-confirm-gate.ts`（stash 同步进 `desktopActAlwaysAsks`，盖住会话白名单）
- 二次确认停靠：`desktop-second-confirm-park.ts`、`repark-desktop-second-confirm.ts`（主循环 / 活泵再停卡，不把码只丢给模型）
- 审批卡：`thread/approval/desktop-approval-card.tsx`（二次确认 reshape 同一张卡 + `desktop-second-confirm-body.tsx`；#84 SoT warn/danger）
- 设置：`settings/tools/desktop-tools-card.tsx`；开通绿：`desktop/desktop-readiness.ts`、`desktop-doctor-panel.tsx`
- 右栏：`right-pane/views/desktop-view.tsx`

## 已知坑

- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。该二进制未签名时医生**不得**绿；真要点击仍须给这份 helper 开辅助功能，或改用签名安装包。开通徽章与医生点只读 `helperSigned` + helper AX；`executor_unsigned` / `executor_identity_mismatch` / 宿主 `hostAccessibility` 不得绿。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过（skip ≠ pass）。§3.2e / H5：设置与文档不得把 Win/Linux 标成可用/available，直至真机 GUI 冒烟。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
- **二次确认卡 UI**：视觉真源 `design/previews/cu-p1-r-second-confirm.html`（#84）。数据面已在 main `#85`；Dock warn/danger 铬已接线。像素只进审批 args，禁止把 data URL 写进模型可见的工具结果。
- **二次确认 × 会话 Allow / Always-allow**：stash 或 `needsSecondConfirm` 必须走 `desktopActAlwaysAsks`，盖住 `desktop_act:<appKey>` / `desktop_act:*` **和** 持久簿裸 appKey。主循环 / 活泵仍 **repark**，不把失败只丢给模型。
- **P1-A 各写各的**：`allow_always` 只写 `desktopAlwaysAllowAppKeys`；`allow_session` 只写会话表；设置「撤销」只清簿。不要把 `approval-always` 绑到 `allow_always`（那是本会话）。禁止把 `desktop_act:*` 写进 prefs。
- **隐患**：确认 resume 仍带原 `elementId`。`needs_second_confirm` 载荷没有单独的 `nextElementId`；新树上同号控件若已换，执行器应诚实失败，不要假 success。若确认后要点新树里的提示控件，需在载荷补 `nextElementId`，本刀不编造。
- 发版 CI 若没有 `CSC_LINK` / `CSC_NAME`，stage 会留下未签名 sidecar，医生保持不绿。不要把「编过 swiftc」写成已就绪。
- **H2 write/hit**：审批层按 `desktop_act:<appKey>` 写入、按 `has("desktop_act:"+appKey)` 或 `has("desktop_act:*")` 命中。不要再 `sessionApprovedTools.add("desktop_act")`，也不要按裸工具名放行。
- **P1-S 错 SoT**：ActiveRun 空 Set 不能当会话记忆；`builtin_tools.anyDesktopSession` 不能当任意桌面。正确做法：会话表 keyed by `sessionId`，run 只拿副本。切会话不清表（policy B）；归档/删除才清。进程退出表没。
- **设置无焦点会话**：开关若仍可拨，UI 看起来已开、main 却因缺 `sessionId` no-op。正确做法：把 `sessionId` 传到 `DesktopAnyDesktopDetails`，无会话则 `disabled` + `anyDesktopNeedSession`。
- 执行器快照目前多半只有 `appName`，`appKey` 回落到规范化应用名；有 `bundleId` / `exe` / AUMID 才优先用。`appKeySource` 记录用了哪一档。
- 控件 `elementId` 是当次 AX 路径下标，不是稳定指针。重拍不得只靠同号 id 自动点；有审批 enrich 的 role/name 时必须对上，否则 `needs_second_confirm`。
