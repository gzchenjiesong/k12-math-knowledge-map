# 进度服务（自建后端）

## R35 当前说明（2026-11-27，优先于下方历史原文）

> **历史自建服务样例，未适配当前小程序微信云操作协议。以下 API 表、启动方式和 `runtime-config.js` 接入指引只保留作历史参考，不能按原文直接启用当前客户端同步。**

- 本服务的 `/api/progress` 读写 `{ state, updatedAt }` 整份快照；当前客户端以字段 Lamport 版本、稳定操作 ID、删除版本、幂等重试和旧记录只读迁移工作。三个业务字段形似不等于协议兼容，旧文“与 sync.js 对应”“与 store.js 完全一致”不再适用于当前实现。
- **仅填写服务端配置、域名或 `runtime-config.js` 不能启用当前同步**。如要重新接入，须另行设计客户端/服务端协议适配、权限、数据迁移及回归验收；本轮不实施、不部署、不把旧 API 接到真实记录。
- 现行实现使用微信云开发，配置与升级约束见 `docs/CONFIG.md` 的 CNF-022、`docs/RULES.md` 的 RUL-010。必须核实基础权限「仅创建者可读写」，不能直接改为自定义安全规则；同账号各设备须升级，禁止新旧混写或直接回滚旧客户端。
- 当前云端按操作留存，日志与分页扫描成本随历史增长，没有自动压缩/删除历史；旧文“每用户仅几 KB”不是现行容量或性能保证。真实云权限、账号隔离、双设备真机及包体/性能仍为 VFY-007 缺证；R33/R34 的代表性隔离 PASS 不解除该缺证，投屏后续实测仍 SKIPPED。
- 首次 clone 的离线步骤见根 `README.md`：仓库 `apps/miniprogram/utils/cloud-config.js` 当前有 env，运行前先清空为字符串 `''`，并换自己的 AppID。不要把仓库配置当作默认禁云，也不要借用仓库环境做验证。
- Node.js 18+、零第三方依赖，无需 `npm install`；根目录 `npm test` 为 CNF-025 的工程回归入口，不启动此服务。回归数量和结果以 `docs/TESTS.md` 台账为准。凭证、`deploy/server/data/` 运行数据（仅 `.gitkeep` 例外）不入库；本轮不填写真实配置或执行下方启动命令，不宣称新的微信审核/发布状态。

## 历史说明（原文保留；与上方冲突时以 R35 说明为准）

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
