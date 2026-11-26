# k12-math-knowledge-map

面向家庭使用的 K12 数学竞赛（奥赛）学习工具链：完整知识图谱、授课优先的知识卡片应用，以及一套「先建立可靠数据源、再让程序直接信任」的内容生产流程。

> **内容边界声明**：本项目是辅助讲解工具，不是教科书替代品。所有讲解与例题为基于数学公共知识的原创编写，最终以孩子集训队学校讲义与授课老师口径为准。发现任何错误，请标记存疑并走修正流程（`RUL-009`）。

## 一、核心架构：三段流水线

```
resource_data/           reliable-data/            apps/miniprogram/   views/
  原始资料（不入库）  →   唯一真源（JSON+签核）  →     生成物（入库/不入库）
  课标/大纲/教材/笔记      67 节点 × 四类卡片         小程序数据（入库）/ HTML（不入库）
```

> v2.1.0 起：小程序 6 个数据模块由真源编译后**入库**，clone 后无需本地重编即可运行；
> 但它们仍是生成物，禁止手工编辑，改动一律重跑 `node tools/build-data.js --allow-pending`。
> 一致性由 `tests/check-app-build.js` 断言（app 数据逐字段等于真源 + 组织配置）。

- **可靠数据源是独立任务建设的**（启动 Prompt 见 `docs/PROMPT.md` 的 `PRM-010`）：依据锚定 → 编制 → 三重检查 → 人工签核 → 版本发布。
- **开发与运行时直接信任已发布数据**，不重复做内容校验；正确性在数据源出口一次性解决。
- 校验没有取消，而是**前移并集中**：`tests/check-data.js` 是数据源发布闸门，`tests/validate.js` 与 `tests/verify_content.js` 只负责结构与可判定子集。

## 二、目录职责

| 目录 | 职责 | 入库 |
|---|---|---|
| `docs/` | 项目治理文档：契约 / 规则 / 配置 / 设计 / 缺陷墙 / 上下文 / 测试台账 | 是 |
| `resource_data/` | 原始资料：官方课标、竞赛大纲、百科摘录、教材电子书 | **否** |
| `reliable-data/` | 唯一内容真源：知识点 / 授课教案 / 易错考点 / 真题示范 四类卡片 + 依据锚点 + 签核记录 | 是 |
| `apps/miniprogram/` | 微信小程序工程（授课 / 图谱 / 题型 / 查漏） | 是；`data/*.js` v2.1.0 起入库（生成物，禁手改） |
| `tools/` | 生成脚本：`build-data.js`（真源→小程序数据）、`render-html.js`（真源→HTML 视图） | 是 |
| `tests/` | 校验脚本 `validate.js` / `verify_content.js` / `check-data.js` 与证据 `evidence/` | 是 |
| `deliverables/` | 静态交付物：A3 挂图两版（按学段 / 按主题，由 `tools/build-poster.js` 从 app 数据生成，不手工维护）、书单等 | 是 |
| `views/` | 由真源渲染的 HTML 人读视图（供人工复核） | 否 |
| `deploy/` | 部署脚本与配置样例；真实私有信息放 `deploy/config/` | 样例是，私有否 |
| `deploy/server/` | 自建进度服务（**备选方案**，零依赖 Node，按用户隔离存几 KB 进度） | 代码是，`config.json`/`data/` 否 |

## 三、本地开发引导

小程序运行所需的 `apps/miniprogram/data/*.js` 是**生成物**；v2.1.0 起与真源一并入库以保证 clone 可运行，但禁止手工编辑。

**当前状态：真源 v2.1.0 已发布，但人工签核未完成**（`reliable-data/manifest.json`：67 节点 × 四类卡 = 268 张全部 `pending`、`verified=0`，`VFY-005` 为 `BLOCKED_NO_EVIDENCE`）。app 数据为**过渡态**，头部带未签核警告。

```bash
node tools/build-reliable-data.js   # 从只读素材重新编制真源（可复现）
node tests/check-data.js            # 发布资格闸门（结构，9/9）
node tests/check-reliable-extra.js  # 扩展检查（哈希 / 覆盖 / 定理条件 / 异源复算，33/33）
node tools/render-html.js           # 生成 views/*.html 供人读复核
node tools/build-poster.js          # 渲染两版 A3 挂图（按学段 / 按主题，从 app 数据模块生成，可复现）
node tools/build-data.js --allow-pending  # 编译 7 个 app 数据模块（含 bridges.js 衔接边）；无 --allow-pending 会因未签核而阻塞
node tests/check-app-build.js       # 生成物一致性（app 数据 ↔ 真源 ↔ 组织配置，24/24）
```

- 真源唯一路径：`reliable-data/`；下游 `tools/build-data.js` 与 `tools/render-html.js` 只读取它，不重复做内容校验。
- 人工签核记录：`tests/evidence/HUMAN_SIGNOFF_V1.md`；签字后须发新版本，不覆盖 v1.0.0。
- 正确性是「依据充分 + 人工签核」的结果，不是 AI 自证；机械 `PASSED` 不表示内容无误。

## 四、校验命令

```bash
node tests/validate.js          # 文档结构 + 小程序工程静态/数据校验
node tests/verify_content.js    # 内容可判定子集（数值复算 / 定理条件 / 结论存在）机械断言
node tests/check-data.js        # 可靠数据源发布闸门（真源未建时如实 BLOCKED）
```

所有脚本输出统一为 `RESULT=<通过>/<总数> FAILED=<失败>` 与 `VERDICT=PASSED|FAILED|BLOCKED`。

**诚实边界**：机械校验 PASS 不等于内容正确。AI 不得自证内容正确（见 `docs/SPECS.md` 的 `SPEC-008`）；只有人对照讲义逐条核对并把 `review` 置为 `verified`、记录核对人与日期，才算真正核实。

## 五、进度同步（微信云开发 · 当前方案）

内容全部内置、离线可用；云端**只同步进度**。链路：

```
小程序 utils/sync.js  ⇄  微信云开发数据库 progress 集合
   本地 store.js 仍是唯一状态源     按 _openid 自动隔离，每用户一条文档几 KB
```

- 配置在 `apps/miniprogram/utils/cloud-config.js`（环境 ID `k12-math-knowledge-map-dfac0f85a` + 集合名 `progress`）。环境 ID 不是凭证，官方文档即写在前端，故入库。
- 集合 `progress` 已创建，权限必须为**「仅创建者可读写」**——云开发按 `_openid` 自动隔离，前端只读写自己的文档，不接触 openid 明文。
- 本地优先：所有读写先落本地 `store.js`，UI 不等网络；拉取时只填补本地缺失的条目，不覆盖已有学习进度。
- 离线 / 网络失败时静默降级为纯离线，不阻塞学习；有未推送标记时启动后自动补推。
- 无需 AppSecret、HTTPS 域名、request 合法域名白名单。
- **备选方案**：`deploy/server/` 保留自建服务器实现（零依赖 Node，按 openid 隔离），将来若需走出微信生态可切换。详见 `deploy/server/README.md`。

## 六、安全规则

- 云开发环境 ID 可入库（非凭证）；但**云数据库 access token、云账号 SecretId/SecretKey 绝不入库**。
- `deploy/config/`、`deploy/server/config.json`（AppID/Secret/token 密钥）、`apps/miniprogram/utils/runtime-config.js`（自建服务器地址）**绝不入库**，只留本地。
- `deploy/server/data/`（用户进度）**绝不入库**。
- `resource_data/` 下的教材 PDF 等原始资料**绝不入库**，避免版权风险与仓库膨胀。
- `.gitignore` 已为以上各类设置排除规则；任何提交前请复查 `git status`。
