#!/bin/sh

# ============================================================
# NoteFlow 状态检查脚本
# 用法: ./status.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f deploy.config ]; then
  . ./deploy.config
fi

PORT="${PORT:-3000}"
PID_FILE="${PROJECT_DIR:-$SCRIPT_DIR}/.deploy.pid"

echo "========== NoteFlow 状态 =========="

# 分支信息
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "分支: $(git rev-parse --abbrev-ref HEAD)"
  echo "提交: $(git log --oneline -1)"
fi

# 进程状态
if [ -f "$PID_FILE" ]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    echo "状态: 运行中 (PID: $pid)"
    # 运行时长
    if command -v ps >/dev/null 2>&1; then
      elapsed=$(ps -p "$pid" -o etime= 2>/dev/null | xargs || echo "未知")
      echo "运行: $elapsed"
    fi
  else
    echo "状态: 已停止（PID 文件存在但进程不存在）"
    rm -f "$PID_FILE"
  fi
else
  # 检查进程
  port_pid=$(ps aux 2>/dev/null | grep "server/index.js" | grep -v grep | awk '{print $2}' | head -1 || true)
  if [ -n "$port_pid" ]; then
    echo "状态: 运行中 (PID: $port_pid，无 PID 文件)"
  else
    echo "状态: 未运行"
  fi
fi

# 端口检查
if curl -sf "http://localhost:$PORT/" -o /dev/null 2>/dev/null; then
  echo "服务: http://localhost:$PORT 可访问"
else
  echo "服务: http://localhost:$PORT 不可访问"
fi

echo "===================================="
