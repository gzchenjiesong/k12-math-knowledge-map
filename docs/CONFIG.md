# CONFIG · 配置（当前取值与基准快照）

> 装：全部当前取值、数量、标识、文件路径、关键指标的基准快照。与代码里的键一一对应。
> 不装：「必须 / 不得」这类约束性措辞（归 `SPECS.md`）。
> 改值按 `IDX-004`：配置 + 代码，并对照 `CNF-007` 基准快照，偏移需归因。

### CNF-001: 知识节点基线

- 总数 **57**；三大来源：初中课标 `junior` = 21、高中课标 `senior` = 15、奥赛 `olympiad` = 21。
- 板块（module）合计 12；主题（theme）合计 10；题型分组 10。
- 来源标签色：初中蓝 / 高中绿 / 奥赛橙。

### CNF-002: 掌握状态存储

- 存储键：`olympiad_cards_state_v1`（localStorage / wx.Storage）。
- 状态字段 `status`：0 = 未开始、1 = 学习中、2 = 已掌握；另含 `notes`（自建笔记）。
- 云服务：**未启用**（activate 确认弹窗被关闭 → 本地实现授权，见 `DSN-006`）。数据层隔离在 `apps/miniprogram/utils/store.js`，日后切云只替换此层。

### CNF-003: 小程序标识

- appId：`wbapp_CgdhzXa4EJ6dVcmbTko0ZE`。
- 应用卡标记：WorkBuddy 应用卡标记（不入库）。
- domainPrefix：`olympiad-cards`；应用名「奥数知识卡片」。
- 状态：**未发布**；用户在预览面板右上角「分享 / Share」继续试用 / 绑定 / 提审。

### CNF-004: 导航结构

- tabBar 四项（首项为授课）：`apps/miniprogram/pages/lecture/lecture`、`apps/miniprogram/pages/graph/graph`、`apps/miniprogram/pages/locator/locator`、`apps/miniprogram/pages/gaps/gaps`。
- 非 tab 页（navigateTo 进入）：`apps/miniprogram/pages/lesson/lesson`、`apps/miniprogram/pages/node/node`、`apps/miniprogram/pages/cards/cards`。
- `window`：`navigationBarBackgroundColor` = `#1f2d3d`，`navigationBarTextStyle` = `white`。

### CNF-005: 数据文件结构

| 文件 | 大小 | 导出 | 关键字段 |
|---|---|---|---|
| `apps/miniprogram/data/nodes.js` | 47 KB | `DOMAINS / ALL_NODES / SIGNAL_RULES` | 节点：`id, n, p, pre, rel, sig, ap, d, domain, domainName, module` |
| `apps/miniprogram/data/lectures.js` | 69 KB | `LECTURES` | 专题：`id, title, subtitle, lead, goal, chain, points`；点：`nodeId, title, essence, method, example{q,a}, pitfalls, links, check` |
| `apps/miniprogram/data/themes.js` | 2.9 KB | `THEMES / THEME_OF / THEME_NAME / DOMAIN_SHORT` | 主题 → nodeIds 映射 |
| `apps/miniprogram/data/topic_index.js` | 32 KB | `TOPIC_ITEMS / TOPIC_GROUPS / TOPICS_BY_NODE` | 题型：`id, name, theme, signals, nodes, methods, lesson{core,steps,trap}` |
| `apps/miniprogram/data/cards.js` | 13 KB | `CARDS / cardCount` | `nodeId: { concept, explain[], examples[] }` |

### CNF-006: 内容覆盖度

- 授课讲解：57 / 57 节点（10 专题全覆盖）。
- 主题分类：57 / 57 节点（10 主题，无重复）。
- 题型索引：34 个题型、10 个分组、覆盖 51 / 57 节点。
- 三维卡片：6 个节点 —— `o_geo_ceva`、`o_cong`、`o_ineq`、`o_pigeon`、`j_quad`、`s_seq`（初中 2/21、高中 1/15、奥赛 3/21）。
- 来源视图 / 主题视图 / 定位页 / 查漏页 / 授课页均读取上述数据，无独立数据源。

### CNF-007: 最近校验基准快照

- 轮次 R1，日期 2026-11-24。
- 静态：10 JSON 严格校验、14 JS 语法、7 页面四件套配对、tabBar 路径、7 WXML 标签配对 —— 全 PASS。
- 数据：57 节点授课全覆盖、讲解六要素完整、10 专题节点与主题映射一致、34 题型 / 10 分组 / 51 节点引用有效 —— 全 PASS。
- 模拟运行：授课首页 10 专题、平面几何 13 点、字段填充、展开 / 收起、状态切换、解答展开、题型关联、图谱双视图同步 —— 全 PASS。
- 详细用例状态与证据见 `TESTS.md`；基准偏移需按 `RUL-006` 归因。

### CNF-008: 外部事实口径（已联网核实）

- 教育部《2025—2028 学年面向中小学生的全国性竞赛活动名单》（教监管厅函〔2025〕7 号）：全国中学生数学奥林匹克竞赛面向学段仅「**普通高中**」；竞赛及结果不得作为中小学招生入学依据和高考加分项目。
- 2026 年全国中学生数学奥林匹克竞赛（预赛）组织委员会通知：一试 80 分钟 / 120 分，不超 2017 版（2020 修订）课标但提高方法要求；二试 170 分钟 / 180 分，含平面几何、代数、数论、组合四大板块，适当增加课标外内容。
- 强基破格：多校要求高中阶段五大学科竞赛全国决赛二等奖及以上，2025 年起部分高校转向高考单科破格。

### CNF-009: 交付物清单与仓库目录

- 静态交付物：`deliverables/olympiad-knowledge-map.html`（交互图谱）、`deliverables/olympiad-poster-A3.html`（A3 挂图）、`deliverables/olympiad-book-list.html`（书单对照表）。
- 小程序工程：`apps/miniprogram/`（7 页面 × 四件套 + 数据文件由 `tools/build-data.js` 从真源生成 + `apps/miniprogram/utils/store.js`）。
- 文档：`docs/`（8 文档）；校验脚本：`tests/`（`validate.js`、`verify_content.js`、`check-data.js` + `evidence/`）；生成脚本：`tools/`。
- 内容三段流水线：`resource_data/`（原始资料，不入库）→ `reliable-data/`（唯一真源，JSON + 签核）→ `apps/miniprogram/data/` 与 `views/`（生成物，不入库）。
- 部署：`deploy/`（部署脚本与配置样例）；敏感私有信息只留本地 `deploy/config/`，不入库。
- WorkBuddy 应用卡标记（不入库）。

### CNF-010: 内容证据等级与复核状态

- 数据文件：`apps/miniprogram/data/content_meta.js`，导出 `DOMAIN_SOURCE / R2_CHECKED / metaFor / EVIDENCE_LABEL / REVIEW_LABEL`。
- 证据等级 `evidence`：`A` 官方依据（课标 / 大纲，可核对范围）、`B` 标准定理（权威教材可交叉验证）、`C` 原创讲解（措辞 / 自编例题 / 方法论建议，需人工判断）。三来源的范围依据均为 `A`，但每条讲解措辞固定标 `C`（`wording`）。
- 复核状态 `review`：`pending` 待人工复核（默认）、`checked` 已抽查复算、`verified` 已权威核对（当前 0 条）、`disputed` 存疑待修。
- 用户存疑标记存于 `store.js` 的 `disputed` 字段（与 status / notes 同一 state 对象，非新数据源）；授课页证据条可见并可点按标记。

### CNF-011: 内容保真校验基准快照（R2）

- 轮次 R2，日期 2026-11-24。
- 内容校验链：`node tests/verify_content.js` → `RESULT=22/22 FAILED=0`、`VERDICT=PASSED`，证据 `tests/evidence/CONTENT_VERIFY_R2.log`。
- 四类断言覆盖：C1 数值复算 10 条、C2 定理条件 8 条、C3 结论存在性扫描、C4 跨文件一致性 3 条。
- 本轮实质核查节点 15 个（`R2_CHECKED`）；剩余 42 个仍为 `pending`，不得视为已核实。
- 已发现并修复缺陷：`BUG-009`（缺结论 135°）、`BUG-010`（二面角锐钝）、`BUG-011`（校验器浮点精确比较误报）。
- 边界声明：本快照只证明「可机械判定部分通过」，不证明内容全部正确；人工闸门 `VFY-004` 尚未有外部签核，整体内容可信度仍受限于此。
