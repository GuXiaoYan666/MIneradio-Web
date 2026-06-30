# Fix Report — 2026-06-30 V3 (渲染还原 + Puppeteer 深度诊断)

## 用户需求
1. **不要砍粒子效果和个数** — 保持原项目美观
2. **不限制帧率** — 与源项目一致
3. **不降低 DPR** — 与源项目一致
4. **修复 Puppeteer "未安装"** — 仍然显示未安装

---

## 一、渲染参数还原（index.html）

| 参数 | 改动前（被优化的值） | 现在已还原为 |
|------|---------------------|-------------|
| FLOAT_COUNT | isMobile?500:1300 | **isMobile?800:2000** |
| BACK_COVER_COUNT | isMobile?1000:3000 | **isMobile?1500:4000** |
| 移动端 DPR 上限 | 1.25 | **已删除限制** |
| 移动端帧率上限 | 45/30/20 fps | **已删除限制** |
| 页面不可见暂停渲染 | 有 | **已删除** |
| 封面粒子网格移动端缩减 | grid×0.55 | **已删除** |

### animate() 函数
- ✅ 保留 try-catch 错误保护（防止单帧崩溃拖垮循环）
- ❌ 已移除 `if (document.hidden) return;`

---

## 二、Puppeteer 深度诊断系统（puppeteer-login.js）

### 问题分析
命令行 `node -e "require('puppeteer')"` 可以成功，但 server.js 通过 PM2 运行时 require 失败。
可能原因：
1. PM2 工作目录与项目目录不一致
2. node_modules 路径不在 Node.js 解析范围内
3. 文件上传后 puppeteer-login.js 未更新

### 新增诊断功能

#### 1. 多路径探测加载
```
尝试1: require('puppeteer')           ← 标准方式
尝试2: __dirname/node_modules/puppeteer ← 绝对路径
尝试3: resolve.paths() 遍历            ← 所有可能的路径
```

#### 2. 详细诊断日志
每次加载失败都会输出：
```json
{
  "cwd": "/www/wwwroot/test.gyuan.xyz",
  "nodeVersion": "v20.x.x",
  "attempts": [
    "try: require(\"puppeteer\")",
    "fail: Cannot find module 'puppeteer'",
    "try: /www/wwwroot/test.gyuan.xyz/node_modules/puppeteer",
    "fail: ENOENT"
  ]
}
```

#### 3. 新增诊断 API
```
GET /api/puppeteer/diag
```
返回：available、diag详情、cwd、nodeVersion、环境变量状态

### 部署后测试步骤
```bash
# 1. 重启服务
pm2 restart mineradio && pm2 save

# 2. 测试诊断 API（关键！这会告诉我们为什么 Puppeteer 加载失败）
curl http://127.0.0.1:3000/api/puppeteer/diag

# 3. 如果 diag 显示 cwd 不对，用正确路径重启
cd /www/wwwroot/test.gyuan.xyz && pm2 restart mineradio
```

---

## 三、需要上传的文件清单

| 文件 | 改动内容 |
|------|---------|
| `public/index.html` | 渲染参数全部还原 + 多用户Token系统 |
| `server.js` | 多用户Cookie + 诊断API `/api/puppeteer/diag` |
| `puppeteer-login.js` | 多路径探测 + 详细诊断日志 |

## 四、上传后操作

```bash
cd /www/wwwroot/test.gyuan.xyz
pm2 restart mineradio
pm2 save

# 先跑诊断，把结果发给我！
curl http://127.0.0.1:3000/api/puppeteer/diag
```

**这个诊断 API 的输出是解决 Puppeteer问题的关键！** 它会告诉我们确切原因。
