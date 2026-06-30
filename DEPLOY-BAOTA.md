# Mineradio 宝塔面板部署指南（完整版）

> 适用环境：CentOS 7/8、Ubuntu、Debian + 宝塔面板 + 自有域名

## 目录

1. [前置准备](#前置准备)
2. [方案一：同域名部署（推荐）](#方案一同域名部署推荐)
3. [方案二：前后端分离部署](#方案二前后端分离部署)
4. [宝塔详细步骤](#宝塔详细步骤)
5. [常见问题](#常见问题)
6. [更新维护](#更新维护)

---

## 前置准备

- 已安装宝塔面板（推荐 7.9+ 版本）
- 已解析域名到服务器 IP（如 `music.yourdomain.com`）
- 已安装宝塔插件：**Nginx**、**Node 版本管理器**（可选）
- 服务器内存 ≥ 2GB（推荐 4GB，Puppeteer 需要内存）
- 已开放防火墙端口：80、443、3000（或自定义后端端口）
- **⚠️ CentOS 7 用户注意**：glibc 版本限制，只能使用 Node.js 16.x，详见下方步骤 3

---

## 方案一：同域名部署（推荐）

**架构**：Nginx  serving 静态文件 + 反向代理 `/api` → Node.js

```
用户 → Nginx (80/443) → 静态文件 (index.html 等)
                    ↓
              反向代理 /api/* → Node.js (localhost:3000)
```

### 优势
- 一个域名搞定，无需跨域
- SSL 只配置一次
- 最简单、最稳定

### 步骤

#### 1. 上传代码

```bash
# 本地打包（排除 node_modules）
cd mineradio-web
zip -r mineradio.zip . -x "node_modules/*" ".git/*" "*.log"

# 上传到服务器
scp mineradio.zip root@your-server:/tmp/

# 服务器上解压
ssh root@your-server
mkdir -p /www/wwwroot/music.yourdomain.com
cd /www/wwwroot/music.yourdomain.com
unzip /tmp/mineradio.zip
```

或用宝塔面板的 **文件管理器** 直接上传 zip 并解压。

#### 2. 安装 Node.js

> **⚠️ CentOS 7 重要提示**：CentOS 7 的 glibc 版本为 2.17，不支持 Node.js 18+。请使用 **Node.js 16.x**。

**方式 A：宝塔 Node 版本管理器（推荐）**

1. 宝塔面板 → 软件商店 → 搜索 "Node" → 安装 **Node.js 版本管理器**
2. 点击设置 → 安装 **Node.js 16.20.2**（CentOS 7 最高支持版本）
3. 安装完成后，命令行执行：`node -v` 确认版本为 v16.x.x

**方式 B：手动安装（Node 版本管理器安装失败时）**

```bash
# SSH 到服务器执行
# 使用 NodeSource 安装 Node 16
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs
node -v   # 应显示 v16.x.x

# 如果上述失败，直接用二进制
curl -fsSL https://nodejs.org/dist/v16.20.2/node-v16.20.2-linux-x64.tar.xz -o /tmp/node.tar.xz
tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
node -v
```

#### 3. 安装依赖

```bash
cd /www/wwwroot/music.yourdomain.com

# 安装生产依赖（跳过 Puppeteer 自动下载，手动处理）
npm install --production

# 如果需要扫码登录，安装 Puppeteer 和 Chromium
npm install puppeteer

# CentOS 7 需要额外安装 Chromium 依赖（详见下方常见问题）
```

#### 4. 配置环境变量

```bash
cd /www/wwwroot/music.yourdomain.com
cat > .env << 'EOF'
# 服务端口号（Nginx 会反向代理到此端口）
PORT=3000

# 前端公开的 API 基地址（同域名部署时留空，使用相对路径）
# 如果前后端分离部署，填写 https://api.yourdomain.com
API_BASE_URL=

# Spotify OAuth（可选，不需要可留空）
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://music.yourdomain.com/api/spotify/oauth/callback

# Puppeteer 配置
PUPPETEER_SKIP_DOWNLOAD=false
# 如果系统自动检测到 Chrome 路径，可留空；否则手动指定
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
EOF
```

#### 5. 修改前端 API 基地址配置

如果前后端同域名，前端默认使用相对路径 `/api/...`，**无需修改**。

如果前端打包后需要指定不同域名，编辑 `public/index.html` 中的 `API_BASE` 配置（搜索 `API_BASE` 或 `apiBase`）。

#### 6. 用 PM2 启动后端服务

```bash
cd /www/wwwroot/music.yourdomain.com

# 安装 PM2（全局）
npm install -g pm2

# 启动服务
pm2 start server.js --name mineradio \
  --env production \
  --max-memory-restart 512M \
  --restart-delay 3000

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup

# 查看状态
pm2 status
pm2 logs mineradio
```

**宝塔面板方式**：
- 宝塔 → 网站 → 点击域名 → Node 项目 → 添加 Node 项目
- 项目目录：`/www/wwwroot/music.yourdomain.com`
- 启动文件：`server.js`
- 端口：`3000`
- 运行用户：`www`

#### 7. 配置 Nginx 反向代理

宝塔面板 → 网站 → 添加站点：
- 域名：`music.yourdomain.com`
- 根目录：`/www/wwwroot/music.yourdomain.com/public`
- 类型：静态（或 PHP）

然后点击 **设置** → **配置文件**，在 `server` 块内添加：

```nginx
# 反向代理 API 请求到 Node.js
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 超时设置（扫码登录可能需要较长时间）
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# 静态资源缓存（可选）
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**宝塔可视化方式**：
- 网站 → 设置 → 反向代理 → 添加反向代理
- 代理名称：`api`
- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`

#### 8. 配置 SSL（HTTPS）

宝塔面板 → 网站 → 设置 → SSL：
- 选择 **Let's Encrypt**
- 勾选域名：`music.yourdomain.com`
- 点击 **申请**
- 开启 **强制 HTTPS**（推荐）

#### 9. 防火墙配置

```bash
# 宝塔防火墙放行端口（如果使用了非 80/443 的端口暴露）
# 一般不需要，因为 Nginx 监听 80/443，Node.js 只监听 localhost:3000

# 如果服务器有外部防火墙（如阿里云安全组、腾讯云防火墙）
# 确保放行 80、443 端口
```

#### 10. 验证部署

```bash
# 测试后端是否运行
curl http://127.0.0.1:3000/api/login/status

# 测试通过 Nginx 访问
curl https://music.yourdomain.com/api/login/status

# 浏览器访问前端
https://music.yourdomain.com
```

---

## 方案二：前后端分离部署

**架构**：前端一个域名，后端一个域名（API）

```
用户 → Nginx (前端域名) → 静态文件
         ↓ 前端 JS 调用
      Nginx (API 域名) → Node.js
```

### 适用场景
- 前端需要 CDN 加速
- 后端需要独立扩展

### 额外配置

1. **前端配置 API 基地址**

编辑 `public/index.html`，找到 `API_BASE` 配置（通常在 `<script>` 标签中或全局变量），修改为：

```javascript
var API_BASE = 'https://api.yourdomain.com';
// 或
window.API_BASE = 'https://api.yourdomain.com';
```

如果 `apiJson` 函数使用的是相对路径，需要修改为：

```javascript
async function apiJson(url, opts) {
  // 如果 url 是相对路径，添加 API_BASE 前缀
  var fullUrl = url.startsWith('http') ? url : (window.API_BASE || '') + url;
  var res = await fetch(fullUrl, opts);
  // ...
}
```

2. **后端配置 CORS**

编辑 `server.js`，在响应头中添加 CORS：

```javascript
// 在 sendJSON 函数或请求处理开头添加
res.setHeader('Access-Control-Allow-Origin', 'https://music.yourdomain.com');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

3. **Nginx 配置两个站点**

- 前端站点：`music.yourdomain.com` → 静态文件
- 后端站点：`api.yourdomain.com` → 反向代理到 Node.js

---

## 宝塔详细步骤（截图级指南）

### 步骤 1：上传文件

1. 登录宝塔面板 → 文件 → 进入 `/www/wwwroot/`
2. 点击 **上传** → 选择 `mineradio.zip` → 上传
3. 右键点击 zip → 解压 → 解压到当前目录
4. 解压后重命名为 `music.yourdomain.com`（或你的域名）

### 步骤 2：添加站点

1. 宝塔 → 网站 → 添加站点
2. 域名：`music.yourdomain.com`
3. 根目录：`/www/wwwroot/music.yourdomain.com/public`
4. PHP 版本：纯静态（或不使用 PHP）
5. 点击 **提交**

### 步骤 3：安装 Node.js

> **⚠️ CentOS 7 用户必看**：glibc 2.17 不支持 Node 18+，请安装 **Node 16.x**。

1. 宝塔 → 软件商店 → 搜索 **Node.js**
2. 安装 **Node.js 版本管理器**
3. 点击设置 → 安装 **Node.js 16.20.2**（CentOS 7 兼容的最高版本）
4. 安装完成后，SSH 执行：`node -v` 确认显示 v16.x.x

### 步骤 4：安装依赖

1. SSH 登录服务器
2. 执行：
```bash
cd /www/wwwroot/music.yourdomain.com
npm install --production
```

### 步骤 5：配置 PM2（Node 项目）

**方式 A：宝塔 Node 项目管理器**
1. 宝塔 → 网站 → 点击域名 → Node 项目
2. 点击 **添加 Node 项目**
3. 项目目录：`/www/wwwroot/music.yourdomain.com`
4. 启动文件：`server.js`
5. 项目名称：`mineradio`
6. 端口：`3000`
7. 运行用户：`www`（或 root）
8. 点击 **提交**

**方式 B：命令行 PM2**
```bash
cd /www/wwwroot/music.yourdomain.com
npm install -g pm2
pm2 start server.js --name mineradio --max-memory-restart 512M
pm2 save
pm2 startup
```

### 步骤 6：配置反向代理

1. 宝塔 → 网站 → 点击域名 → 设置
2. 点击 **反向代理** → 添加反向代理
3. 代理名称：`api`
4. 目标 URL：`http://127.0.0.1:3000`
5. 发送域名：`$host`
6. 点击 **提交**

### 步骤 7：配置 SSL

1. 宝塔 → 网站 → 点击域名 → 设置 → SSL
2. 选择 **Let's Encrypt**
3. 勾选域名 → 点击 **申请**
4. 申请成功后，点击 **强制 HTTPS**

### 步骤 8：测试

1. 浏览器访问 `https://music.yourdomain.com`
2. 应该能看到 Splash 页面
3. 点击标题进入播放器
4. 尝试搜索歌曲、扫码登录等功能

---

## 常见问题

### 1. CentOS 7 安装 Node.js 失败 / 版本不兼容

**原因**：CentOS 7 的 glibc 版本为 2.17，Node.js 18+ 要求 glibc 2.28+。

**解决方案**：使用 **Node.js 16.x**

```bash
# 方案 A：NodeSource 安装 Node 16
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs
node -v   # 应显示 v16.x.x

# 方案 B：直接下载二进制（NodeSource 失败时）
curl -fsSL https://nodejs.org/dist/v16.20.2/node-v16.20.2-linux-x64.tar.xz -o /tmp/node.tar.xz
tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
node -v

# 方案 C：使用 nvm 安装
# 先安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16
node -v
```

### 2. Puppeteer / Chromium 安装失败（CentOS 7）

CentOS 7 的 glibc 版本太旧，无法运行新版 Chromium。加上 Node 16 限制，建议：

**方案 A：跳过 Puppeteer（推荐快速上线）**
```bash
cd /www/wwwroot/music.yourdomain.com
npm install --production
# 不安装 puppeteer，扫码登录功能不可用
# 用户可手动导入 Cookie 使用
```

**方案 B：使用兼容的 Puppeteer 版本**
```bash
# Node 16  compatible 的 Puppeteer 版本约 19.x
npm install puppeteer@19.11.1

# 安装依赖库
yum install -y pango libXcomposite libXcursor libXdamage libXext libXi \
  libXtst cups-libs libXScrnSaver libXrandr GConf2 alsa-lib atk gtk3 \
  nss libxss xorg-x11-fonts-* xorg-x11-utils

# 如果仍然报错，使用 puppeteer-core + 指定系统 Chrome
npm uninstall puppeteer
npm install puppeteer-core@19.11.1
# 在 .env 中设置
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

**方案 C：使用 Docker 部署（最稳妥）**
如果 CentOS 7 环境太旧，建议使用 Docker：
```bash
# 安装 Docker（宝塔软件商店可一键安装）
# 然后创建 Dockerfile 使用 Node 18/20 镜像
# 详见 DEPLOY-DOCKER.md
```

### 3. 内存不足（OOM）

```bash
# 限制 Node.js 内存
pm2 delete mineradio
pm2 start server.js --name mineradio --node-args="--max-old-space-size=512" --max-memory-restart 512M

# 或升级服务器内存到 4GB+
```

### 4. 端口被占用

```bash
# 查看端口占用
lsof -i :3000
# 或
ss -tlnp | grep 3000

# 释放端口
kill -9 $(lsof -t -i:3000)

# 然后重启 PM2
pm2 restart mineradio
```

### 5. Nginx 反向代理 502 错误

```bash
# 检查 Node.js 服务是否运行
pm2 status
pm2 logs mineradio

# 检查 Nginx 配置
nginx -t

# 检查防火墙
firewall-cmd --list-all
# 或关闭宝塔防火墙测试
```

### 6. 前端无法连接后端（跨域问题）

如果使用方案二（前后端分离），确保：
1. 后端 `server.js` 已配置 CORS 响应头
2. 前端 `API_BASE` 已指向正确域名
3. 后端域名有 SSL（HTTPS 页面不能请求 HTTP API）

### 7. 文件权限问题

```bash
# 确保目录权限正确
chown -R www:www /www/wwwroot/music.yourdomain.com
chmod -R 755 /www/wwwroot/music.yourdomain.com

# 如果 PM2 用 root 运行，也可用 root
chown -R root:root /www/wwwroot/music.yourdomain.com
```

---

## 更新维护

### 更新代码

```bash
cd /www/wwwroot/music.yourdomain.com

# 备份当前版本
cp -r . /tmp/mineradio-backup-$(date +%Y%m%d)

# 上传新代码（覆盖）
# ... 通过宝塔文件管理器或 scp ...

# 安装依赖（如果有变化）
npm install --production

# 重启服务
pm2 restart mineradio
```

### 查看日志

```bash
# 实时查看日志
pm2 logs mineradio --lines 100

# 查看错误日志
cat ~/.pm2/logs/mineradio-error.log

# 宝塔面板可视化查看
# 宝塔 → 网站 → 点击域名 → Node 项目 → 日志
```

### 备份数据

```bash
# 备份用户 Cookie 数据（登录状态）
tar czf /tmp/mineradio-cookies-$(date +%Y%m%d).tar.gz \
  /www/wwwroot/music.yourdomain.com/netease-cookie.json \
  /www/wwwroot/music.yourdomain.com/qq-cookie.json \
  /www/wwwroot/music.yourdomain.com/*.json
```

---

## 快速检查清单

部署完成后，逐项检查：

- [ ] 域名能访问（`https://music.yourdomain.com`）
- [ ] Splash 页面正常显示
- [ ] 点击标题能进入主界面
- [ ] 搜索功能正常（有后端时）
- [ ] 播放功能正常（有后端时）
- [ ] 登录模态框能打开
- [ ] 扫码登录可用（安装了 Puppeteer 时）
- [ ] 手动导入 Cookie 可用
- [ ] 移动端访问正常
- [ ] SSL 证书有效（无警告）
- [ ] PM2 进程状态正常（`pm2 status`）
- [ ] Nginx 配置无错误（`nginx -t`）

---

## 技术支持

如果部署遇到问题：
1. 先查看 `pm2 logs mineradio` 查看后端错误
2. 查看浏览器 F12 控制台查看前端错误
3. 查看宝塔面板 Nginx 错误日志
4. 检查 `server.js` 中的 `PORT` 配置和 Nginx 反向代理端口是否一致

