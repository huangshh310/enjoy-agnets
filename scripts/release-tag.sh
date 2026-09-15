#!/usr/bin/env bash
# 按 apps/desktop/package.json 的 version 打 v* tag 并推到 origin，触发 release.yml。
# 首次：./scripts/release-tag.sh
# CI 失败重试（不涨号）：./scripts/release-tag.sh --retry
# 只 force 该版本 tag，绝不 push main。
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

usage() {
  echo "usage: $0 [--retry]" >&2
  echo "  无参数   给当前 version 打 annotated tag 并推送" >&2
  echo "  --retry  同一 v* 移到 HEAD 再推（发版 CI 失败用，不要涨号）" >&2
  exit 2
}

retry=0
case "${1:-}" in
  "") ;;
  --retry) retry=1 ;;
  -h | --help) usage ;;
  *) usage ;;
esac

pkg="apps/desktop/package.json"

# 工作区与 HEAD 必须同一 version；未提交的涨号不能打 tag，否则 CI 校验会对不上。
work_version="$(node -p "require('./${pkg}').version")"
head_version="$(git show "HEAD:${pkg}" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")"

if [[ "$work_version" != "$head_version" ]]; then
  echo "error: $pkg working tree is $work_version but HEAD is $head_version; commit the version first" >&2
  exit 1
fi

tag="v${head_version}"

if [[ "$retry" -eq 0 ]] && git rev-parse "$tag" >/dev/null 2>&1; then
  echo "error: tag $tag already exists. CI 失败请用 --retry，不要改 version" >&2
  exit 1
fi

if [[ "$retry" -eq 1 ]]; then
  git tag -f -a "$tag" -m "$tag"
  git push -f origin "refs/tags/${tag}"
  echo "moved $tag -> $(git rev-parse --short HEAD) and pushed"
else
  git tag -a "$tag" -m "$tag"
  git push origin "refs/tags/${tag}"
  echo "pushed $tag -> $(git rev-parse --short HEAD)"
fi
