# spec/cli-usage

> 本机 CLI transcript 用量扫描（`observability.cliUsage`）。最后更新：2026-09-13
>
> UI 合同与「不是 L1」以 [`observability.md`](./observability.md) + [`m1-usage-and-capabilities.md`](./m1-usage-and-capabilities.md) 为准。本文只写扫描实现。旧 PR 计划（只扫 Claude/Codex、`source-chips.tsx` 平铺 12 粒、Gemini 标 unsupported）已作废，不要按它改代码。

## 当前真相

`collectCliTranscriptUsage(home)` 是唯一外部接口。catalog **12 源都扫盘**（claude / cursor / grok / codex / antigravity / gemini / opencode / pi / hermes / amp / deepseek / omp）：

- Grok：`usage-json`（`~/.grok/sessions/**/usage.json`）
- 其余：`jsonl`（家目录启发式 roots，见 `catalog.ts`）
- 没有 `scan: "none"`。契约四态仍含 `unsupported`，catalog **从不**走这条；目录不在 = `directory-missing`，有文件无 usage 字段 = `scanned-empty`（Cursor transcript 常如此）

UI：`#/observability`「本机记录」= 按 CLI 贡献列表 + 无用量源收起 + 日/模型/项目桶。不是 Composer `UsagePill`，不估单价，不把 prompt / jsonl 原文 / 绝对路径交给 renderer。

## 不变量

- renderer 只拿聚合数字。
- 本机记录不是 L1 额度条。
- 禁止读 Cursor `store.db`、Codex/Claude `auth.json`。

## 代码入口

- `apps/desktop/src/main/services/cli-transcript-usage/`（`catalog.ts` / `collect.ts` / `adapters/` / `parsers/`）
- IPC：`observability.cliUsage`
- UI：`observability/components/cli-usage/`

## 已知坑

- **隐患**：把本文旧 Overview 当缺口，把扫描「修回」只扫 Claude/Codex。正确做法：以 `catalog.ts` + `observability` 当前真相为准。
- **隐患**：把 `unsupported` /「本版本不扫描」写回 C 端。正常 12 源路径不应再出现该态。
- Cursor 无 usage 字段 → `scanned-empty` 是预期，不是漏扫 Enjoy 遥测。
- Codex 禁止把 `model_provider` 当模型名（会显示 `custom`）。
- gemini root 指向 `~/.gemini/config` 是启发式；多数机器 `directory-missing` 属预期，不要写成「已读真实 transcript」。
