# Mineradio Web

<p align="center">
  <strong>沉浸式粒子音乐可视化播放器 — 网页版</strong>
</p>

<p align="center">
  天气电台 · 歌词舞台 · 3D 歌单架 · 六平台登录 · 粒子视觉
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D16-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/Three.js-r128-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20PWA-orange.svg" alt="Platform">
</p>

---

## 这是什么

Mineradio Web 是 [Mineradio](https://github.com/XxHuberrr/Mineradio) 桌面版的网页移植版。它把天气电台、音乐搜索播放、歌词舞台、粒子视觉和 3D 歌单架融合成一个更接近现场感的私人音乐空间——现在跑在浏览器里，不挑操作系统。

支持网易云、QQ音乐、酷狗、酷我、汽水（抖音）、Spotify 六大平台登录与搜索播放。

## 核心特性

- **粒子视觉系统** — 基于 Three.js 的 GPU 粒子渲染，随音乐节奏实时形变，电影镜头切换
- **歌词舞台** — 逐行高亮歌词，支持自定义歌词与位置控制
- **3D 歌单架** — 右键唤起立体歌单浏览，沉浸式队列管理
- **天气电台** — Open-Meteo 天气 API，根据位置和天气 mood 生成播放队列
- **六平台登录** — 网易云/QQ 扫码登录，酷狗/酷我/汽水 Cookie 登录，Spotify OAuth
- **DIY 模式** — 自定义视觉效果参数，保存个人预设
- **移动端适配** — 触摸滑动切歌、双指缩放、长按菜单、防误触
- **PWA 支持** — 可安装到桌面/主屏幕，离线缓存基础页面
- **节奏分析** — 实时 BPM 检测，驱动视觉系统

## 平台支持

| 平台 | 登录方式 | 搜索 | 歌单 | 用户信息 | 说明 |
|------|----------|------|------|----------|------|
| 网易云音乐 | 扫码 | ✅ | ✅ | ✅ 头像/昵称/VIP | 完整支持 |
| QQ音乐 | 扫码 | ✅ | ✅ | ✅ 头像/昵称 | 完整支持 |
| 酷狗音乐 | Cookie | ✅ | ✅ | ✅ 头像/昵称/VIP | Cookie-Editor 获取 |
| 酷我音乐 | Cookie | ✅ | ✅ | ✅ 头像/昵称 | Cookie-Editor 获取 |
| 汽水音乐 | Cookie | ✅ | ✅ | 基础 | 跳转抖音网页版获取 Cookie |
| Spotify | OAuth | ✅ | ✅ | ✅ | 需配置 Client ID |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Three.js r128 · GSAP · 原生 JS（无框架） |
| 后端 | Node.js · NeteaseCloudMusicApi · Puppeteer |
| 可视化 | WebGL 粒子系统 · Canvas 2D 歌词 · CSS3 动画 |
| 音频 | Web Audio API · MPG123 解码器 |
| 部署 | Nginx 反向代理 · PM2 进程管理 |

## 快速开始

### 环境要求

- Node.js >= 16（推荐 18+）
- npm 或 yarn

### 本地运行

```bash
git clone https://github.com/XxHuberrr/Mineradio-Web.git
cd Mineradio-Web
npm install
npm start
```

浏览器打开 `http://localhost:3000` 即可。

> Puppeteer 依赖较大（~300MB），如果只需要网易云/QQ 扫码登录，可以设置 `PUPPETEER_SKIP_DOWNLOAD=true` 跳过下载。

### 生产部署

推荐使用 Nginx 反向代理 + PM2 进程管理：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name mineradio
pm2 save
pm2 startup

# Nginx 配置（简化版）
# 将 /api/* 反向代理到 localhost:3000
# 静态文件直接 serve public/ 目录
```

详细部署指南见 [DEPLOY.md](./DEPLOY.md)。

## 配置

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

关键配置项：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 后端服务端口 |
| `SPOTIFY_CLIENT_ID` | - | Spotify OAuth（可选） |
| `SPOTIFY_CLIENT_SECRET` | - | Spotify OAuth（可选） |
| `SPOTIFY_REDIRECT_URI` | - | Spotify 回调地址 |
| `PUPPETEER_SKIP_DOWNLOAD` | false | CentOS 7 建议设 true |
| `PUPPETEER_EXECUTABLE_PATH` | - | 手动指定 Chrome 路径 |

## 项目结构

```
mineradio-web/
├── server.js              # 后端主服务（5600+ 行）
├── dj-analyzer.js         # 播客/DJ 曲目分析模块
├── puppeteer-login.js     # Puppeteer 多平台登录模块
├── package.json
├── .env.example           # 环境变量模板
├── nginx-baota.conf       # 宝塔面板 Nginx 配置参考
├── nginx-centos7.conf     # CentOS 7 Nginx 配置参考
├── deploy-centos7.sh      # CentOS 7 一键部署脚本
└── public/                # 前端静态资源
    ├── index.html         # 主页面（含全部前端逻辑）
    ├── v15-login-override.js  # 多平台 Cookie 登录覆盖脚本
    ├── sw.js              # Service Worker（PWA 离线缓存）
    ├── manifest.json      # PWA 清单
    ├── spotify-callback.html  # Spotify OAuth 回调页
    ├── desktop-lyrics.html    # 桌面歌词独立页面
    ├── wallpaper.html     # 银河壁纸背景页
    ├── default-user-fx-archive.json  # 默认视觉预设
    ├── assets/            # 骷髅粒子模型等二进制资源
    └── vendor/            # Three.js / GSAP / music-tempo 第三方库
```

## 多平台登录说明

### 网易云 / QQ音乐

点击平台按钮 → 显示二维码 → 手机扫码 → 自动登录。完全在后端完成，无需手动操作。

### 酷狗 / 酷我

点击平台按钮 → 显示 Cookie-Editor 引导面板 → 用户在对应官网登录 → 用 Cookie-Editor 扩展导出 Cookie → 粘贴到文本框 → 保存。

**Cookie-Editor 安装：**
- [Chrome 应用商店](https://chrome.google.com/webstore/detail/cookie-editor/fngmhnnpilhplaeedifhccceomclgfb)
- [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/cookie-editor/)
- [Edge 扩展](https://microsoftedge.microsoft.com/addons/detail/cookie-editor/neaplmfkplejbebmdcagcljejlfkcmgi)

### 汽水音乐

汽水音乐没有独立网页版，点击后会引导用户前往 [抖音网页版](https://www.douyin.com) 获取 Cookie。

### Spotify

需要配置 OAuth Client ID/Secret。详见 `.env.example`。

### 移动端

移动端没有 Cookie-Editor 扩展，系统会自动回退到书签小程序模式：用户在平台官网登录后，点击书签小程序自动提取 Cookie 并回传。

## 隐私与数据

- 用户 Cookie 仅存储在服务器本地文件中（`.cookie`、`.qq-cookie` 等），不上传任何第三方服务
- 搜索历史、自定义封面、视觉预设存储在浏览器 localStorage
- 不提供绕过付费、绕过会员、破解音质的能力
- 详见 [PRIVACY.md](./PRIVACY.md)

## 开发

```bash
# 克隆仓库
git clone https://github.com/XxHuberrr/Mineradio-Web.git
cd Mineradio-Web

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端逻辑全部内联在 `public/index.html` 中（约 28000 行），修改后刷新浏览器即可生效。后端修改后需重启 Node 进程。

## 致谢

Mineradio 由 **XxHuberrr** 主要设计与打造。

基于 [Mineradio](https://github.com/XxHuberrr/Mineradio) 桌面版移植为 Web 版。

技术依赖：
- [Three.js](https://threejs.org/) — WebGL 3D 渲染
- [GSAP](https://gsap.com/) — 动画引擎
- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) — 网易云 API
- [Open-Meteo](https://open-meteo.com/) — 天气数据

## 版权与授权

Copyright (C) 2026 XxHuberrr.

本项目采用 [GPL-3.0](./LICENSE) 授权。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归作者所有；第三方依赖和第三方服务分别遵循其各自授权与服务条款。

## 免责声明

Mineradio Web 不是网易云音乐、QQ音乐、酷狗、酷我、抖音或 Spotify 的官方客户端，也不隶属于任何音乐平台。项目中的第三方平台接入仅用于个人学习和本地体验。请遵守对应平台的用户协议、版权规则和会员权益规则。
