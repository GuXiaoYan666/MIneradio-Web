# Mineradio Web 部署概览

## 当前状态

**版本**: 1.1.2-web  
**更新日期**: 2026-06-29  
**部署状态**: ✅ 前端已上线，后端需手动部署

---

## 已完成功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 6 平台扫码登录 | ✅ | 网易云、QQ、酷狗、酷我、汽水、Spotify（需后端 Puppeteer） |
| 歌单同步 | ✅ | 6 平台均支持 |
| 红心/收藏同步 | ✅ | 网易云、QQ、Spotify 完整；酷狗/酷我/汽水基础支持 |
| 移动端触摸 | ✅ | 滑动切歌、双指缩放、长按、防误触 |
| PWA 支持 | ✅ | manifest + Service Worker + 离线缓存 |
| 渲染优化 | ✅ | DPR 自适应、无 FPS 限制、GPU 加速 |
| 前端 API 错误处理 | ✅ | 无后端时自动降级，不报错 |
| 前端 API 基地址配置 | ✅ | 支持 `window.API_BASE` 自定义后端地址 |

---

## 部署方案（宝塔面板 + 域名）

### 推荐：同域名部署（最简单）

```
用户 → Nginx (80/443) → 静态文件 (index.html)
                    ↓ 反向代理 /api/*
              Node.js (localhost:3000)
```

**步骤**：
1. 上传代码到 `/www/wwwroot/yourdomain.com`
2. 宝塔 → 添加站点 → 域名 → 根目录指向 `/public`
3. 宝塔 → 安装 Node.js 18+（Node 版本管理器）
4. SSH 执行 `npm install --production`
5. 宝塔 → Node 项目 → 添加项目（启动文件 `server.js`，端口 `3000`）
6. 宝塔 → 反向代理 → 添加 `/api/` → `http://127.0.0.1:3000`
7. 宝塔 → SSL → Let's Encrypt → 申请 → 强制 HTTPS

**详细文档**：见 `DEPLOY-BAOTA.md`（截图级步骤）

### 配置模板

- `nginx-baota.conf` — Nginx 配置（反向代理、缓存、SSL）
- `.env.example` — 环境变量模板

---

## 预览链接

**纯静态预览（无后端功能）**：
👉 https://9fc0653953f94f1eaf41bb85d567e48a.app.codebuddy.work

---

## 部署文件清单

| 文件 | 说明 |
|------|------|
| `public/index.html` | 前端（26,000+ 行，单文件应用） |
| `server.js` | 后端 API（4,800+ 行，Node.js） |
| `puppeteer-login.js` | 扫码登录模块（可选） |
| `package.json` | 依赖管理 |
| `manifest.json` | PWA 配置 |
| `sw.js` | Service Worker |
| `spotify-callback.html` | Spotify OAuth 回调页 |
| `nginx-baota.conf` | 宝塔 Nginx 配置 |
| `.env.example` | 环境变量模板 |
| `DEPLOY-BAOTA.md` | 宝塔部署完整指南 |
| `DEPLOY-CENTOS7.md` | CentOS 7 通用部署指南 |

---

## 注意事项

1. **CentOS 7 特殊问题**：
   - Node.js 需手动升级至 18+（默认只有 6.x）
   - Puppeteer/Chromium 依赖 glibc 版本可能不兼容，建议跳过 Puppeteer 或手动安装兼容版 Chrome
   - 内存建议 ≥ 2GB（Puppeteer 需要额外内存）

2. **Puppeteer 扫码登录**：
   - 安装 `npm install puppeteer` 后可用
   - CentOS 7 安装失败时，设置 `PUPPETEER_SKIP_DOWNLOAD=true` 跳过
   - 用户仍可手动导入 Cookie 登录

3. **Spotify OAuth**：
   - 需要在 `Spotify Developer Dashboard` 创建应用
   - 回调域名必须配置为 `https://yourdomain.com/api/spotify/oauth/callback`

4. **前端 API 基地址**：
   - 同域名部署无需修改（默认使用相对路径）
   - 前后端分离时，在页面中设置 `window.API_BASE = 'https://api.yourdomain.com'`

