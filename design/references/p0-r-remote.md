# Enjoy：远程（Remote）第一刀定义

> 计划落地：`design/references/p0-r-remote.md` + 预览 `design/previews/p0-r-remote-workspace.html`  
> 产品 · 2026-09-13 · 用户定调：基础完善 + 创新 + **需要远程**  
> 不挡 P0-F；假 BYOK / 沙箱上轨 / worktree 仍砍

---

## 1. Enjoy 语境下「远程」指什么（本刀）

**P0-R = 远程工作区（SSH 开发机）**

| 层 | 落点 |
|----|------|
| UI / 审批 / 会话列表 | **仍在本机 Enjoy**（Local-first 壳） |
| 工作区文件、终端、Agent CLI spawn cwd | **远端机器**（用户已有 SSH 可达的开发机/容器） |
| 模型密钥 | 本机 vault 或远端 CLI 官方登录（规则与现网一致，不因远程改假 BYOK） |

**本刀不是**：

- 云多租户 / 团队远端组织（qm）  
- 把「进阶沙箱 / Harness」搬上 Composer 引擎导轨  
- Enjoy 托管的云 Agent 订阅  
- worktree 舰队  

**P1 候选（本刀不做）**：OpenHands 式远程 Agent Server（整段 Agent 进程在远端 API 后）；只读同步云工作区。

---

## 2. 与已砍项的边界

| 已砍 | 远程怎么避免踩线 |
|------|------------------|
| 沙箱上轨 | 远程是 **工作区位置**，不是新引擎；导轨仍 Enjoy 本地 / ACP CLI；沙箱配置仍只在设置 |
| worktree | 远端可以是单 repo 路径；**不**自动为每会话开 worktree |
| 假 BYOK | Cursor/Grok 等仅官方登录规则不变；远端只换 spawn/cwd 主机 |

一句话：**远程 = 工作区在哪台机器，不是第三种「远程引擎」挤进导轨。**

---

## 3. Local-first 诚实态

| 态 | 用户可见 |
|----|----------|
| 未配置 | 工作区选择：「本机文件夹」/「远程 SSH…」；默认本机 |
| 连接中 | 顶条「正在连接 user@host…」；不可发送 Agent |
| 已连接 | 顶条「远程 · user@host · ~/proj」；文件/终端/CLI 均打标「远程」 |
| 失败 | 「连接失败 · {短原因}」+ 重试；不假在线 |
| 断开 | 会话可只读回看本机已拉元数据；写盘/跑 Agent 禁用直到重连 |

**数据落哪（P0）**：

- 会话 transcript / 设置：默认 **本机**（与现 SQLite 一致）  
- 代码与 CLI 副作用：只在 **远端磁盘**  
- 不默认同步整仓到本机（避免假「本地副本」）

**密钥边界**：

- Enjoy Providers vault：本机  
- 远端 CLI 登录：留在远端家目录；本机不偷读 `auth.json`  
- SSH：本机 ssh agent / 密钥；UI 不粘贴私钥进聊天  

---

## 4. 对标（可抄 / 不可抄）

| 参考 | 可抄 | 不可抄 |
|------|------|--------|
| **OpenHands** 远程 Agent Server / 多后端 | 「本机 UI + 可选远端执行」分层；连接/后端选择诚实 | 默认云后端；整段产品云化 |
| **Synara** 环境 / 任务绑定机器感 | 任务/工作区标明环境 | worktree 并行环境舰队 |
| **qm** | （几乎不抄）隔离与审批梯度已有本地版 | 每人云沙箱 / Slack 多玩家 |

---

## 5. P0-R 切片

**用户故事**：我在笔记本开 Enjoy，SSH 到公司开发机，用已装的 Claude/Codex 改远端仓库，审批仍在本机点。

**范围**：

1. 工作区模型增加 `local | ssh`  
2. SSH 配置抽屉：host / user / port / 认证方式（agent/密钥路径）/ 远端路径  
3. 连接态顶条 + 失败重试  
4. 文件树 / 终端 / Agent spawn 走远端（实现可先：远端 cwd + ssh 包装或已有 remote-fs 方案，由工程选）  
5. Composer 脚注「远程工作区」；探索/执行规则不变  

**非目标**：内嵌远程桌面、自动装远端 CLI、云账号、沙箱上轨、worktree。

**验收**：

1. 本机工作区行为回归不变  
2. SSH 连上后读文件路径在远端  
3. 断线不能静默写盘  
4. 导轨无「远程引擎」项  
5. 仅官方 CLI 不因远程出现假 vault  

---

## 6. luna 原型短稿

**路径**：`design/previews/p0-r-remote-workspace.html`  
**参考文**：`design/references/p0-r-remote.md`（本文）

请画：

1. 工作区切换：「本机」vs「远程 SSH」  
2. SSH 配置抽屉（无协议堆砌）  
3. 已连接顶条 + 失败条  
4. Composer 一小行「远程 · host:path」  
5. 文案表：远程 ≠ 引擎；沙箱仍去设置  

点头后开预览入库 → 云端实现。可与 F/G 并行设计，实现可排在 H 前后由 host 调度（建议 **G 合后插队 R 或 H 后**，因基础面大）。

---

*第一页方案结束。*
