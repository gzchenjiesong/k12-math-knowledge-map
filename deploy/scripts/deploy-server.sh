#!/usr/bin/env bash
# 进度服务部署脚本（骨架）—— 具体参数待服务器信息到位后填充。
#
# 前置（本地，不入库）：
#   1. deploy/server/config.json 已填好 AppID/AppSecret/tokenSecret
#   2. 私钥文件路径已知（不入库，建议 chmod 600）
#   3. 域名已解析到服务器公网 IP，SSL 证书已配置（Nginx 层）
#
# 使用：bash deploy/scripts/deploy-server.sh <服务器公网IP> <SSH用户名> <私钥路径>
#
# 注意：本脚本不含任何默认地址或凭证，避免敏感信息入库。

set -euo pipefail
STAGE_IP="${1:?请传服务器公网 IP}"
STAGE_USER="${2:?请传 SSH 用户名}"
KEY_PATH="${3:?请传 SSH 私钥路径}"

SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)/server"
REMOTE_DIR="/opt/olympiad-progress"

echo "[1/4] 上传服务端代码（config.json 与 data/ 由 .gitignore 排除，不会上传）"
rsync -avz --exclude 'config.json' --exclude 'data/' \
  -e "ssh -i '$KEY_PATH'" \
  "$SRC_DIR"/ "${STAGE_USER}@${STAGE_IP}:${REMOTE_DIR}/"

echo "[2/4] 在远端填写 config.json（请手工在服务器上完成，勿经由 Git）"
echo "      远端路径：${REMOTE_DIR}/config.json"

echo "[3/4] 启动服务（首次；后续用 PM2/systemd 守护）"
ssh -i "$KEY_PATH" "${STAGE_USER}@${STAGE_IP}" \
  "cd ${REMOTE_DIR} && (command -v pm2 >/dev/null && pm2 restart olympiad-progress || node server.js) &"

echo "[4/4] 健康检查"
ssh -i "$KEY_PATH" "${STAGE_USER}@${STAGE_IP}" \
  "curl -fsS http://127.0.0.1:3001/api/health || echo '未就绪，请检查 config.json 与端口'"

echo "完成。记得在微信公众平台把 HTTPS 域名加入 request 合法域名白名单。"
