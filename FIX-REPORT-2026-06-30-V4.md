# 修复报告 — 所有人自动登录管理员账号

## 根因

服务器启动时从文件加载全局 cookie（`.cookie`、`.qq-cookie` 等），存入全局变量。
**所有访客的请求都读取同一个全局变量** → 所有人共享管理员的账号。

## 修复内容

### `server.js` — 多用户 Cookie 隔离

**修改前**（有 bug）：
```js
// 只有有 userToken 的用户才切换 cookie
// 没有 userToken → 全局 cookie 照常生效 → 访客自动登录管理员账号
if (_currentUserToken) {
  // 切换到用户 cookie
}
// else → 全局 cookie 继续生效（BUG！）
```

**修改后**（已修复）：
```js
// 有 userToken + 有效会话 → 用该用户的 cookie
// 没有 userToken / 无会话 → 清空所有 cookie（访客状态）
if (_currentUserToken) {
  const _sess = userSessions.get(_currentUserToken);
  if (_sess) {
    // 用当前用户的 cookie
    userCookie = _sess.netease || '';
    // ...
  } else {
    // token 无效 → 访客状态
    userCookie = ''; qqCookie = ''; ...
  }
} else {
  // 没有任何 token → 访客状态，不使用全局共享 cookie
  userCookie = ''; qqCookie = ''; ...
}
```

### 同时修复的语法错误

`server.js` 第 26 行之前有一个多余的 `}`，导致 `SyntaxError: Unexpected token ')'`
→ Node.js 无法加载文件 → 所有 API 返回 Not Found。

## 你需要做的（3 步）

### 第 1 步：上传最新的 `server.js`

把本地的 `server.js` 上传到服务器 `/www/wwwroot/test.gyuan.xyz/` 覆盖旧版。

### 第 2 步：删除服务器上的 cookie 文件（关键！）

```bash
cd /www/wwwroot/test.gyuan.xyz

# 删除所有全局 cookie 文件
rm -f .cookie .qq-cookie .kugou-cookie .kuwo-cookie .qishui-cookie .spotify-token

# 确认删除干净
ls -la .cookie .qq-cookie .kugou-cookie .kuwo-cookie .qishui-cookie .spotify-token 2>&1
# 应该显示 "No such file or directory"
```

### 第 3 步：重启服务

```bash
pm2 delete mineradio
pm2 start server.js --name mineradio --max-memory-restart 512M
pm2 save

# 测试 API 是否正常
curl http://127.0.0.1:3000/api/login/status
# 应该返回 {"loggedIn":false,...} 而不是 Not Found

# 测试诊断 API
curl http://127.0.0.1:3000/api/puppeteer/diag
```

## 修复后的行为

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 新访客打开网站 | ❌ 自动登录管理员账号 | ✅ 未登录状态 |
| 用户 A 扫码登录网易云 | ❌ 所有人都能用 A 的账号 | ✅ 只有 A 的浏览器能用 |
| 用户 B 扫码登录 QQ 音乐 | ❌ B 覆盖 A，所有人用 B 的 | ✅ A 和 B 各自独立 |
| 清除浏览器 localStorage | ❌ 还是登录状态 | ✅ 回到未登录状态 |

## 文件清单

- `server.js` — 语法错误修复 + 多用户 Cookie 隔离（**本次唯一需要上传的文件**）
