# 进度服务（自建后端）

只做一件事：**按用户保存学习进度**（掌握状态、笔记、存疑标记），每用户仅几 KB。授课内容全部内置在小程序包里，本服务不提供内容、不参与内容校验。

## 为什么这样设计

- 内容是可靠数据源，已在仓库完成校验并内置，离线可用；服务端碰内容就会破坏「单一真源」。
- 进度是可变的个人数据，才需要跨设备同步；放服务端，换手机不丢进度。
- 零依赖：Node 原生 `http` + JSON 文件，无需数据库，部署极轻，备份就是把 `data/` 拷走。

## 目录

```
deploy/server/
├── server.js              # 服务入口（API + 鉴权）
├── lib/store.js           # 进度存取（按 userId 分文件，原子写）
├── config.example.json    # 配置样例（可入库）
├── config.json            # 真实配置（不入库）：AppID/Secret/token 密钥
├── data/                  # 用户进度文件（不入库）
└── package.json           # 零依赖
```

## 启动

```bash
cd deploy/server
cp config.example.json config.json
# 编辑 config.json：填 AppID、AppSecret、tokenSecret、域名
node server.js
```

`node server.js` 即可运行，无需 `npm install`（无第三方依赖）。生产建议用 PM2 或 systemd 守护，并用 Nginx 反代 + HTTPS。

## API 契约（与小程序 utils/sync.js 对应）

| 方法 | 路径 | 请求 | 返回 |
|---|---|---|---|
| POST | `/api/login` | `{ code }`（wx.login 得到） | `{ userId, token, expiresAt }` |
| GET | `/api/progress` | Header `Authorization: Bearer <token>` | `{ state, updatedAt }` |
| PUT | `/api/progress` | Header + `{ state, updatedAt }` | `{ ok, updatedAt }` |
| GET | `/api/health` | — | `{ ok: true }` |

`state` 结构：`{ status: {节点id: 0/1/2}, notes: {节点id: 文本}, disputed: {节点id: 1} }`，与小程序 `utils/store.js` 完全一致。

## 安全设计

1. **用户隔离**：`userId` 来自服务端签名 token，不接受客户端指定；A 用户无论如何读不到 B 的进度。
2. **凭证只留服务端**：`AppSecret`、`tokenSecret` 只在 `config.json`（已 .gitignore 排除），绝不进小程序前端、不进仓库。
3. **数据清洗**：PUT 只接受三个已知字段、限制条目数与长度，拒绝异常结构。
4. **原子写**：先写临时文件再改名，避免崩溃损坏进度。
5. **无日志敏感信息**：不打印 token、openid、进度内容。

## 微信侧前置条件（重要）

1. **AppID + AppSecret**：在微信公众平台获取；无此无法把 `wx.login` 的 code 换成 openid。
2. **request 合法域名**：小程序后台「开发管理 → 开发设置 → 服务器域名 → request 合法域名」加入你的 HTTPS 域名。
3. **HTTPS**：域名必须配 SSL 证书，小程序不允许明文 HTTP 请求。
4. **预览阶段**：开发/体验版可在开发者工具勾选「不校验合法域名」临时调试；正式发布必须配好白名单。

## 当前状态

骨架已实现，但未填任何真实凭证，未接入你的腾讯云服务器。等你提供 AppID、域名、私钥路径后再完成：配置填写 → 部署上线 → 域名白名单 → 小程序端 `runtime-config.js` 开启同步。
