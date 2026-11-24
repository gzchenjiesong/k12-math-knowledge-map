# k12-math-knowledge-map

面向家庭使用的 K12 数学竞赛（奥赛）学习工具链：完整知识图谱、授课优先的知识卡片应用，以及一套「先建立可靠数据源、再让程序直接信任」的内容生产流程。

> **内容边界声明**：本项目是辅助讲解工具，不是教科书替代品。所有讲解与例题为基于数学公共知识的原创编写，最终以孩子集训队学校讲义与授课老师口径为准。发现任何错误，请标记存疑并走修正流程（`RUL-009`）。

## 一、核心架构：三段流水线

```
resource_data/           reliable-data/            apps/miniprogram/   views/
  原始资料（不入库）  →   唯一真源（JSON+签核）  →     生成物（不入库）
  课标/大纲/教材/笔记      57 节点 × 四类卡片         小程序数据 / HTML 人读视图
```

- **可靠数据源是独立任务建设的**（启动 Prompt 见 `docs/PROMPT.md` 的 `PRM-010`）：依据锚定 → 编制 → 三重检查 → 人工签核 → 版本发布。
- **开发与运行时直接信任已发布数据**，不重复做内容校验；正确性在数据源出口一次性解决。
- 校验没有取消，而是**前移并集中**：`tests/check-data.js` 是数据源发布闸门，`tests/validate.js` 与 `tests/verify_content.js` 只负责结构与可判定子集。

## 二、目录职责

| 目录 | 职责 | 入库 |
|---|---|---|
| `docs/` | 项目治理文档：契约 / 规则 / 配置 / 设计 / 缺陷墙 / 上下文 / 测试台账 | 是 |
| `resource_data/` | 原始资料：官方课标、竞赛大纲、百科摘录、教材电子书 | **否** |
| `reliable-data/` | 唯一内容真源：知识点 / 授课教案 / 易错考点 / 真题示范 四类卡片 + 依据锚点 + 签核记录 | 是 |
| `apps/miniprogram/` | 微信小程序工程（授课 / 图谱 / 题型 / 查漏） | 骨架是；`data/*.js` 否 |
| `tools/` | 生成脚本：`build-data.js`（真源→小程序数据）、`render-html.js`（真源→HTML 视图） | 是 |
| `tests/` | 校验脚本 `validate.js` / `verify_content.js` / `check-data.js` 与证据 `evidence/` | 是 |
| `deliverables/` | 静态交付物：交互知识图谱、A3 挂图、书单（手工维护） | 是 |
| `views/` | 由真源渲染的 HTML 人读视图（供人工复核） | 否 |
| `deploy/` | 部署脚本与配置样例；真实私有信息放 `deploy/config/` | 样例是，私有否 |
| `deploy/server/` | 自建进度服务（零依赖 Node，按用户隔离存几 KB 进度） | 代码是，`config.json`/`data/` 否 |

## 三、本地开发引导

小程序运行所需的 `apps/miniprogram/data/*.js` 是**生成物 / 本地文件，不入库**。两种来源：

1. **可靠数据源已发布**（`reliable-data/manifest.json` 存在且签核完成）：
   ```bash
   node tools/check-data.js      # 数据源发布闸门
   node tools/build-data.js      # 生成 apps/miniprogram/data/*.js
   node tools/render-html.js     # 生成 views/*.html 供人工复核
   ```
2. **真源尚未建立**（当前状态）：本地数据保留在原工作目录 `C:\Users\jeaschen\WorkBuddy\2026-11-23-18-37-56\olympiad-cards-mini\data\`，可复制到 `apps/miniprogram/data/` 用于开发调试。这些是**未核实内容**，不得视为可靠数据源。

## 四、校验命令

```bash
node tests/validate.js          # 文档结构 + 小程序工程静态/数据校验
node tests/verify_content.js    # 内容可判定子集（数值复算 / 定理条件 / 结论存在）机械断言
node tests/check-data.js        # 可靠数据源发布闸门（真源未建时如实 BLOCKED）
```

所有脚本输出统一为 `RESULT=<通过>/<总数> FAILED=<失败>` 与 `VERDICT=PASSED|FAILED|BLOCKED`。

**诚实边界**：机械校验 PASS 不等于内容正确。AI 不得自证内容正确（见 `docs/SPECS.md` 的 `SPEC-008`）；只有人对照讲义逐条核对并把 `review` 置为 `verified`、记录核对人与日期，才算真正核实。

## 五、进度同步（自建服务器）

内容全部内置、离线可用；服务器**只同步进度**。链路：

```
小程序 utils/sync.js  ⇄  deploy/server/（你的腾讯云服务器 + HTTPS 域名）
   本地 store.js 仍是唯一状态源       按 openid 隔离，每用户几 KB
```

- 默认**关闭同步**：复制 `utils/runtime-config.example.js` 为 `runtime-config.js`，填 `syncBaseUrl` 并设 `syncEnabled: true` 才启用；该文件不入库。
- 离线 / 网络失败时静默降级为纯离线，不阻塞学习；恢复后自动补推。
- 服务端零依赖：`cd deploy/server && node server.js`（需先填 `config.json`）。详见 `deploy/server/README.md`。
- 微信侧必须：AppID+AppSecret、HTTPS 域名、把域名加入 request 合法域名白名单。

## 六、安全规则

- `deploy/config/`、`deploy/server/config.json`（AppID/Secret/token 密钥）、`apps/miniprogram/utils/runtime-config.js`（服务器地址）**绝不入库**，只留本地。
- `deploy/server/data/`（用户进度）**绝不入库**。
- `resource_data/` 下的教材 PDF 等原始资料**绝不入库**，避免版权风险与仓库膨胀。
- `.gitignore` 已为以上各类设置排除规则；AppSecret 只存在于服务端，绝不进小程序前端；任何提交前请复查 `git status`。
