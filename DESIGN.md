# DESIGN.md — Enjoy Agents 视觉与设计系统规约

> 本文件是 Enjoy Agents 面向开发者与 Coding Agent 的**权威设计规约**。
> 任何 UI 组件、页面或生成式 UI 的创建与改造，必须严格遵守本文件定义的品味、Token 词表、信息层级与反模式禁令。
> 对应底层规范：[`design/specs/ui.md`](./design/specs/ui.md) | 视觉全书：[`design/references/visual-system.md`](./design/references/visual-system.md)

---

## 1. 核心定位与读者心智 (Core Identity & Reader's Job)

* **产品定位**：本地优先的专业 Agent IDE（桌面级高密度工具），**不是**营销落地页或通用 SaaS 控制台。
* **物理画布结构**：
  * 画布底色为 `background/full`（Mist 浅色 `#F7F7F7` / 炭黑暗色 `#121212`）。
  * 主工作区由三张 24px 圆角浮动卡片组成（Agent Rail 侧栏、Chat 舞台、Changes 变更面板），卡片间保持 12px 物理间隙，禁止融成单块白矩形。
* **二级页与 Studio**：
  * 采用 **非对称 Bento 网格**（Density 6, Variance 5），优先以高密度数据与微件呈现。
  * 顶部采用紧凑型面包屑与操作工具栏，首屏直入工作数据与状态流，禁止居中大 Hero。

---

## 2. 信息层级与可观测规则 (Observable Design Rules)

1. **证据优先 (Evidence-First Hierarchy)**：
   * 必须先呈现核心结论、推荐结果或脉冲指标（Pulse Stat），再展开支持性数据网格与日志证据。
   * 支持性细节（如 JSON Payload、思考轨迹）默认提供折叠/展开能力，不与主指标抢夺视觉中心。
2. **证据表格占满可用宽度 (Full-Width Evidence Tables)**：
   * 所有数据表格、文件矩阵、权限列表必须占满容器可用宽度（`w-full`），并配备横向滚动（`overflow-x-auto`）。
3. **状态清晰与非对称视觉节奏 (Visual Rhythm)**：
   * 多个统计微件并列时，根据信息权重使用不同跨度（`col-span-1` vs `col-span-2`），打破单调平铺。
4. **视口与自适应布局 (Viewport Adaptation)**：
   * 根容器高度使用 `min-h-[100dvh]` 或 `h-full`，**严禁**使用 `h-screen`（防止移动端/桌面缩放时视口溢出截断）。

---

## 3. 严格受限的 Token 词表 (Bounded Vocabulary)

**严禁模型自由发明原生样式，所有 UI 必须使用以下 BoardUI 语义 Token**：

### 3.1 复合字号工具类 (Composite Typography)
> 自动同时设置 `font-size`、`line-height`、`letter-spacing` 与 `font-weight`，严禁拆分手动拼装。

| 工具类名 | 适用层级 |
|---|---|
| `text-title-1-bold` / `text-title-1-semibold` | 顶级页面标题 (24px) |
| `text-title-2-semibold` / `text-title-2-medium` | 模块/卡片组大标题 (20px) |
| `text-title-3-semibold` / `text-title-3-medium` | 抽屉/弹窗/区域标题 (16px) |
| `text-headline-medium` / `text-headline-regular` | 重点小标题、强调文本 (14px/1.4) |
| `text-body-medium` / `text-body-regular` | 默认正文、说明段落 (14px/1.5) |
| `text-caption-1-medium` / `text-caption-1-regular` | 次级正文、表格正文、表单标签 (12px) |
| `text-caption-2-medium` / `text-caption-2-semibold` | 徽标、微状态、元数据胶囊、时间戳 (11px) |

### 3.2 语义颜色与表面 (Semantic Surfaces & Colors)

| 语义角色 | Tailwind 类名 | 用途说明 |
|---|---|---|
| **底板画布** | `bg-background-full` | 窗口底层 Mist / 炭黑画布 |
| **主卡片表面** | `bg-background-primary-default` | 核心对话卡片、弹窗、活动卡片 |
| **次级/嵌套表面** | `bg-background-secondary-default` | 侧边栏、代码块、Bento 微件容器 |
| **三级/悬浮表面** | `bg-background-tertiary-default` | 按钮悬浮、输入框聚焦、深色徽标底 |
| **主文本** | `text-text-primary` | 标题、强调内容、主要可读正文 |
| **次级文本** | `text-text-secondary` | 辅助说明、表单 Label、中等重要度信息 |
| **弱化文本** | `text-text-tertiary` | 时间戳、占位符、次要元数据 |
| **强调色 (Signal Blue)** | `accent-500` / `text-accent-500` | 全局单一主要强调色（交互焦点、激活态） |
| **状态反馈** | `emerald-500` / `amber-500` / `rose-500` | 成功/已就绪、警示/审批、失败/拒绝 |
| **边框与分割线** | `border-border-button-default` / `border-separator-border` | 语义边框（严禁使用未定义的野生边框类名） |

---

## 4. 八大显式命名的劣质 AI 模式禁令 (Named Anti-Patterns)

Coding Agent 在生成或修改 UI 时，**绝对禁止**以下 8 种模式：

```
                    ┌──────────────────────────────────────────────┐
                    │      8 Named AI-Generated Anti-Patterns      │
                    ├──────────────────────────────────────────────┤
                    │  1. [Centered-Marketing-Hero]                │
                    │  2. [Generic-SaaS-Card]                      │
                    │  3. [Invented-Raw-Styles]                    │
                    │  4. [Cramped-Evidence-Table]                 │
                    │  5. [Deconstructed-Typography]               │
                    │  6. [Viewport-Trapped-Layout]                │
                    │  7. [Fake-Status-Chrome]                     │
                    │  8. [Unsafe-Native-Dialog]                   │
                    └──────────────────────────────────────────────┘
```

### 1. `[Centered-Marketing-Hero]`
* ❌ **错误**：页面顶部放置巨大的居中标题、空泛的宣传标语和占满半屏的营销大图。
*  **正确**：顶部使用 `Breadcrumb` + 紧凑操作栏，下方立即呈现数据总览或操作面板。

### 2. `[Generic-SaaS-Card]`
* ❌ **错误**：无脑平铺 4 个一模一样尺寸、居中大数字的白底卡片。
*  **正确**：非对称 Bento 结构（结合脉冲指标 `PulseStat`、活动趋势、快捷指令）。

### 3. `[Invented-Raw-Styles]`
* ❌ **错误**：手写十六进制色值（`#1e293b`、`#ffffff`、`#000000`）或非标准颜色（`bg-slate-800`）。
*  **正确**：严格使用语义 Token（`bg-background-secondary-default`、`text-text-primary`）。

### 4. `[Cramped-Evidence-Table]`
* ❌ **错误**：数据、日志或文件列表被限制在窄容器中，导致列内容严重截断或换行混乱。
*  **正确**：表格必须容器全宽（`w-full`），外层包裹 `overflow-x-auto`，自适应内容。

### 5. `[Deconstructed-Typography]`
* ❌ **错误**：随意拼接 `text-[12px] font-bold leading-5`。
*  **正确**：使用语义复合字号（如 `text-caption-1-bold`）。

### 6. `[Viewport-Trapped-Layout]`
* ❌ **错误**：在容器上滥用 `h-screen`，在有导航栏或桌面缩放时产生不可见溢出或双重滚动条。
*  **正确**：使用 `min-h-[100dvh]`、`h-full` 或结合 `flex-1 overflow-y-auto`。

### 7. `[Fake-Status-Chrome]`
* ❌ **错误**：在没有真实工具调用或推理时，渲染伪造的 Thinking 展开面板或空工具调用胶囊。
*  **正确**：基于 `StreamEvent v2` 生命周期，仅在有真实内容时渲染对应的 `ToolChips` 或 `LoadingState`。

### 8. `[Unsafe-Native-Dialog]`
* ❌ **错误**：在 Electron 中调用原生 `window.confirm` 或 `alert`（会导致窗口标题泄露为 `@enjoy-agents/desktop`）。
*  **正确**：使用应用内置的 `ConfirmDialog` / `Dialog` 组件。

---

## 5. 组件原语索引 (Component Primitives)

在编写或生成组件时，优先从 `@enjoy-agents/ui` 或 `@/components/ui` 导入：

```typescript
// 基础控件
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb"

// AI 交互与流式原语
import { LoadingState } from "@enjoy-agents/ui"
import { ToolChips, FileChangeChips } from "@enjoy-agents/ui"
import { ThemeToggle } from "@enjoy-agents/ui"
import { BorderBeam } from "@enjoy-agents/ui"

// 工具函数
import { cx } from "@/utils/cx"
import { cn } from "@/lib/utils"
```
