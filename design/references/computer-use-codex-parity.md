# Computer Use · Codex 对照与 Enjoy P0 短锁

> 2026-09-25 · jojo · 调研+短锁（**不开实现 PR**）  
> 触发：用户吐槽「不能像 Codex 那样正常用/操作」  
> 现状线索（host）：main tip `86228f9` `feat(computer-use): native executors`；路径见下  
> 入库建议：`design/references/computer-use-codex-parity.md`；实现真源仍以 [`../specs/computer-use.md`](../specs/computer-use.md) 为准（私仓未拉到原文 → 标注 **待核实**）

---

## 0. 一句话

Codex 的 Computer Use 是 **插件化 + OS 权限 + 按 App 审批 + 会话内可操作 GUI** 的闭环。  
Enjoy 已有 **native executors（mac/linux/win）** 骨架时，P0 要补的是 **可发现的开启路径、按应用/动作审批、观察面（截图/步骤）、失败诚实态**——让「能点、能看、能停」像 Codex 一样可用，而不是只有底层 executor。

---

## 1. 竞品 / 开源对照

| 产品 | 怎么开桌面 | 工具面 | 审批 | 观察 / 失败诚实 |
|------|------------|--------|------|-----------------|
| **Codex / ChatGPT Desktop Computer Use** | Plugins → Computer Use 安装；开 server+skill；macOS 要 **屏幕录制+辅助功能**；设置里管 Always-allowed apps | 看屏、点、打字、导航 GUI；`@Computer` / `@AppName` 触发；API 侧还可 `computer` 工具：click/type/scroll/keypress/screenshot… | **双层**：OS 权限 ≠ App 审批；首次按 App 问 Allow / Always allow；敏感动作可再问；文件/shell 仍走原 sandbox 审批 | Windows **前台独占**指针键盘；mac 可 Locked use；缺权限给人话指引；不能控终端/ChatGPT 自身绕过策略 |
| **OpenAI API computer tool** | 应用侧接 Responses/`computer`；你执行动作再回传截图 | 结构化动作：click、double_click、drag、move、scroll、keypress、type、wait、screenshot | 由宿主实现；文档强调应用执行与回传 | 坐标/截图闭环；`completed`≠已执行 |
| **Claude Computer Use**（API GA toolset） | 宿主声明 `computer_toolset_*`；应用执行 | screenshot、left_click、type、zoom 等成员工具；可 batch | 安全分类器；敏感流建议人确认 | 截图尺寸/坐标缩放必须宿主处理好，否则点偏 |
| **open-computer-use / Windows-MCP** | 本机 MCP：list_apps、get_app_state、click、type… | 无障碍树优先或截图坐标 | 由接入宿主决定 | 适合 Enjoy 作「外挂 MCP」对照，不是产品默认 |
| **OpenHands** | 默认非原生桌面 CU；靠 MCP 外挂 | Canvas/CLI 为主 | 宿主确认 | 证明「CU = 可选扩展」路径 |

**可抄（产品合同）**

1. **开启仪式清晰**：安装/启用 → OS 权限 → Try now / 试运行  
2. **按 App 审批** + Always allow 列表可撤销  
3. **触发可发现**：`@Computer` / 「使用电脑」明示，不只埋在工具列表  
4. **失败诚实**：缺 Screen Recording / Accessibility / 目标窗不可见 → 人话 + 系统设置深链  
5. **与写盘/shell 审批分离**：GUI 动作单独闸，不冒充 Explore 只读已覆盖  

**不抄**

- Windows 独占前台当唯一模式（Enjoy 可先前台，但要诚实文案；勿假装后台）  
- Locked-use / 解锁插件（后置）  
- 默认依赖公网云桌面  
- 把 CU 伪装成「探索模式可随便点」  

---

## 2. Enjoy 现状缺口（对照 tip `86228f9`）

> 下列含 **待核实**：私仓 `design/specs/computer-use.md` 本环境 404，未读到完整真源。host 已开只读 gap map 云端，合入后应用其结论覆盖本节。

| 域 | 假设缺口（用户痛点映射） | P0? |
|----|--------------------------|-----|
| **发现 / 开启** | 用户不知如何打开 CU；缺 Plugins 式「启用 Computer Use」+ 权限引导 | **P0** |
| **OS 权限** | mac 屏幕录制/辅助功能未通过时无固定空态与重试 | **P0** |
| **工具面** | native executor 有，但会话工具未完整暴露或不可用（click/type/screenshot 断） | **P0** |
| **审批** | 缺按 App / 首次动作闸；或与 HMAC 工具审批糊成一团 | **P0** |
| **观察** | 无「当前看到的屏」缩略图 / 步骤条；账本不记 GUI 动作 | **P0** |
| **会话流** | 无 `@Computer` / 一键「用电脑」；引擎切换后 CU 静默失效 | **P0** |
| **失败诚实** | 失败成泛化 tool error，不像 Codex 指向权限/前台/窗体 | **P0** |
| **平台差** | Win 前台独占未文案；Linux 能力边界未标 | P1 |
| **Always allow** | 无应用白名单设置页 | P1 |
| **Locked use** | 无 | 后置 |

**路径线索（host）**

- `apps/desktop/native/computer-use/`  
- `apps/desktop/src/main/services/builtin-tools/computer-use/`  
- `packages/agent-core/src/computer-use/`  
- `design/specs/computer-use.md`  

---

## 3. P0 产品短锁（Enjoy）

### 3.1 定位

Computer Use = Enjoy **内建桌面操控能力**（可经 builtin tools 暴露给当前引擎会话），用于 GUI 验收/复现/点选，**不是**新 CLI、不是 Registry 插件店、不是云沙箱默认。

### 3.2 做（P0）

| 面 | 锁 |
|----|-----|
| **启用** | 设置 → **电脑操控**（或智能体工具）：总开关；首次引导 OS 权限（mac：屏幕录制+辅助功能；Win：前台可见诚实说明） |
| **试运行** | 「检测权限 / 拍一张屏」按钮；成功才标就绪 |
| **触发** | Composer：`@电脑` / 工具芯片「电脑」；自然语言「用电脑打开…」应路由到 CU 工具 |
| **工具最小集** | `screenshot` · `click` · `type` · `keypress` · `scroll` ·（可选）`move`；坐标与截图像素空间一致 |
| **审批** | 首次操控某 App → PermissionDock / 卡片：允许一次 / 总是允许 / 拒绝；敏感（支付/系统偏好）默认每次问 |
| **观察** | 会话内「电脑」步骤卡：缩略图 + 动作摘要；可点进大图；写入运行账本分组「电脑」 |
| **停止** | 随时停止 CU；用户键鼠介入 → 暂停自动操作并提示（能做则做，不能则诚实） |
| **与 Explore** | **探索模式禁止**写类 GUI 变更（点击提交/改设置）；只读截图可允许；执行模式才点改 |
| **失败态** | 固定文案：权限未开 / 无前台窗 / 坐标失败 / 引擎未暴露工具——附设置深链 |

### 3.3 不做

- 默认云端虚拟桌面  
- 解锁 Mac Locked-use（P2+）  
- 自动点系统权限框、自动管理员提权  
- 控制 Enjoy/终端以绕过审批（对齐 Codex 边界）  
- 假「已连接电脑」空成功  
- worktree 舰队；Registry 卖 CU  
- 用 CU 替代 MCP/Skills SoT  

### 3.4 验收（P0）

1. 冷启动：设置里能完成权限检测；失败有人话+系统设置指引。  
2. 执行模式下一句「用电脑打开计算器点 1+1」→ 出现审批 → 截图步骤可见 → 有结果或诚实失败。  
3. 探索模式：可截图，不可点改；尝试点改被拦并说明。  
4. 拒绝权限 / 关 Screen Recording：不空转成功。  
5. 停止按钮能打断后续 click/type。  

### 3.5 Luna 一句话

`design/previews/p0-computer-use.html`：设置「电脑操控」就绪/缺权限两态 + Composer `@电脑` + 会话步骤卡（缩略图）+ 审批卡（允许一次/总是）+ 探索拦截提示。反例：无脚注墙、无双引擎条。

---

## 4. 切片建议（给 host 排期）

| ID | 项 | 角色 | 级 |
|----|-----|------|-----|
| **CU-0** | 读齐 `computer-use.md` + tip `86228f9` 真表，改写本节「待核实」 | kai/mike | 先 |
| **CU-1** | 设置：启用/权限检测/就绪态 | luna→mike | **P0** |
| **CU-2** | 会话工具接通 + 步骤卡/账本 | luna→mike；agent-core kai | **P0** |
| **CU-3** | 按 App 审批 + Always allow | luna→mike；对齐 M2 Dock | **P0** |
| **CU-4** | Explore 拦截 GUI 变更 | mike + 产品文案 | **P0** |
| **CU-5** | Win 前台诚实文案；Linux 能力标 | mike | P1 |
| **CU-6** | Always-allow 设置页 | luna→mike | P1 |

**leo**：CU-1～4 合入前做架构审查（权限边界、与 HMAC/Explore、进程隔离）。

---

## 5. 参考链接

- Codex Computer Use（ChatGPT Learn）：https://learn.chatgpt.com/docs/computer-use  
- OpenAI API computer tool：https://developers.openai.com/api/docs/guides/tools-computer-use  
- Claude computer use tool：https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool  
- open-computer-use（MCP）：https://github.com/opensymph/open-computer-use  
- Windows-MCP：https://github.com/cursortouch/windows-mcp  

---

*调研稿。实现以仓库 `design/specs/computer-use.md` 与 tip `86228f9` 核实后为准；冲突先改 specs。*
