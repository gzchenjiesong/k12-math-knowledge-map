# deploy · 部署目录

## 职责

承载「把应用发布出去」所需的一切：部署脚本、服务配置模板、环境说明。

## 目录结构

```
deploy/
├── README.md               # 本文件
├── config/                 # 私有配置（不入库）：服务器地址、登录凭证、keys
│   └── .gitkeep
├── config.example.json     # 配置字段样例（占位值，可入库）
├── server/                 # 自建进度服务（零依赖 Node）
│   ├── server.js           # API + 鉴权
│   ├── lib/store.js        # 按用户隔离的进度存取
│   ├── config.example.json # 服务端配置样例（可入库）
│   ├── config.json         # 真实凭证（不入库）：AppID/Secret/token 密钥
│   ├── data/               # 用户进度文件（不入库）
│   └── README.md           # 服务端说明与微信前置条件
└── scripts/
    └── deploy-server.sh    # 上传/启动/健康检查（骨架，参数待填）
```

## 发布链路（已确认的架构）

- **内容**：可靠数据源内置到小程序包，离线可用，不经过服务器。
- **预览发布**：走 WorkBuddy 托管链路（应用卡 → 分享 → 试用/绑定），与后端无关。
- **进度同步（当前方案）**：小程序 `utils/sync.js` ↔ 微信云开发数据库 `progress` 集合，按 `_openid` 自动隔离，仅同步几 KB 的掌握状态/笔记/存疑标记。配置在 `apps/miniprogram/utils/cloud-config.js`，无需 AppSecret / HTTPS / 域名白名单。
- **自建服务器（备选）**：`deploy/server/` 保留自建进度服务，将来需走出微信生态时启用。详见 `deploy/server/README.md`。

## 安全红线

1. **`deploy/config/` 下的任何真实文件都不入库。** `.gitignore` 已用 `deploy/config/*` + 白名单例外排除。
2. **绝不把以下内容写进仓库**：服务器 IP/域名、SSH 私钥、API Key、token、数据库口令、云账号凭证。
3. 需要共享配置结构时，只提交 `*.example.json`（字段齐全、值为占位符如 `<YOUR_TOKEN>`）。
4. 私有信息文件只保留在部署机上，权限建议 `chmod 600`。
5. 若误提交过敏感信息：立即轮换凭证，再用 git 历史清理工具处理，不能只删当前文件。

## 当前状态

尚未接入任何真实部署目标。本目录先建立规范占位，等确定发布方式（静态托管 / 小程序提审 / 云服务）后再补脚本。
