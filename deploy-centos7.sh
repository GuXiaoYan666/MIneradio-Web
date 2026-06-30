#!/bin/bash
# Mineradio CentOS 7 部署脚本
# 用法: chmod +x deploy-centos7.sh && ./deploy-centos7.sh

set -e

echo "=========================================="
echo "  Mineradio CentOS 7 部署脚本"
echo "=========================================="

APP_DIR="/opt/mineradio"
NODE_VERSION="18.20.4"

# ---------- 1. 检查并安装依赖 ----------
echo "[1/7] 检查系统依赖..."

# 安装 EPEL 和基础工具
yum install -y epel-release curl wget git vim > /dev/null 2>&1 || true

# 安装 Puppeteer/Chromium 运行所需库
echo "[2/7] 安装 Chromium 依赖库..."
yum install -y \
  pango.x86_64 \
  libXcomposite.x86_64 \
  libXcursor.x86_64 \
  libXdamage.x86_64 \
  libXext.x86_64 \
  libXi.x86_64 \
  libXtst.x86_64 \
  cups-libs.x86_64 \
  libXScrnSaver.x86_64 \
  libXrandr.x86_64 \
  GConf2.x86_64 \
  alsa-lib.x86_64 \
  atk.x86_64 \
  gtk3.x86_64 \
  ipa-gothic-fonts \
  xorg-x11-fonts-100dpi \
  xorg-x11-fonts-75dpi \
  xorg-x11-utils \
  xorg-x11-fonts-cyrillic \
  xorg-x11-fonts-Type1 \
  xorg-x11-fonts-misc \
  nss.x86_64 \
  libxss.so.1 \
  > /dev/null 2>&1 || true

# 更新 nss 库（解决 Chromium 启动问题）
yum update -y nss > /dev/null 2>&1 || true

# ---------- 2. 安装 Node.js ----------
echo "[3/7] 安装 Node.js ${NODE_VERSION}..."

if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    # 下载并安装 Node.js 18
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz
    tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm -f /tmp/node.tar.xz
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# ---------- 3. 安装 PM2 ----------
echo "[4/7] 安装 PM2 进程管理器..."
npm install -g pm2

# ---------- 4. 创建应用目录并部署 ----------
echo "[5/7] 部署应用到 ${APP_DIR}..."

mkdir -p ${APP_DIR}
cd ${APP_DIR}

# 如果已有代码，先备份
if [ -d "${APP_DIR}/public" ]; then
    echo "检测到已有部署，备份中..."
    mv ${APP_DIR} ${APP_DIR}-backup-$(date +%Y%m%d%H%M%S)
    mkdir -p ${APP_DIR}
    cd ${APP_DIR}
fi

# 注意：实际部署时请手动上传代码或使用 git clone
# git clone https://github.com/your-repo/mineradio.git . 2>/dev/null || true

echo "请确保已将代码上传到 ${APP_DIR}"
echo "  - server.js"
echo "  - public/"
echo "  - puppeteer-login.js"
echo "  - package.json"

# 检查代码是否存在
if [ ! -f "${APP_DIR}/server.js" ]; then
    echo "警告: 未找到 server.js，请手动上传代码到 ${APP_DIR}"
    echo "  scp -r mineradio-web/* root@your-server:${APP_DIR}/"
    exit 1
fi

# 安装依赖（跳过 puppeteer 自动下载 Chromium，使用系统 Chromium）
echo "[6/7] 安装 npm 依赖..."
cd ${APP_DIR}

# 设置 puppeteer 使用系统 Chromium
export PUPPETEER_SKIP_DOWNLOAD=true
npm install

# 安装 puppeteer 但跳过 Chromium 下载（CentOS 7 自带 Chromium 安装困难）
# 如果系统没有 Chromium，可以手动安装或跳过 puppeteer 功能
npm install puppeteer --no-save || true

# ---------- 5. 配置 PM2 ----------
echo "[7/7] 配置 PM2 服务..."

# 创建 PM2 配置文件
cat > ${APP_DIR}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mineradio',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PUPPETEER_SKIP_DOWNLOAD: 'true',
      PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser'
    },
    log_file: '/var/log/mineradio/app.log',
    out_file: '/var/log/mineradio/out.log',
    error_file: '/var/log/mineradio/err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    pid_file: '/var/run/mineradio.pid'
  }]
};
EOF

# 创建日志目录
mkdir -p /var/log/mineradio

# 启动/重启应用
pm2 delete mineradio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd 2>/dev/null || true

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "应用已启动在: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "常用命令:"
echo "  pm2 status          - 查看运行状态"
echo "  pm2 logs mineradio  - 查看日志"
echo "  pm2 restart mineradio - 重启应用"
echo "  pm2 stop mineradio  - 停止应用"
echo ""
echo "如需配置 Nginx 反向代理，请查看 deploy/nginx-centos7.conf"
