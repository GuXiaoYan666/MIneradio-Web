# 隐私与用户数据说明

Mineradio Web 是自部署的 Web 应用。用户登录状态、Cookie、播放历史等数据仅存储在您自己的服务器和浏览器本地，不上传到任何第三方服务。

## 服务器端数据

应用可能在服务器本地保存以下文件：

| 文件 | 内容 | 说明 |
|------|------|------|
| `.cookie` | 网易云音乐登录 Cookie | 用于调用网易云 API |
| `.qq-cookie` | QQ音乐登录 Cookie | 用于调用 QQ音乐 API |
| `.kugou-cookie` | 酷狗音乐登录 Cookie | 用于调用酷狗 API |
| `.kuwo-cookie` | 酷我音乐登录 Cookie | 用于调用酷我 API |
| `.qishui-cookie` | 抖音/汽水 Cookie | 用于调用抖音 API |
| `.spotify-token` | Spotify OAuth Token | 用于调用 Spotify API |

这些文件包含敏感的登录凭证，**绝对不应提交到 Git 仓库**。`.gitignore` 已配置排除。

## 浏览器端数据

以下数据存储在浏览器 localStorage 中：

- 搜索历史
- 自定义专辑封面
- 自定义歌词
- 歌词布局与视觉控制设置
- DIY 模式视觉预设
- 当前选中的平台

清除浏览器数据或清除 localStorage 即可移除以上信息。

## 不应上传的内容

以下内容不应提交到 GitHub：

- 所有 `.cookie`、`.*-cookie` 文件
- `.spotify-token`
- `.env`（含 Spotify 密钥等）
- `node_modules/`
- `updates/`、`backups/`
- 用户上传的本地音乐文件
- 用户账号信息、Cookie、Token

## 第三方平台

用户通过网易云音乐、QQ音乐、酷狗、酷我、抖音、Spotify 等第三方平台登录时，应遵守对应平台的用户协议。Mineradio Web 不提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 数据安全建议

- 部署时务必配置 HTTPS（Let's Encrypt 免费 SSL）
- 定期清理过期的 Cookie 文件
- 不要在公共服务器上留下未加密的 Cookie 文件
- 如使用反向代理，确保 `/api` 路径不暴露给未授权用户
