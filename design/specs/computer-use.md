# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-09-25（CU overlay 生命周期薄挂点：runId ALS + 执行器硬取消 + Explore 门控；铬仍以 #94 为准）

## 当前真相

设置里的 **电脑操控** 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。旧坐标工具已删。**§3.2e / H5**：未做真机 GUI 冒烟前，设置与文档不得把 Windows / Linux 标成「可用」或 available；macOS 是当前支持路径。`ENJOY_CU_GUI=1` 才跑拍树测试，跳过 ≠ 通过。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。坐标或 `allowForeground: true` 每次都问。观察编号由 main 签发，30 秒、用过即废。**待批冻结该观察的 TTL 时钟**（`freeze` / `unfreeze`，不改 `OBSERVATION_TTL_MS`）。Allow：解冻再 `take`；仍 stale（过期或账本无此号）则对同一应用 **重拍一次**，匹配 `appKey` + 控件稳定键（**role+name**；路径 `elementId` 不是跨快照指针，有 role/name 时必须对上）后点**新**观察，旧号作废。身份偏弱（只有路径 id）回 `needs_second_confirm`，不静默点。对不上返回 `needs_second_confirm`（带 `previousThumbnailPath` + `thumbnailPath`），**禁止对过期观察静默点击**。主循环 `executeStoredTool` / 活泵 `desktop_act.execute` 看到该码时 **再停一张 Permission Dock warn 卡**（SoT [`../previews/cu-p1-r-second-confirm.html`](../previews/cu-p1-r-second-confirm.html)），不是只把字符串丢给模型。确认（`allow`，testid `approval-second-confirm-allow`）只对**新**观察号 resume；取消（`deny`，`approval-second-confirm-cancel`）discard 新号，不 act。缺任一缩略图主按钮禁用；确认后若仍缺图则 `screenshot_unavailable`，绝不静默 click。不新开决策枚举。Deny：`discard`，不 act。已成功消费的编号再点是 `stale_observation`，不重拍。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后账本为空：`executeStoredTool` → `resumeDesktopAct` 必须显式 `stale_observation`（或随后 `needs_second_confirm`），走同一条重拍路；**禁止假放行 / 报 success**。待批 `parkDesktopActArgs` 冻结 TTL；`enrichDesktopActApprovalArgs` 再补 `appKey` / `appKeySource` / `appName` / `observationId` / `action` / `elementName` / `thumbnailPath?` / `bypassesSessionAllow` / 本观察缩略图。`needs_second_confirm` 记住批准时那张图（stash 键 = 新观察号）；主循环 / 活泵 **repark** 时 `enrichSecondConfirmApprovalArgs` 再补 `previousThumbnailPath` / `previousThumbnailDataUrl` 与 `thumbnailPath` / `thumbnailDataUrl`。Permission Dock 二次确认走同一张 `desktop-approval-card.tsx` 的 warn/danger 变体（左「批准时 · 批前观察」| 右「重拍后 · 新观察」），真源 #84。二次确认底栏 testid `approval-second-confirm-cancel` / `approval-second-confirm-allow`；缺任一 data URL 时主允许禁用。首次允许仍是单缩略图 + 摘要 + 四选一（选项 +「继续」，见 CU-P1-A）。二次确认 args 带 `bypassesSessionAllow`，不写 P1-S 会话表，也不写持久簿；底栏仍是确认/取消两钮，不露始终允许。

**§3.2b / CU-P1-S 会话 Allow（policy B）**：SoT 是进程内 `conversationDesktopAllow`，按 Enjoy `sessionId`。键只认 `desktop_act:<appKey>` 与 `desktop_act:*`，**禁止**裸 `desktop_act`。`allow_session` write-through 会话表 + 本轮 `sessionApprovedTools`。新 run 从该会话表 **复制** 一份进 ActiveRun；run 结束 **不清** 会话表、**不**升全局。切焦点 / 离开再回来仍记得。清空只在：该对话删除、该对话归档、人手撤销某应用、关掉 anyDesktop、进程退出。设置「本会话任意桌面」默认关，开则写当前会话的 `desktop_act:*`，**禁止**写入 `builtin_tools` / 磁盘偏好。旧盘里的 `anyDesktopSession` 忽略。`approvalPolicyFromPrefs` 读会话表 ∪ run 副本，并用 `listDesktopAlwaysAllowAppKeys` 把 prefs `desktopAlwaysAllowAppKeys` 投影成裸 `appKey[]`（读侧兼容旧 `string[]`）。无 appKey 不写白名单，只当一次允许。appKey 优先级：`bundleId` → `exe` / AUMID → 规范化 `appName`；pid 不是键。坐标 / `allowForeground`（`bypassesSessionAllow`）/ 敏感窗 / **二次确认**（stash 命中该 `observationId`，或 args.`needsSecondConfirm` / `code=needs_second_confirm` / 已有 previous 缩略图）每次问。`desktopActAlwaysAsks` 为真时 `sessionAllowsDesktopAct` 必须 false，**禁止**因会话表已有 `desktop_act:<appKey>` / `desktop_act:*` 而跳过二次确认卡、直接 act。Permission Dock 桌面名片四选一（同一张卡，不是新壳）：**允许一次** `approval-allow`→`allow` / **本会话允许此应用** `approval-session`→`allow_session` / **始终允许此应用** `approval-always-app`→`allow_always` / **拒绝** `approval-deny`→`deny`；testid 在选项上，底栏只有「继续」才落决策。有稳 `appKey` 时默认高亮第三项（预览锁定）。禁止再把 `approval-always` 接到持久路径。`bypassesSessionAllow` 或无 appKey 时隐藏会话项。无稳 `appKey`（无 bundleId / exe / AUMID / 规范化 appName；pid 不是键）时隐藏始终允许。一句话摘要走 `desktopActApprovalText`，副标题可显示 appKey。

**CU-P1-A Always-allow**：`allow_always` **只写**本机 prefs `desktopAlwaysAllowAppKeys`（`{ appKey, displayName }[]`），不写会话表。本会话钮只写 `conversationDesktopAllow`，不升簿。设置「电脑操控」内嵌「始终允许的应用」：名单 +「撤销」只清簿、立即刷新；空态「还没有始终允许的应用…」；说明必须含「坐标/前台/敏感仍每次问」；脚注写明「本会话允许」不在本页。禁持久 `desktop_act:*` / 任意桌面永久。命中顺序：`desktopActAlwaysAsks`（坐标 / 前台 / 敏感 / `needs_second_confirm`）→ `sessionAllowsDesktopAct` → `persistentAlwaysAllowsDesktopAct(args, listDesktopAlwaysAllowAppKeys(...))`。`approvalPolicyFromPrefs` 已把投影后的裸 `appKey[]` 灌进 `ApprovalPolicy.desktopAlwaysAllowAppKeys`。二次确认路径硬拒绝写簿：`rememberDesktopAlwaysAllowFromArgs` 在 `desktopActNeedsSecondConfirm` 时返回 `null`，Dock 不露 `approval-always-app`。视觉真源 [`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)。

设置页：标题「电脑操控」、就绪/未就绪徽章、开通三拍（开关 → 系统权限 → 执行器）、医生行指向**当前 helper**（路径/签名，不把 Electron-only AX 当绿）、动作「检测权限 / 拍一张屏 / 试一下 · 计算器」（试一下只切执行并预填 `@电脑`，不自动开跑）。同一卡内嵌「始终允许的应用」（`desktop-always-allow-list.tsx`）。高级「本会话任意桌面」从设置页把当前焦点 `sessionId` 传到 `DesktopAnyDesktopDetails`；**无焦点会话时开关禁用**，提示「请先打开对话」/ “Open a chat first”。main 无 `sessionId` 不写会话表（保持 no-op）。Composer 执行态露出 `@电脑` 与「电脑」芯片；探索态不注册桌面写工具，并出诚实条「探索模式没有桌面操控工具」。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`（darwin helper 须 codesign，见下）。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`，未签名不得报就绪。

设置开关下调用 `desktopDoctor` 写一句缺什么。**医生绿当且仅当即将 spawn 的 helper 路径一致、具备有效团队签名（`helperSigned`，非 ad-hoc / 未签名），且该 helper 进程自己也能过 AX。** 宿主 Electron `systemPreferences.isTrustedAccessibilityClient` / `hostAccessibility` / 遗留 `signed` 不能单独报绿。未签名或身份错位返回 `executor_unsigned` / `executor_identity_mismatch`，开通徽章与医生点不得当就绪。人话指向为 Enjoy Computer Use helper 开辅助功能或重装签名包。

打包 `beforePack`：`scripts/stage-computer-use.cjs` 编出 `native/computer-use/pack/<platform>-<arch>/`。darwin 在有 `CU_CODESIGN_IDENTITY` / `CSC_NAME` / `APPLE_CODESIGN_IDENTITY` 时 `codesign` 真实 helper，并写 `computer-use.identity.json`；没有身份不假装已签名。开发 `swiftc` → `.build/computer-use` 未签名不得报「已就绪」。

右栏 Desktop 只读最近观察（窗名 / appKey / 缩略若有；testid `desktop-rail-card` / `desktop-rail-empty` / `desktop-rail-thumb`）。无观察写「还没有桌面观察」，禁止假装「正在控制」。Execute 下已批目标的 `desktop_act`（click/type/key/move/drag/scroll，**不含 wait**）进入 `deliverAct` 时点亮已有 overlay 窗冷静蓝边 + 「正在操控 · {app}」+「停止」/ Esc（testid `cu-overlay-frame` / `cu-overlay-stop`）。`onAct` 把当前 runId 传进 `beginDesktopActOverlay`（ALS `runWithActiveRunId` 绑活泵 / `executeStoredTool`，再退回 `currentPumpingRunId`）。结束 / 取消 / 失败 / 一键停立刻熄，**不**画空成功条。一键停 / Esc：先熄铬，再 `cancelInFlightDesktopAct`（拒绝在途 act + `child.kill`），再 `abortAgent` **该** runId（已知时不扫全部 ActiveRun）。Deny 待批 `desktop_act` 发生在 `deliverAct` 之前，overlay 本来就没亮。overlay 是铬，不是第二套遥控器；审批仍走 Permission Dock（含二次确认）。探索态（`plan`/`ask`）`createBuiltinAgentTools` 经 `isReadOnlyAgentMode` + `shouldRegisterDesktopControlTools` **不**调 `desktopControlTools()`，不 ensure overlay；能力轨在电脑操控开启时出「桌面仅执行」。视觉真源 [`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)；产品锁 [`../references/cu-p0-c-overlay.md`](../references/cu-p0-c-overlay.md)。不宣称像素 1:1。§3.2a TTL 冻结 / resume / 重拍已由 #80 落地；UI 待批文案写「TTL 已冻结」。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具，也不 ensure overlay、不画「正在操控」。
- overlay 只在 Execute 已批 `desktop_act`（非 wait）进行中可见；结束 / 取消 / 失败 / 停立刻熄，禁止空成功条与第二套远程壳。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 待批冻结 TTL，禁止只靠加长 30s；过期观察禁止静默点击。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。
- 二次确认闸盖住会话白名单与持久簿：stash / `needsSecondConfirm` 时禁止 `sessionAllowsDesktopAct` / `persistentAlwaysAllowsDesktopAct` 自动放行，也禁止 `rememberDesktopAlwaysAllowFromArgs` 写簿。
- darwin：`desktop_doctor.success` 只在 spawn helper 签名匹配且该进程过 AX 时为真。开通绿必须看 `helperSigned`，禁止用宿主 `signed` / `hostAccessibility` 冒充。
- 未开「任意桌面」时，禁止裸 `desktop_act` 会话级放行；开了只命中 `desktop_act:*`。
- 会话 Allow / anyDesktop 只活在 `conversationDesktopAllow`（按 sessionId）。禁止当全局 `builtin_tools` 偏好。归档或删除该对话必须清表。
- 设置页无焦点 `sessionId` 时，「本会话任意桌面」开关必须禁用并提示先打开对话；禁止看起来能开、main 却 no-op。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- 宿主：`desktop-session.ts`（无 Electron）；act / 重拍：`desktop-session-act.ts`；医生：`doctor-report.ts`
- helper 身份 / codesign：`executor-identity.ts`；打包签名：`apps/desktop/scripts/codesign-helper.cjs`
- 会话 Allow 表：`packages/agent-core/src/computer-use/conversation-desktop-allow.ts`；run 复制 / write-through：`agent-run-state.ts` / `agent-runner.ts`；归档删除清表：`session-lifecycle.ts`
- 账本 / 冻结 / 重拍匹配：`packages/agent-core/src/computer-use/`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 二次确认数据面：`computer-use/desktop-second-confirm.ts`（#85：记住批准时图 → 审批 args 路径 / data URL；缺图诚实失败）；闸：`packages/agent-core/.../desktop-second-confirm-gate.ts`（stash 同步进 `desktopActAlwaysAsks`，盖住会话白名单）
- 二次确认停靠：`desktop-second-confirm-park.ts`、`repark-desktop-second-confirm.ts`（主循环 / 活泵再停卡，不把码只丢给模型）
- 审批卡：`thread/approval/desktop-approval-card.tsx`（二次确认 reshape 同一张卡 + `desktop-second-confirm-body.tsx`；#84 SoT warn/danger）
- 设置：`settings/tools/desktop-tools-card.tsx`；始终允许名单：`desktop/desktop-always-allow-list.tsx`；开通绿：`desktop/desktop-readiness.ts`、`desktop-doctor-panel.tsx`
- 持久簿：`desktop-always-allow-ledger.ts`（prefs `desktopAlwaysAllowAppKeys`）；命中辅助：`persistentAlwaysAllowsDesktopAct`
- 右栏：`right-pane/views/desktop-view.tsx`
- overlay 窗：`resources/overlay/computer-use-overlay.html` + `overlay-preload.js`；窗本体 `screen-overlay-service.ts`；生命周期 `desktop-overlay-chrome.ts`；停手势纯函数 `desktop-overlay-lifecycle.ts`；Explore 门控 `desktop-tool-gate.ts`；可见性纯函数 `desktop-overlay-visibility.ts`
- 工具→run：`active-run-id.ts`（ALS）；`currentPumpingRunId` 在 `agent-run-state.ts`；活泵 / 审批续跑包 `runWithActiveRunId`

## 已知坑

- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。该二进制未签名时医生**不得**绿；真要点击仍须给这份 helper 开辅助功能，或改用签名安装包。开通徽章与医生点只读 `helperSigned` + helper AX；`executor_unsigned` / `executor_identity_mismatch` / 宿主 `hostAccessibility` 不得绿。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过（skip ≠ pass）。§3.2e / H5：设置与文档不得把 Win/Linux 标成可用/available，直至真机 GUI 冒烟。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
- **二次确认卡 UI**：视觉真源 `design/previews/cu-p1-r-second-confirm.html`（#84）。数据面已在 main `#85`；Dock warn/danger 铬已接线。像素只进审批 args，禁止把 data URL 写进模型可见的工具结果。
- **二次确认 × 会话 Allow / 持久簿**：stash 或 `needsSecondConfirm` 必须走 `desktopActAlwaysAsks`，盖住 `desktop_act:<appKey>` / `desktop_act:*` 与簿投影 appKey。主循环 / 活泵仍 **repark**，不把失败只丢给模型。二次确认禁止 `allow_always` 落簿。
- **隐患**：确认 resume 仍带原 `elementId`。`needs_second_confirm` 载荷没有单独的 `nextElementId`；新树上同号控件若已换，执行器应诚实失败，不要假 success。若确认后要点新树里的提示控件，需在载荷补 `nextElementId`，本刀不编造。
- 发版 CI 若没有 `CSC_LINK` / `CSC_NAME`，stage 会留下未签名 sidecar，医生保持不绿。不要把「编过 swiftc」写成已就绪。
- **CU-P1-A 闸命中**：`resolveToolApproval` 顺序是硬每次问 → 会话表 → `persistentAlwaysAllowsDesktopAct`。投影只认裸 appKey；`*` / `desktop_act:*` / pid 丢掉。二次确认禁止写簿、禁止簿跳过 Dock。撤销只清簿，不清会话表。
- **子循环不认 allow_always**：`WaitForSubagentApproval` 仍是 `allow | deny | allow_session`。父路径 `applyApprovalDecision` 已写簿后，`toSubagentUserDecision` 把 `allow_always` 折成 `allow`，禁止再写会话表。
- **testid 拆分**：旧 `approval-always` 曾指本会话。现在本会话是 `approval-session`，持久是 `approval-always-app`。testid 在四选一选项上，不要挂到「继续」。不要把旧 testid 接到 `allow_always`。
- **H2 write/hit**：审批层按 `desktop_act:<appKey>` 写入、按 `has("desktop_act:"+appKey)` 或 `has("desktop_act:*")` 命中。不要再 `sessionApprovedTools.add("desktop_act")`，也不要按裸工具名放行。
- **P1-S 错 SoT**：ActiveRun 空 Set 不能当会话记忆；`builtin_tools.anyDesktopSession` 不能当任意桌面。正确做法：会话表 keyed by `sessionId`，run 只拿副本。切会话不清表（policy B）；归档/删除才清。进程退出表没。
- **设置无焦点会话**：开关若仍可拨，UI 看起来已开、main 却因缺 `sessionId` no-op。正确做法：把 `sessionId` 传到 `DesktopAnyDesktopDetails`，无会话则 `disabled` + `anyDesktopNeedSession`。
- 执行器快照目前多半只有 `appName`，`appKey` 回落到规范化应用名；有 `bundleId` / `exe` / AUMID 才优先用。`appKeySource` 记录用了哪一档。
- 控件 `elementId` 是当次 AX 路径下标，不是稳定指针。重拍不得只靠同号 id 自动点；有审批 enrich 的 role/name 时必须对上，否则 `needs_second_confirm`。
- **overlay 生命周期挂点（薄）**：`onAct` 把 ALS / 活泵 runId 传进 `beginDesktopActOverlay`。主进程没有独立 `desktop.act.start` StreamEvent。停手势先熄再 `cancelInFlight` 再 abort **该** runId；未知 runId 才退回活泵 / 全部 ActiveRun。
- **隐患**：执行器协议没有 cancel RPC。硬取消 = 拒绝在途 Promise + `child.kill`（与超时同一条路）。OS 已落下的 click 无法撤回；该 run 已 abort，不再继续 act。helper 未 dispose 时 `onExit` 仍可能重启一次。kill 后 stdin 可能 EPIPE，必须在 helper stdin 上吞掉，否则会打翻 main。Esc 用 `globalShortcut`，三端均可；注册失败则只靠顶栏「停止」。设置预览走同一套铬，约 2.4s 自熄，不是成功 toast。
