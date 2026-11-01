# mike multi-tab real-run (box Electron)

- When: Asia/Shanghai 2026-11-01 ~21:07–21:16
- Worktree: `/workspace/enjoy-wt/mike-multi-tab` branch `mike/session-multi-tabs` (dirty tip then commit)
- Launch: `cd apps/desktop && pnpm dev -- --remote-debugging-port=9335` with `DISPLAY=:8`, `ENJOY_E2E_STUB=1`, `ENJOY_E2E_LANG=zh`, `ENJOY_E2E_CHAT_READY=key`, userdata under `/tmp/mike-mtab-ud-*`
- Helpers: `/tmp/mike-mtab/launch.sh` (adapted from luna patrol)

## Acceptance

| Point | Result | Evidence |
|---|---|---|
| Ctrl+click open tab / new-chat fills tabs | OK (seed→6 tabs; ctrl+click switches or opens) | `02-six-tabs.png` |
| Tab switch draft isolation | OK — A keep `草稿A-only`, B empty, back A restored | CDP verify |
| Close tab ≠ delete session | OK — tabs 6→5, sidebar stayed 7, closed sid still in sidebar | CDP verify |
| 0-tab empty copy | OK — `开一个新对话，或从左边选一个。` | `03-empty-zero-tabs.png` |
| 6-tab overflow Chinese toast | OK — `最多开 6 个标签，先关掉一个再开。` | CDP + `06-overflow-toast.png` |
| busy/wait dots copy | OK — `进行中` (accent) / `等你拍板` (chart-warning) | CDP aria-label + `07-*.png` |
| Narrow 733×480 | OK — window resized; strip `overflow-x: auto` | `04/05-narrow-*.png` |

