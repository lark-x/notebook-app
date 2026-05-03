#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# NoteFlow 重启脚本
# 用法: ./restart.sh [--branch <分支名>] [--no-pull] [--no-install]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "========== NoteFlow 重启 =========="

# 停止
if [[ -f stop.sh ]]; then
  bash stop.sh
fi

# 部署
if [[ -f deploy.sh ]]; then
  bash deploy.sh "$@"
else
  log "ERROR: 未找到 deploy.sh"
  exit 1
fi
