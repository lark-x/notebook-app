#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# NoteFlow 停止脚本
# 用法: ./stop.sh [--force]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 加载配置
if [[ -f deploy.config ]]; then
  source deploy.config
fi

PORT="${PORT:-3000}"
PID_FILE="${PROJECT_DIR:-$SCRIPT_DIR}/.deploy.pid"
FORCE=false

[[ "${1:-}" == "--force" ]] && FORCE=true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

stopped=false

# 方式1：通过 PID 文件停止
if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    log "停止 NoteFlow 服务 (PID: $pid)..."

    if [[ "$FORCE" == "true" ]]; then
      kill -9 "$pid" 2>/dev/null || true
      log "已强制终止进程 $pid"
    else
      # 先发 SIGTERM，给进程优雅退出的机会
      kill "$pid" 2>/dev/null || true

      # 等待退出，最多 10 秒
      for i in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
          log "进程已退出"
          stopped=true
          break
        fi
        sleep 1
      done

      # 还没退出则 SIGKILL
      if [[ "$stopped" != "true" ]]; then
        log "进程未响应 SIGTERM，强制终止..."
        kill -9 "$pid" 2>/dev/null || true
        log "已强制终止进程 $pid"
      fi
    fi
  else
    log "PID 文件中的进程 ($pid) 已不存在"
  fi
  rm -f "$PID_FILE"
  stopped=true
fi

# 方式2：兜底 — 查找 server/index.js 进程
server_pids=$(ps aux 2>/dev/null | grep "server/index.js" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$server_pids" ]]; then
  if [[ "$stopped" != "true" ]]; then
    log "未找到 PID 文件，清理残留 server 进程..."
  fi
  for p in $server_pids; do
    kill "$p" 2>/dev/null || true
    log "已终止进程 $p"
  done
  sleep 1
fi

log "NoteFlow 服务已停止"
