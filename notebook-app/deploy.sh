#!/bin/sh
set -eu

# ============================================================
# NoteFlow 部署脚本
# 用法: ./deploy.sh [--branch <分支名>] [--no-pull] [--no-install]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 加载配置
if [ -f deploy.config ]; then
  . ./deploy.config
fi

# 命令行参数覆盖
while [ $# -gt 0 ]; do
  case "$1" in
    --branch)   BRANCH="$2"; shift 2 ;;
    --no-pull)  GIT_PULL=false; shift ;;
    --no-install) INSTALL_DEPS=false; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# 默认值
PORT="${PORT:-3000}"
LOG_DIR="${LOG_DIR:-logs}"
GIT_PULL="${GIT_PULL:-true}"
INSTALL_DEPS="${INSTALL_DEPS:-true}"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
NODE_BIN="${NODE_BIN:-node}"

PID_FILE="$PROJECT_DIR/.deploy.pid"
LOG_FILE="$PROJECT_DIR/$LOG_DIR/server.log"

# ============================================================
# 辅助函数
# ============================================================

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { log "ERROR: $*" >&2; exit 1; }

check_deps() {
  command -v "$NODE_BIN" >/dev/null 2>&1 || err "未找到 Node.js ($NODE_BIN)"
  command -v git >/dev/null 2>&1 || err "未找到 git"
  local node_ver
  node_ver=$("$NODE_BIN" -v | sed 's/v//' | cut -d. -f1)
  [ "$node_ver" -ge 18 ] || err "需要 Node.js >= 18，当前: $("$NODE_BIN" -v)"
}

# 停止已有进程
stop_existing() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      log "停止已有进程 (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      # 等待进程退出，最多 10 秒
      for i in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
      # 还没退出则强制 kill
      if kill -0 "$pid" 2>/dev/null; then
        log "进程未响应，强制终止..."
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$PID_FILE"
  fi

  # 兜底：杀掉 server/index.js 残留进程
  local server_pids
  server_pids=$(ps aux 2>/dev/null | grep "server/index.js" | grep -v grep | awk '{print $2}' || true)
  if [ -n "$server_pids" ]; then
    log "清理残留 server 进程 ($server_pids)..."
    for p in $server_pids; do
      kill "$p" 2>/dev/null || true
    done
    sleep 1
  fi
}

# Git 操作
do_git() {
  if [ "$GIT_PULL" != "true" ]; then
    log "跳过 git 拉取"
    return
  fi

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  log "当前分支: $current_branch"

  if [ -n "$BRANCH" ] && [ "$BRANCH" != "$current_branch" ]; then
    log "切换分支: $current_branch → $BRANCH"
    # 检查是否有未提交的更改
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
      log "检测到未提交的更改，暂存中..."
      git stash push -m "deploy-stash-$(date +%s)"
    fi
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
  else
    log "拉取最新代码 ($current_branch)..."
    git pull origin "$current_branch" 2>/dev/null || {
      log "git pull 失败（可能无远程或网络问题），继续使用本地代码"
    }
  fi

  local new_branch new_commit
  new_branch=$(git rev-parse --abbrev-ref HEAD)
  new_commit=$(git log --oneline -1)
  log "分支: $new_branch | 提交: $new_commit"
}

# 安装依赖
do_install() {
  if [ "$INSTALL_DEPS" != "true" ]; then
    log "跳过依赖安装"
    return
  fi

  # 服务端依赖
  if [ -f package.json ]; then
    log "安装服务端依赖..."
    npm install --production 2>&1 | tail -3
  fi

  # 客户端依赖
  if [ -f client/package.json ]; then
    log "安装客户端依赖..."
    (cd client && npm install 2>&1 | tail -3)
  fi
}

# 构建客户端
do_build() {
  if [ -f client/package.json ]; then
    log "构建客户端..."
    (cd client && ./node_modules/.bin/vite build 2>&1 | tail -5)
    log "构建完成"
  fi
}

# 启动服务
do_start() {
  mkdir -p "$LOG_DIR"

  log "启动服务 (端口: $PORT)..."

  # 导入 .env（如果存在）
  if [ -f .env ]; then
    set -a; . ./.env; set +a
  fi

  PORT="$PORT" "$NODE_BIN" server/index.js > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  # 等待启动
  sleep 2

  if kill -0 "$pid" 2>/dev/null; then
    # 健康检查
    if curl -sf "http://localhost:$PORT/api/login" -o /dev/null -w '' 2>/dev/null ||
       curl -sf "http://localhost:$PORT/" -o /dev/null -w '' 2>/dev/null; then
      log "========================================="
      log "  NoteFlow 部署成功!"
      log "  地址: http://localhost:$PORT"
      log "  PID:  $pid"
      log "  日志: $LOG_FILE"
      log "  分支: $(git rev-parse --abbrev-ref HEAD)"
      log "  提交: $(git log --oneline -1)"
      log "========================================="
    else
      log "服务已启动但健康检查未通过，请检查日志: $LOG_FILE"
    fi
  else
    err "服务启动失败，请查看日志: $LOG_FILE"
  fi
}

# ============================================================
# 主流程
# ============================================================

log "========== NoteFlow 部署开始 =========="
check_deps
stop_existing
do_git
do_install
do_build
do_start
log "========== 部署完成 =========="
