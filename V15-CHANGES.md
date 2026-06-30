# Mineradio V15 更新说明

## 基于 V13 重构，保留原项目粒子效果

### 修改文件
- `public/index.html` — 前端主文件
- `public/v15-login-override.js` — V15 登录逻辑覆盖脚本（独立文件，不影响原逻辑）
- `server.js` — 后端，增加多平台用户信息获取

### 主要改动

#### 1. 粒子效果恢复为原项目参数
- RENDER_DPR_CAP: 2.0 → 1.35
- RENDER_PIXEL_BUDGET: 12000000 → 5200000
- 与原项目 Mineradio/public/index.html 完全一致

#### 2. DIY 模式按钮图标修复
- 在 "DIY" 文字前添加了 SVG 齿轮图标
- 位于顶栏右侧

#### 3. 多平台登录全面改版（Cookie-Editor 引导）
- 点击非网易云/QQ 平台时，不再弹窗，直接显示 Cookie-Editor 获取引导
- 引导步骤：
  1. 打开平台官网登录
  2. 安装 Cookie-Editor 浏览器扩展（Chrome/Firefox/Edge 链接已内置）
  3. 用 Cookie-Editor 导出 Cookie（Netscape 格式）
  4. 粘贴到文本框 → 保存
- 汽水音乐自动跳转到抖音网页版
- 桌面端用户仍可使用书签小程序（备用方案）

#### 4. 后端多平台支持
- `/api/login/cookie` 已支持所有平台提交 Cookie
- `/api/login/status` 返回所有平台登录状态+用户信息
- 新增 `getKugouLoginInfo()` / `getKuwoLoginInfo()` / `getQishuiLoginInfo()`
- 注意：酷狗/酷我/汽水的用户信息API需要进一步调通（当前返回基础信息）

#### 5. 搜索平台
- 网易云 ✅（原有）
- QQ音乐 ✅（原有）
- 酷狗/酷我/汽水/Spotify：搜索API需要进一步实现

### 部署步骤
1. 上传 `public/index.html`、`public/v15-login-override.js`、`server.js` 到服务器
2. 重启服务：`pm2 restart mineradio`
3. 访问网站测试

### 已知问题
- [ ] 酷狗/酷我用户信息API需进一步调通（Cookie格式和API端点）
- [ ] 抖音（汽水）无公开API，用户信息获取困难
- [ ] 多平台搜索功能待实现
- [ ] 移动端Cookie获取体验待优化

### 开源准备
- [ ] 添加 README.md
- [ ] 添加 LICENSE
- [ ] 添加 .gitignore
- [ ] 清理代码中的测试/调试语句
