# Mineradio Web — 2026-06-30 深度修复报告

## 修改的文件

| 文件 | 改动类型 | 核心内容 |
|------|----------|----------|
| `puppeteer-login.js` | 🔧 Bug 修复 | 懒加载 Puppeteer（每次调用重试 require） |
| `server.js` | 🏗️ 架构改造 | 多用户独立 Cookie 系统 + 会话管理 API |
| `public/index.html` | 🎨 性能优化 + 多用户 | 前端 Token 系统 + 渲染优化 + 粒子降级 |

---

## 一、Puppeteer "未安装" 问题修复

**根因**：`puppeteer-login.js` 在模块加载时执行 `require('puppeteer')`，如果当时 puppeteer 未安装或依赖缺失，`puppeteer` 变量被永久设为 `null`。之后即使安装了 puppeteer，所有函数仍返回"Puppeteer 未安装"。

**修复方案**：
- 将 eager `require` 改为 **lazy loading**
- 新增 `getPuppeteer()` 函数，每次调用都尝试加载
- `isPuppeteerAvailable()` 实时检测可用性
- module.exports 中每个函数内部检查，而非在模块顶层

```javascript
// Before (eager load, fails permanently)
let puppeteer;
try { puppeteer = require('puppeteer'); } catch(e) { puppeteer = null; }

// After (lazy load, retries every call)
function getPuppeteer() {
  if (_puppeteer) return _puppeteer;
  try { _puppeteer = require('puppeteer'); return _puppeteer; }
  catch(e) { return null; }
}
```

---

## 二、多用户独立 Cookie 系统（核心架构改造）

### 设计理念

| 旧架构 | 新架构 |
|--------|--------|
| 所有用户共用一个 Cookie | 每个浏览器用户独立 Cookie |
| 服务端全局变量存储 | 按 userToken 隔离的会话 Map |
| 打开网站默认已登录 | 默认未登录状态 |
| 一人登录全员受益 | 各扫各码各用各号 |

### 后端改动（server.js）

#### 1. 用户会话存储
```javascript
const userSessions = new Map();
// userToken → { netease, qq, kugou, kuwo, qishui, spotify }
```

- 每个请求通过 `X-User-Token` header 或 `userToken` query param 识别用户
- 自动创建/获取会话（惰性初始化）
- 7 天未活跃自动清理

#### 2. 新增 API 端点

```
GET  /api/user/session?userToken=xxx   → 获取/创建会话
DELETE /api/user/session?userToken=xxx → 注销会话
```

#### 3. Cookie 透明切换机制
- 在 HTTP 请求处理入口提取 `userToken`
- 临时将全局变量 (`userCookie`, `qqCookie`, etc.) 替换为当前用户的值
- API 内部代码无需改动，继续读取全局变量
- 请求结束后恢复原值
- 无 token 时自动回退到全局 cookie（向后兼容）

#### 4. 登录流程改造
- Puppeteer 扫码成功 → 保存到 `_currentUserToken` 对应的会话
- 手动 Cookie 导入 → 同样保存到用户会话
- 不再写入共享文件（除非无 token）

### 前端改动（index.html）

#### 1. Token 管理
```javascript
var USER_TOKEN_KEY = 'mineradio_user_token';
// 页面加载时生成/读取 token，存入 localStorage
function getUserToken() { ... }
function initUserSession() { ... } // 通知后端
```

#### 2. API 请求自动带 Token
- `apiJson()` 函数自动附加：
  - Header: `X-User-Token: u_xxx`
  - Query: `?userToken=u_xxx`
- 前端代码无需任何修改

#### 3. 注销功能
```javascript
function clearUserSession() { ... } // 清除本地+远程会话
```

---

## 三、渲染性能优化

| 优化项 | 之前 | 之后 | 效果 |
|--------|------|------|------|
| 背景粒子数 (BACK_COVER) | 3000 | 1000(移动)/3000(桌面) | 移动端 -67% |
| 浮动粒子数 (FLOAT) | 1300 | 500(移动)/1300(桌面) | 移动端 -62% |
| 封面网格 (Grid) | 最大 183×183=33489 | 移动端 ×0.55 ≈ 100×100=10000 | 移动端 -70% |
| 移动端 DPR 上限 | 1.5 | 1.25 | 减少像素量 |
| 移动端帧率 | vsync 无限制 | 45fps / 30fps / 20fps | 控制发热 |
| 页面不可见 | 继续渲染 | 完全跳过 | 切后台省电 |
| 单帧异常保护 | ❌ 无 | ✅ try-catch 包裹 | 防雪崩 |

### 移动端总粒子数量变化
- **之前**：~37,000+ particles
- **之后**：~11,500 particles（移动端）
- **预计性能提升**：3x+

---

## 四、部署步骤

### 必须重新上传到服务器的文件：

```bash
# 1. 上传这 3 个文件覆盖服务器上的版本
public/index.html    ← 最重要！多用户系统 + 渲染优化
server.js            ← 多用户后端 + 懒加载支持
puppeteer-login.js   ← Puppeteer 懒加载修复

# 2. 在服务器上重启服务
cd /www/wwwroot/test.gyuan.xyz
pm2 restart mineradio
pm2 save

# 3. 强制刷新浏览器清除缓存
# Chrome: Ctrl+Shift+R
# Safari: Cmd+Shift+R
```

---

## 五、验证清单

### Puppeteer 登录
- [ ] 打开网站 → 点击登录 → 选择平台 → 显示二维码（不再显示"未安装"）
- [ ] 手机扫码 → 前端检测到登录成功
- [ ] 刷新页面后该用户仍保持登录状态
- [ ] 不同浏览器/标签页有独立的登录状态

### 多用户隔离
- [ ] 浏览器 A 登录网易云账号甲
- [ ] 浏览器 B 登录网易云账号乙
- [ ] 两边歌单/红心/推荐各自独立
- [ ] 清除 localStorage 后回到未登录状态

### 渲染性能
- [ ] 移动端播放音乐不再明显卡顿
- [ ] 切换到其他 App 再回来，渲染正常恢复
- [ ] 控制台无红色 ReferenceError 报错
- [ ] 长时间运行不发热/不耗电严重
