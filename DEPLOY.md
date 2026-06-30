# Mineradio Web 上线部署方案

> **最新部署状态**：前端已部署至 CloudStudio — https://9fc0653953f94f1eaf41bb85d567e48a.app.codebuddy.work
> 注意：该链接为纯静态预览，**后端 API 不可用**。完整功能需按以下方案部署后端。

---

## 方案一：本地服务器部署（完整功能）

这是最快启动完整功能的方式。

```bash
cd mineradio-web

# 1. 安装依赖
npm install

# 2. 启动后端服务（端口 3000）
node server.js

# 3. 浏览器访问 http://localhost:3000
```

**后台持久运行**（Windows 使用 pm2）：
```bash
npm install -g pm2
pm2 start server.js --name mineradio
pm2 save
pm2 startup
```

---

## 方案二：Render 免费部署（推荐上线）

Render 提供免费的 Node.js 服务，包含 512MB RAM 和自动 HTTPS。

### 1. 准备代码仓库

将 `mineradio-web` 目录推送到 GitHub：
```bash
cd mineradio-web
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/mineradio-web.git
git push -u origin main
```

### 2. Render 部署配置

在 Render  dashboard 创建 **Web Service**：
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment**: Node.js

### 3. 环境变量（可选）

在 Render 的 Environment 中添加：
- `SPOTIFY_CLIENT_ID` — 你的 Spotify App Client ID
- `SPOTIFY_CLIENT_SECRET` — 你的 Spotify App Client Secret
- `SPOTIFY_REDIRECT_URI` — `https://你的render域名.onrender.com/api/spotify/oauth/callback`

### 4. 修改前端 API 地址

如果你将前后端分离部署（前端 CloudStudio / Vercel，后端 Render），需要修改 `public/index.html` 中的 `apiJson` 函数，添加 `BASE_API_URL`：

```javascript
// 在 apiJson 函数前添加
var API_BASE = window.location.hostname === 'localhost' ? '' : 'https://你的render域名.onrender.com';

async function apiJson(url, opts) {
  // ...
  var res = await fetch(API_BASE + url, fetchOpts);
  // ...
}
```

---

## 方案三：Railway 部署

Railway 也是免费的 Node.js 托管平台，步骤类似 Render：

1. 连接 GitHub 仓库
2. 设置启动命令：`node server.js`
3. 添加环境变量
4. 自动生成 HTTPS 域名

---

## 方案四：Vercel + Serverless Functions

Vercel 的免费额度非常慷慨，但需要将后端改为 Serverless Functions 格式。

**参考结构**：
```
mineradio-web/
  api/
    login.js          # Vercel Serverless Function
    search.js
    song-url.js
  public/
    index.html        # 前端文件
  vercel.json
```

---

## 方案五：Docker 部署（适合自托管服务器）

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

构建并运行：
```bash
docker build -t mineradio .
docker run -d -p 3000:3000 --name mineradio mineradio
```

---

## 方案六：本地 + 内网穿透（快速测试分享）

如果你只想临时分享给别人测试：

```bash
# 1. 本地启动
node server.js

# 2. 使用 ngrok 内网穿透
npx ngrok http 3000

# 3. 将 ngrok 提供的 https://xxx.ngrok-free.app 链接发给朋友
```

---

## 域名配置

### 前端域名（可选）
- CloudStudio: 已自动生成 https://xxx.app.codebuddy.work
- Vercel: 连接 GitHub 后自动部署

### 后端域名（必须）
- Render: 免费 `https://xxx.onrender.com`
- Railway: 免费 `https://xxx.up.railway.app`
- 自定义域名：在 Render/Railway 设置中添加 CNAME

### 如果前后端分离
在 `public/index.html` 顶部添加配置：
```javascript
<script>
  window.__API_BASE = 'https://你的后端域名';
</script>
```

修改 `apiJson`：
```javascript
var base = window.__API_BASE || '';
var res = await fetch(base + url, fetchOpts);
```

---

## 环境变量完整列表

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SPOTIFY_CLIENT_ID` | Spotify 开发者 App ID | 可选（Spotify 登录） |
| `SPOTIFY_CLIENT_SECRET` | Spotify 开发者 App Secret | 可选（Spotify 登录） |
| `SPOTIFY_REDIRECT_URI` | Spotify OAuth 回调地址 | 可选（Spotify 登录） |
| `PORT` | 服务端口，默认 3000 | 可选 |

---

## 推荐上线流程

```
1. 注册 GitHub → 推送代码
2. 注册 Render → 创建 Web Service → 连接 GitHub
3. 部署成功后获取后端 URL
4. 修改 index.html 中的 API_BASE 为后端 URL
5. 重新推送前端到 CloudStudio 或 Vercel
6. 配置域名和 HTTPS
7. 完成上线！
```

---

## 注意事项

- **Puppeteer 需要 Chrome**：在 Render/Railway 上需要额外配置 Chrome 安装，或使用 puppeteer 的 `browserless` 模式
- **Cookie 持久化**：Render 的免费实例会在休眠后重启，建议添加外部数据库或文件存储保存用户 Cookie
- **音乐版权**：确保部署符合各平台 API 使用条款
