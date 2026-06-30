# 安全说明

## 报告漏洞

如果您发现安全漏洞，请不要在 GitHub Issue 中公开报告。请发送邮件至作者私下沟通。

## Cookie 安全

Mineradio Web 需要存储用户的第三方平台登录 Cookie。这些 Cookie 存储在服务器本地文件中，存在以下风险：

1. **服务器被入侵** → Cookie 文件可能被窃取
2. **HTTP 明文传输** → Cookie 可能被中间人截获

### 缓解措施

- **必须启用 HTTPS**：使用 Let's Encrypt 或其他 SSL 证书
- **限制文件权限**：Cookie 文件设置为 `600`（仅 owner 可读写）
- **定期轮换**：建议定期重新登录刷新 Cookie
- **不要在共享服务器上部署**：建议使用个人专用服务器

## Puppeteer 安全

Puppeteer 模块用于多平台扫码登录。如果服务器环境不支持 Puppeteer（如 CentOS 7），可以设置 `PUPPETEER_SKIP_DOWNLOAD=true` 跳过安装，此时扫码登录功能不可用，但 Cookie 手动登录方式仍然可用。

## 依赖安全

- 定期运行 `npm audit` 检查依赖漏洞
- 及时更新 `package.json` 中的依赖版本
- 关注 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 上游安全更新

## 部署检查清单

- [ ] HTTPS 已启用
- [ ] `.gitignore` 包含所有 Cookie/Token 文件
- [ ] `.env` 文件未提交到仓库
- [ ] 服务器防火墙仅开放 80/443 端口
- [ ] PM2 配置了 `max_memory_restart`
- [ ] Cookie 文件权限为 `600`
