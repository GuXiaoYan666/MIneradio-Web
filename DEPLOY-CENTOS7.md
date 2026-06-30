# Mineradio CentOS 7 部署指南

## 前置条件

- CentOS 7 服务器（建议 2GB+ 内存）
-  root 或 sudo 权限
-  已开放 80/443/3000 端口（防火墙）

## 快速部署步骤

### 1. 上传代码到服务器

```bash
# 本地执行（压缩后上传）
cd mineradio-web
zip -r mineradio.zip . -x "node_modules/*" ".git/*"
scp mineradio.zip root@your-server:/tmp/

# 服务器上解压
ssh root@your-server
mkdir -p /opt/mineradio
cd /opt/mineradio
unzip /tmp/mineradio.zip
```

### 2. 运行部署脚本

```bash
cd /opt/mineradio
chmod +x deploy-centos7.sh
./deploy-centos7.sh
```

### 3. 配置 Nginx（推荐）

```bash
# 安装 Nginx
yum install -y nginx

# 复制配置文件
cp nginx-centos7.conf /etc/nginx/conf.d/mineradio.conf

# 测试并启动
nginx -t
systemctl start nginx
systemctl enable nginx

# 配置防火墙
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 4. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 certbot
yum install -y certbot-nginx

# 申请证书（替换为你的域名）
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期测试
certbot renew --dry-run
```

## CentOS 7 特殊注意事项

### Node.js 版本

CentOS 7 默认 Node.js 版本过旧（6.x），**必须**升级到 18+：

```bash
# 方式1：NodeSource 仓库（推荐）
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 方式2：二进制直接安装
curl -fsSL https://nodejs.org/dist/v18.20.4/node-v18.20.4-linux-x64.tar.xz -o /tmp/node.tar.xz
tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
```

### Puppeteer / Chromium 问题

CentOS 7 的 Chromium 依赖非常麻烦。有三种方案：

**方案 A：跳过 Puppeteer（最简单）**
```bash
export PUPPETEER_SKIP_DOWNLOAD=true
npm install
```
- 扫码登录功能将不可用，但其他功能正常

**方案 B：手动安装 Chromium 依赖**
```bash
# 安装所有依赖库
yum install -y pango libXcomposite libXcursor libXdamage libXext libXi \
  libXtst cups-libs libXScrnSaver libXrandr GConf2 alsa-lib atk gtk3 \
  nss libxss xorg-x11-fonts-* xorg-x11-utils

# 下载 Chromium
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
yum localinstall -y google-chrome-stable_current_x86_64.rpm
```

**方案 C：使用 Docker 部署（推荐）**
如果 CentOS 7 环境太旧，建议用 Docker 运行：
```bash
# 安装 Docker
yum install -y docker
systemctl start docker

# 使用 Dockerfile 构建
docker build -t mineradio .
docker run -d -p 3000:3000 --name mineradio mineradio
```

### 内存优化

CentOS 7 小内存服务器建议：

```bash
# 限制 Node.js 内存使用
export NODE_OPTIONS="--max-old-space-size=512"

# PM2 配置中已设置 max_memory_restart: '512M'
```

## 环境变量配置

创建 `.env` 文件：

```bash
cat > /opt/mineradio/.env << 'EOF'
# 服务端口
PORT=3000

# Spotify OAuth（可选，如不需要可留空）
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/spotify/oauth/callback

# 禁用 Puppeteer 自动下载（CentOS 7 建议）
PUPPETEER_SKIP_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
EOF
```

## 故障排查

### 端口被占用
```bash
# 检查 3000 端口
ss -tlnp | grep 3000
# 或
lsof -i :3000

# 释放端口
kill -9 $(lsof -t -i:3000)
```

### 日志查看
```bash
# PM2 日志
pm2 logs mineradio

# 系统日志
journalctl -u nginx -f
```

### 权限问题
```bash
# 确保目录权限正确
chown -R root:root /opt/mineradio
chmod 755 /opt/mineradio
```

### 防火墙
```bash
# 检查防火墙状态
firewall-cmd --list-all

# 开放端口
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

## 更新部署

```bash
cd /opt/mineradio
# 上传新代码
# ...

# 安装依赖
npm install

# 重启服务
pm2 restart mineradio
```
