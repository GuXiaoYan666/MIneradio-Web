# Mineradio 部署修复报告 — 2026-06-30

## 修复的问题

### 1. 🐛 致命渲染崩溃：`analysisFrameCounter is not defined`
**严重程度**：🔴 **致命**（每帧崩溃，导致画面卡顿 + 控制台刷屏）

**原因**：`animate()` 函数中使用了 `analysisFrameCounter` 变量但从未声明。每次 `requestAnimationFrame` 回调都抛出 `ReferenceError`，导致：
- 每帧都执行异常处理（极耗性能）
- 控制台被刷屏（截图显示数十条重复错误）
- 渲染循环不稳定 → 画面卡顿

**修复**：在变量声明区域（第 2775 行）添加 `var analysisFrameCounter = 0;`

### 2. 🛡️ animate() 函数错误保护
**改进**：给整个 `animate()` 函数体添加 try-catch 包裹
- 单帧异常不再拖垮整个渲染循环
- 错误只输出前 3 次，避免控制台刷屏
- 后续帧正常渲染

### 3. 🔧 server.js 兼容层优化
- polyfill 代码改为 try-catch 包裹（Node 20 内置 fetch，不需要时静默跳过）
- 更新注释，支持 CentOS 7/9 + Node 16/18/20/22

### 4. 📦 package.json 更新
- 版本号：`1.1.2-web` → `1.1.3-web`
- Puppeteer：`^22.15.0` → `^24.15.0`（CentOS 9 完全支持）

---

## 关于登录问题

登录不自动获取 cookie 的排查方向：

### 可能原因 A：Puppeteer 未正确安装/启动
在服务器上测试：
```bash
cd /www/wwwroot/music.xyzwl.top
node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  .then(b => { console.log('✅ Chromium OK'); b.close(); })
  .catch(e => console.error('❌', e.message));
"
```

### 可能原因 B：Nginx 反向代理未配置 `/api/login/puppeteer/*`
确认宝塔 Nginx 配置中有：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    ...
}
```

### 可能原因 C：后端服务未运行或端口不对
```bash
pm2 status          # 查看进程状态
pm2 logs mineradio   # 查看日志
curl http://127.0.0.1:3000/api/login/status  # 测试 API
```

### 临时方案：手动导入 Cookie
如果扫码登录暂时无法使用，用户可以通过「导入 Cookie」按钮手动粘贴 Cookie。

---

## 部署到 CentOS 9 的步骤

```bash
# 1. 上传修改后的文件到服务器
# 重点更新的文件：
# - public/index.html  （修复 analysisFrameCounter + try-catch）
# - server.js          （兼容层优化）
# - package.json       （版本号更新）

# 2. 在服务器上重新安装依赖（如果 puppeteer 升级了）
cd /www/wwwroot/music.xyzwl.top
npm install

# 3. 重启服务
pm2 restart mineradio
pm2 save

# 4. 验证
curl http://127.0.0.1:3000/api/login/status
# 浏览器访问 https://music.xyzwl.top
```

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `public/index.html` | Bugfix | 声明 `analysisFrameCounter`；animate() 加 try-catch |
| `server.js` | Improvement | polyfill 改为安全加载模式 |
| `package.json` | Version bump | v1.1.2→v1.1.3；puppeteer ^24.15.0 |
