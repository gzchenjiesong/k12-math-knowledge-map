# CONFIG · 配置（当前取值与基准快照）

> 装：全部当前取值、数量、标识、文件路径、关键指标的基准快照。与代码里的键一一对应。
> 不装：「必须 / 不得」这类约束性措辞（归 `SPECS.md`）。
> 改值按 `IDX-004`：配置 + 代码，并对照 `CNF-007` 基准快照，偏移需归因。

### CNF-001: 知识节点基线

- 总数 **57**（v1.0.0 基线，ID 冻结）；三大来源：初中课标 `junior` = 21、高中课标 `senior` = 15、奥赛 `olympiad` = 21。
- v2.0.0 起新增小学层 `primary`（4—6 年级思维铺垫）= 10，总数 **67**；分层构成与配色见 `CNF-014`。
- 板块（module）合计 12；主题（theme）合计 10；题型分组 10。
- 来源标签色：初中蓝 / 高中绿 / 奥赛橙；小学层色值见 `CNF-014`。

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

### CNF-012: 进度同步配置（微信云开发 · 当前方案）

- 配置文件：`apps/miniprogram/utils/cloud-config.js`，含 `env`（环境 ID `k12-math-knowledge-map-dfac0f85a`）与 `collection`（`progress`）。二者非凭证，官方文档即在前端明文，故入库。
- 环境 ID 已用 `cloud_env_list --appid wxad6ce16e02f3b1fe` 核实有效；`progress` 集合已创建，`_openid` 索引由系统自动建立。
- 集合权限必须为**「仅创建者可读写」**：前端按 `_openid` 自动隔离，只读写自己的一条文档（存全量 `status/notes/disputed/updatedAt`，几 KB）。
- 同步层 `utils/sync.js`：本地优先（`store.js` 仍是唯一状态源）、拉取只填补本地缺失、离线静默降级、变更防抖 1500ms 推送。
- 自建服务器（`deploy/server/`）降级为备选方案，见 `DSN-011`；`utils/runtime-config.example.js` 保留为备选说明，不再默认启用。

### CNF-013: 可靠数据源发布基准（v1.0.0）

- 真源目录 `reliable-data/`；版本 `1.0.0`，生成日期 2026-11-24，可复现命令 `node tools/build-reliable-data.js`。
- 四类卡各 57：知识点 57 / 教案 57 / 易错 57（114 条）/ 示范 57（57 题），合计 228 张；逐条 SHA-256 见 `reliable-data/manifest.json`。
- 复核基准：228/228 `pending`、`checked=0`、`verified=0`、`disputed=0`；人工闸门 `VFY-005` 状态 `BLOCKED_NO_EVIDENCE`。
- 证据基准：`reliable-data/evidence/SOURCES.json` 共 8 条锚点，其中 7 条 `MISSING_LOCAL_COPY`（本地 `resource_data/` 无原件）。
- 差距基准：旧侧 `R2_CHECKED` 15 条含 1 条重复，去重为 14 个节点（43 pending）；与任务描述「15/42」的差异已记入 `reliable-data/index/GAP_MATRIX.md`。
- 闸门基准：`node tests/check-data.js` → `RESULT=9/9`、`VERDICT=PASSED`；`node tests/check-reliable-extra.js` → `VERDICT=PASSED`、`UNCOVERED=0`。
- 边界：两项机械 PASS 均不证明数学内容正确；正确性是「依据充分 + 人工签核」的结果。
- 教材补充（v1.0.1 准备，未生效）：家长确认教材为《奥数教程》《奥数学习手册》《奥数能力测试》× 七/八/九年级共 9 本，为正版纸质书 + 官网可下正版 PDF、高中分册另有但本学期仅授初中。计划见 `reliable-data/evidence/TEXTBOOK_PLAN.md`，状态 `DRAFT_NOT_MERGED`；未并入前 `SOURCES.json`（8 锚点 / 7 缺失）与 228 卡不变，教材按权威顺序第 3 层「可交叉验证」处理，仅能支撑 `pending → checked`，`verified` 仍须人工签字。高中 15 + 奥赛 21 节点暂维持 pending。

### CNF-014: 四段培养体系节点分层（v2.0.0 起生效）

- 层级：`primary`（小学 4—6 年级思维铺垫，10 节点，`p_` 前缀）/ `junior`（初中课标，21）/ `senior`（高中课标，15）/ `olympiad`（奥赛四大板块，21）。合计 **67**，见 `DSN-012`。
- `primary` 10 节点：`p_num` / `p_div` / `p_alg` / `p_ratio` / `p_app` / `p_geo` / `p_transform` / `p_count` / `p_pigeon` / `p_logic`。
- 来源标签色：小学紫（新增，CSS 变量 `--p`）；初中蓝 / 高中绿 / 奥赛橙不变。
- 跨学段衔接边只写入 `reliable-data/index/bridges.json`，不回写旧卡字段；v1.0.0 的 228 卡 ID、文件名、内容哈希冻结不变。
- 政策口径：小学段称「思维铺垫」，不称竞赛、不挂钩升学（`SPEC-005`、`CNF-008`）。教材锚点未到位前，10 节点全部 `evidence=C`、`review=pending`、`source_ref` 如实标注无权威依据。

### CNF-015: 内容修正 / 扩写发布基准（v2.1.0）

- 触发：`reliable-data/index/CROSS_CHECK_V1.md` 四路径异源交叉校验；家长决定内容产出不受教材扫描页影响，该改即改。
- 版本：`2.1.0`，生成日期 2026-11-25，四类卡各 67、共 268 张（条目数不变）；补丁源 `reliable-data/source/patches_v2_1_0.js`。
- 修正：CC-F01 `s_conic` 补椭圆方程 x²/4+y²=1 与直线 y=x+1，结论弦长 8√2/5；CC-F02 `j_trans` 补 A(0,2)/B(4,3) 坐标，结论 √41、P(8/5,0)。两结论经新推理档位独立复验一致且条件充分（`tests/evidence/crosscheck/RECHECK_V21.md`）。
- 扩写：9 节点（j_trans / s_conic / o_binom / o_comb_opt / o_graph / o_poly / s_complex / p_div / p_ratio）补进阶要点与方法，依据数学公共知识 / 标准定理（B/C 级），不冒充教材核对（SPEC-004）、仍 `review=pending`（SPEC-008）。
- 版本契约：被修改节点卡 `version=2.1.0`，未修改节点保持原版本；相对 v2.0.0 恰好 36 卡（9×4）变化、越界 0，由 E8c 断言守护。v1.0.0 与 v2.0.0 历史快照均完整保留未覆盖（E8a）。
- 明确声明：v2.1.0 有意修改了原 57 节点中的 7 个，故这些卡相对 v1.0.0 快照发生漂移；内容修正优先于「v1 卡永久冻结」的旧承诺，历史版本本身仍可完整追溯。
- 闸门：`check-data` 9/9、`check-reliable-extra` 33/33（UNCOVERED=0）、`validate` 28/28、`verify_content` 22/22 全 PASSED；人工闸门 VFY-005/006 仍 BLOCKED，`verified=0`。

### CNF-016: app 数据可复现发布基准（v2.1.0）

- 决策：app 数据 6 个模块（`apps/miniprogram/data/nodes.js`、`apps/miniprogram/data/lectures.js`、`apps/miniprogram/data/cards.js`、`apps/miniprogram/data/themes.js`、`apps/miniprogram/data/topic_index.js`、`apps/miniprogram/data/content_meta.js`）由生成物改为**入库**（clone 即可运行），但仍是生成物、禁止手工编辑，改动一律重跑 `node tools/build-data.js --allow-pending`。
- 组织层固化：真源四类卡不含主题/题型索引/三维卡/领域分组结构，这些组织层数据固化于 `reliable-data/source/app_organization.json`（入库），由生成器读取。v2.1.0 增补小学段 domain/lecture/theme shell（`t_primary`），使 67 节点在来源视图/授课视图/主题视图全覆盖。模拟器预览后修正显示：新增 `.domain-head.primary`、`.src-primary`、`.theme-head.tone11`（避免与 t_geo 共用 tone6）；图谱页/授课页的「三大来源/十大主题/57 个知识点」改为按数据动态渲染，卡片页排序纳入 primary。
- 字段映射：`ALL_NODES` 逐字段取自真源 nodes（title→n / points→p / prerequisites→pre / relations→rel / signals→sig / approaches→ap / description→d）；`LECTURES.points` 六段式逐字段取自真源 lessons；其余组织层取配置。
- 覆盖基准：`ALL_NODES=67`、`LECTURES=11 专题 / 67 点`、`DOMAINS/THEMES` 均覆盖同一 67 节点集；题型 34 / 分组 10 不变（组织层）。
- 一致性闸门：`tests/check-app-build.js` 18/18（app 数据逐字段等于真源 + 配置、四视图同节点集、头部版本/过渡警告）；删除后重建 6 模块字节级一致（可复现）。
- 校验脚本去硬编码：`validate.js` 基线从 manifest.domainBaseline.total 与组织配置 lectureShells/topicItems 动态取值（对齐 check-data.js），避免 57/10 写死。
- 状态：全部 268 卡仍 `pending`、`verified=0`，app 数据头部带未签核警告，仅为开发期过渡数据；人工闸门 VFY-005/006 不变。

### CNF-017: 小程序账号身份（名称 / 简称 / 介绍 / 服务类目）

- 决策（2026-11-25 家长确认，后台实测后定稿）：正式名称 **数学阶梯**（8 字符），简称 **阶梯**（4 字符，从名称第 3—4 字连续截取），介绍 **118/120 字符**：
  > 数学阶梯收录小学至奥赛 67 个数学知识点，提供授课卡片、知识图谱、题型定位与查漏清单，按四学段逐级进阶，帮家庭逐点讲透。
- 改名轨迹（后台查重实测）：`数海拾阶` 冲突 → `渐入数境` 冲突 → 备选 `数径通幽` / `格物数径` / `问津数海` 未采用 → `数学阶梯` 无冲突，2026-11-25 已提交名称修改申请（待审核生效）。公开网络搜到「阶梯数学」课程品牌，但以平台后台查重结果为准；本工具链无法代查唯一性。
- 命名依据：化用「不积跬步，无以至千里」（《荀子·劝学》）；「阶梯」对应小学→初中→高中→奥赛四学段逐级进阶，与介绍中的「四学段逐级进阶」语义一致。名称不含「奥数」，规避学科培训保护词与教育类目资质审核风险；搜索词由介绍中的「数学 / 奥赛」承接。
- 平台边界（以提交时后台提示为准）：名称 4—30 字符、全平台唯一（同主体公众号/小程序可同名），境内账号每自然年 2 次改名机会；简称 4—10 字符且须从名称按顺序连续截取；介绍 4—120 字符，1 汉字 = 2 字符，每月可申请修改 5 次。名称与介绍必须语义关联且介绍需列明功能点；禁「国家级/最高级/免费」等极限词与商业化用语。
- 工程同步：`apps/miniprogram/app.json` 全局导航栏标题改为「数学阶梯」（各页面 page json 仍保留功能标题）；`project.config.json` 的 `description` 为上述介绍全文。账号后台字段不由代码下发，须在微信公众平台「设置 → 基本设置」人工填写。
- 用语调整（2026-11-26 家长确认）：代码包内用户可见文案的「授课」统一改为「讲解」——tabBar 首项、`lecture.json` / `lesson.json` 页面标题、lecture 首页 5 处、`project.config.json` description。保持不变：页面路径 `pages/lecture/`、数据模块 `LECTURES` / `lectures.js` 字段名、治理文档历史决策名（`DSN-004` / `SPEC-007` / `TST-003` 等）与版本证据原文——这些属契约与历史可追溯性，不是用户可见文案。**注意**：上条对外账号介绍（已提交审批）当前仍为「授课卡片」，本次未改动后台字段；如需对外口径一致，由家长在公众平台「基本设置 → 介绍」人工修改（每月 5 次机会，考虑当前审批状态后再改）。
- 待人工确认：① 名称修改申请已提交，等待平台审核生效（生效前后台仍显示旧名）；② 若知识点总数变化，介绍中的「67」须同步更新（每月可改 5 次）。
- 服务类目（2026-11-25 家长确认）：**只保留「教育服务 > 教育信息展示」单一主营类目**，移除「工具 > 计算器」与「工具 > 备忘录」。依据：① 资质——「教育信息展示」个人主体可选、免资质，适用于纯静态知识内容展示，与需办学许可证的「在线教育/在线视频课程」是两回事，本产品无课程销售与在线教学；② 功能匹配——代码审核以类目与实际功能一致为第一抓手，app 四个 tab（授课/图谱/题型/查漏）与 67 节点六段式讲解均为内容展示，扫描代码无计算功能，故「计算器」无对应功能支撑；「备忘录」适用范围为「待办事项记录」，本产品仅有本地掌握状态记录（`utils/store.js`），属弱匹配；③ 一致性——名称「数学阶梯」、介绍所列「授课卡片/知识图谱/题型定位/查漏清单」与服务类目三者语义对齐，避免审核质疑；④ 成本——服务类目每月可申请修改 5 次（截图显示本月尚可改 4 次），调整不影响名称审批，两条线独立。同类实测案例中「知识内容展示」常被审核员判定或要求补充该类目，保留它即可覆盖主功能。
- 备案边界：服务类目（本文件，后台「设置 → 基本设置 → 服务类目」）与备案时的「服务内容标识」是两个独立环节；备案标识在「教育」项上对个人备案标注「不建议选择」，届时按「工具 / 信息查询」方向选取，勿与本类目混淆。
- 备案提交顺序（2026-11-25 决策）：**先等名称审批生效、再提交备案**，不在名称审核期间以默认名提交。依据：① 备案订单提交后系统不再获取账号最新信息，改名通过不会自动同步到备案记录，会形成"备案名 ≠ 实际名"；② 官方要求两者一致，不一致将被警告 / 封禁功能 / 强制注销备案；③ 备案进入管局审核（1–20 工作日）后订单无法撤回或修改，只能等通过或被驳回后再从「小程序备案 → 变更」重走一轮（变更备案触发条件明列"小程序改名"）。改名在备案前完成可一次到位，避免全套审核返工。
- 备案前置核对：备案「小程序名称」取改名生效后的「数学阶梯」；服务内容标识按「工具 / 信息查询」方向（个人备案避开「教育」项）；管理员、认证主体、备案主体三者信息须一致（个人备案高频驳回点）；备案不支持加急，初审 1–2 工作日、驳回重提 7 工作日、管局 1–20 工作日。等待期可并行准备主体负责人材料与上传代码，二者不依赖名称。
- 账号信息审批（名称 / 简介 / 头像）与服务类目均已提交，等待平台审核生效；服务类目每月可改 5 次，若后续被驳回按审核意见整改并重新提交。
- 开发版本上传（2026-11-25）：已用微信开发者工具 CLI 上传 `1.0.0`（首个对外版本），代码包 277,403 字节、`success: true`，生成开发版本，未提交审核 / 未发布；完整记录见 `tests/evidence/UPLOAD_V100.md`。代码包内界面标题已是「数学阶梯」（`app.json` / `app.js` / `project.config.json`），与后台待审批账号名是两个独立字段，故名称审批通过后**无需重传**。上传发生在名称审批期间不影响有效性——开发版本不进入发布链路，且上传与备案无依赖可并行。
- 头像资产：`deliverables/brand/math-ladder-avatar-1024.png`（1024×1024 PNG，1.02 MB，低于平台 2 MB 上限）。四级阶梯由「+ × √ △」数学符号构成、顶端五角星，深蓝渐变配浅青/暖金线条；主体居中并留安全边距，圆形裁切预览 `deliverables/brand/math-ladder-avatar-circle-preview.png` 验证无裁切丢失。生成后已用图像修复移除生成器强制叠加的「AI生成 / WORKBUDDY」水印（平台规范禁止头像含水印标识）；无文字、字母、数字、品牌标识。头像须在公众平台「设置 → 基本设置 → 头像」人工上传，每月可申请修改 5 次。
- 状态：账号身份定稿不等于内容已核准；268 卡仍 `pending`、`verified=0`，发布的是开发过渡数据，人工闸门 VFY-005/006 不变。

### CNF-018: 多平台（multiPlatform）配置入库与改名待办（2026-11-26）

- 背景：家长为在微信开发者工具里验证 iPad 显示效果，手动开启了多端处理，工具据此生成了一批多平台配置文件。最初作为本地验证配置保留工作区、不入库；2026-11-26 家长决定**一并提交入库**，以便换设备 / 重装后仍能复现 iPad 多端验证环境。
- 入库文件 4 项：`project.config.json`（`projectArchitecture` 改为 `multiPlatform`、`condition: true`、`simulatorPluginLibVersion` 写入插件版本）、`app.miniapp.json`、`project.miniapp.json`（miniVersion v2，含 android/ios/ohos SDK 版本与空图标占位）、`i18n/base.json`。
- **`i18n/base.json` 含审批前旧名「寇德计算器」**（`ios` / `android` / `common` 三处 `name`）——这是当前尚未审批通过的正式名，不是错误。名称审批通过后须将三处 `name` 同步改为「数学阶梯」，否则多端包会一直沿用旧名。此改名待办与 CNF-017 的后台账号改名是两个独立字段，须一并处理。
- 影响说明：`project.config.json` 的 `multiPlatform` 是开发者工具的多端编译开关，开启后可切 iPad 设备验证横屏；不影响小程序端（微信）的发布包，也不改变 `app.json` / `app.js` 的界面标题。若后续上传遇到编译差异，先确认此开关状态。

### CNF-019: 最终定名「数海扶摇」与账号信息更新（2026-11-26）

- 决策（2026-11-26 平台审核通过）：正式名称 **数海扶摇**（8 字符），简称 **数海扶摇**（同名，从正式名顺序连续截取，符合 4–10 字符规则）。取代 CNF-017 中的「数学阶梯」+「阶梯」——后者因「涉及通用词命名」被平台驳回。
- 名称轨迹：`数海拾阶` 重名 → `渐入数境` 重名 → `数学阶梯` 通用词驳回 → **`数海扶摇` 通过**。典故出自《庄子·逍遥游》「抟扶摇而上者九万里」，既呼应四学段逐级进阶，又避开通用词判定。CNF-017 / R12–R24 中的旧名保留为历史记录，不改写；本条为现行唯一有效口径。
- 定稿介绍（114/120 字符，2026-11-26 家长已在后台更新）：
  > 数海扶摇覆盖小学至奥赛 67 个知识点，提供讲解卡片、知识图谱、题型定位、查漏清单与跨学段衔接链，扶摇直上，逐点讲透。
  - 相较 CNF-017 的 118 字符版：换名 +「授课」→「讲解」+ 新增「跨学段衔接链」功能点 +「扶摇直上」呼应新名。功能点齐全、无极限词、「奥赛」沿用原文（避开「奥数」保护词）。
- 状态（2026-11-26）：名称/简称/头像/介绍/服务类目均已在微信公众平台后台更新生效；**小程序备案已提交，状态「平台审核中」**，后续转管局审核（1–20 工作日、不可加急），备案完成前不可发布。微信认证未认证，无「被搜索/被分享」能力，认证通过可重置改名次数（当前名称剩 1 次修改机会）。
- 工程同步（本轮全部完成，全量扫描零残留）：`app.js` appName、`app.json` 标题、`project.config.json` description、`graph.wxml` h1、`present.js` 2 处 eyebrow、`present.wxml` brand、`tools/build-poster.js` 生成器标题，以及由生成器重新产出的两版 A3 挂图；`i18n/base.json` 三处 `name`（CNF-018 遗留待办）一并改为「数海扶摇」。
- 待办：① ~~后台开发版 1.0.0 是功能改动前上传的，衔接链/投屏/A3挂图/多屏适配若要随首版发布须重传开发版~~ **已完成（2026-11-26 重传，见 R26 / `tests/evidence/UPLOAD_V100.md` 重传记录）**——现行开发版 1.0.0 已含全部新功能，可直接提审；② 微信认证个人主体可行性与必要性待核实（家长后续人工处理）；③ 备案平台审核中、转管局审核，完成前不可发布（家长后续人工处理）。完整记录见 `tests/evidence/RENAME_FINAL.md`。

### CNF-020: 投屏演示页改为标准 16:9 PPT 画布（2026-11-26）

- 决策（家长要求）：演示模式按电视屏幕定制横屏 PPT 页面，进入后类似 PPT 播放——电视投影、手机/iPad 当控制器翻页。路由选择**系统镜像方案**（沿用 M1：小米手机系统屏幕镜像到电视），不做双端独立渲染 + 云同步方案。
- 比例口径：电视端 4:3 已淘汰，55–100 寸智能电视几乎全是 16:9（4K 为主）；4:3 只出现在 iPad 横屏（控制器端）。故**只做一套 16:9 电视版式**，不写 4:3 两套。四个主力尺寸 55/65/75/85 合计 74% 零售量，一套母版全覆盖。调研数据见 `tests/evidence/TV_PPT_16X9.md` 第 1 节。
- 实现口径：`pages/present` 用固定 1280×720 内部坐标系 + `transform:scale(cw/1280)` 等比适配，运行时取最大 16:9 矩形居中 letterbox，源设备比例不影响画布。7 类 PPT 版式（cover/essence/method/question/answer/recap/end），例题保持**先思后答两页**。遥控器 4 按钮悬浮画布外、翻页后 3.5s 自动淡出、触摸唤醒。
- 实测：iPad 13" 模拟器 1032×1376 下画布 1032×581（比例 1.776≈16/9），52 页，各版式截图取证 6 张。五链全绿。
- 边界：系统镜像下唤醒态控制条仍会出现在电视画面（3.5s 后淡出），若要完全无控制条须升级双端方案，本轮不做；真机投屏效果待家长按 `MIRROR_TEST_GUIDE.md` 实测。

### CNF-021: 自定义 tabBar 修复 iPad 底栏字号（2026-11-26）

- 问题：微信原生 tabBar 字号固定约 10px、不随屏幕放大，iPad（窗口 1032px）上 4 个标签明显偏小。
- 方案：`app.json` 的 `tabBar` 加 `custom: true`，`list` 等字段完整保留（兼容低版本 + `validate.js` 的 NAV/TAB 断言依赖）；新增 `custom-tab-bar/index.{js,json,wxml,wxss}` 四件套（路径/文件名微信固定）。
- 字号口径：用**物理 px** 分档——基础（手机）12px / 高 50px，`@media (min-width:768px)`（iPad 等宽屏）16px / 高 66px；不用 rpx（宽屏会等比放大，无法分档）。选中态蓝色胶囊高亮。
- 选中态同步：每个 tab 页持有独立 tabBar 实例，封装 `utils/tabbar.js#setSelected(page,index)`，四个 tab 页 `onShow` 传 0/1/2/3；跳转用 `wx.switchTab`。
- 实测：iPad 13" 模拟器窗口 1032px，`hasBar:true`、讲解页 `selected:0`、图谱页 `selected:1` 切换正常，字号清晰无截断；截图 `TABBAR_{lecture,graph}_ipad.jpg`。完整记录见 `tests/evidence/TABBAR_CUSTOM_IPAD.md`。
- 边界：基础库 <2.5.0 回退原生渲染（功能不受影响）；自定义模式下 `wx.setTabBarItem` 等样式接口失效（本项目未用）。本次为审核期功能改动，若需随首版上线须重传开发版（家长决策）。

### CNF-022: 资料追溯与同步修复基准（2026-11-26）

- 产品数据粒度：每微信账号一份家庭共用进度/笔记，无孩子档案与程序考核；沿用原生小程序和现有微信云开发，不启用新后端、不执行云端部署。
- 来源登记沿用 `reliable-data/evidence/SOURCES.json`；新增 `reliable-data/evidence/NODE_SOURCES.json` 记录全节点来源引用、核对位置、用途与缺口。来源映射独立修订，不改写 v1/v2 历史卡片快照或伪造卡片签核。
- 来源映射结构：`schemaVersion / updatedAt / nodes`；每节点 `references[] / gaps[]`，引用含 `anchorId / purpose / locator / verification / note`。purpose 为 scope、definition、example、teaching；verification 为 section_checked、catalog_only、pending。获取状态与核验状态分开。
- 本轮不宣称完成多模型核验或人工签核，已有数学内容与节点数量维持基线；补资料与来源映射不自动升级 review。
- 现行修复及验证结果在本节追加，历史 CNF-012 的单文档/本地优先旧同步语义由本节末次修订替代；CNF-013~016 数学内容历史版本基准保留。
- 同步权限契约：沿用 `progress` 集合的**基础权限「仅创建者可读写」**，服务端自动按当前微信身份加 `_openid` 查询约束；客户端不传自定义安全规则的 `{openid}` 占位符，不持有或伪造用户身份。新版使用稳定操作 ID 的 `doc.set`，只重试同一操作内容。本实现不支持直接切成自定义安全规则（其 owner 条件下 `doc.set` 不适用），不得用开放读写规则绕过。真实控制台权限本轮未读取/更改，必须在真机验收时核实。
- 同步协议：一个账号仍是一份逻辑进度/笔记；物理上为多份操作文档，按字段 Lamport 版本合并，显式 0/空串与删除 tombstone 均保留版本。并发同字段用 clock/device/seq 决定结果，不以设备时间或状态最大值断言先后。旧快照按低优先级确定性合并；没有 dirty 标记但非空的旧本地数据也以 clock=0 的最低优先级基线发送，填补云端缺失，不覆盖已有旧云字段；旧队列及原数据保留为本地备份。
- 官方契约依据：[数据库安全规则与基础权限对比](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database/security-rules.html)、[Document.set](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/database/document/Document.set.html)。文档核对不替代真实 SDK 与权限测试。
- 迁移与升级限制：旧记录没有字段级时间，因此不承诺恢复真实历史顺序或已丢失的删除。**同账号全部设备须先升级，新旧协议不得混写，也不能直接回滚旧客户端**；旧版 `limit(1)` 可能读到新版操作文档，随后整份覆盖会损伤该操作，旧 store 也会丢弃本地版本元数据。此轮未实施真实迁移或清理，发布前先验证并保留原数据。
- 运行边界：每次拉取按 `_id` 游标全量分页，每页20条、最多5000页；每批最多发送50操作，失败最多定时重试3次（3/10/30秒），前台/网络恢复可重新触发。单字段笔记最多16384字符、业务投影最多200000字符、本地outbox最多10000条；超限返回失败、保留原数据。按操作保存使云日志持续增长，读取成本随历史量增加；本轮不自动压缩/删除历史。5000页上限不是性能验收结论，实际配额、长历史扫描耗时和容量压测须后续验证。
- 页面联动：可见进度页订阅远端变更，隐藏/卸载退订；笔记编辑草稿不被远端刷新覆盖。本地保存失败不显示成功提示，专题批量状态以一次原子本地保存完成；这些均有隔离回归。
- 来源与编译落地：登记11条来源（3条有下载原件、3条网页入口、4条未取得、1条仓内原创），4个本地PDF哈希复验通过。67节点/117引用，42节点有范围正文定位；67节点共98条缺口，定义和例题逐条外部核验均为0。当前展示取映射的已核定位，旧 `source_ref` 保留为 legacySourceRef；不改268张卡、真源manifest、组织配置或历史快照。
- 数据消费：三项指定镜像不一致时停止构建；独立例题/易错进入应用，原6节点补充内容与9道例题完整保留、独立标注。审核状态与四卡哈希、来源登记/映射哈希绑定，历史 R2 名单不参与当前状态推导。旧反向 seed 脚本退役为退出码2、零读写保护入口。
- 本轮本地验证见 R31 / TST-020~022；真实云与真机为 VFY-007 `BLOCKED_NO_EVIDENCE`。生成八文件合计1,221,898字节，小程序自有源码61文件合计1,373,415字节（UTF-8文件大小统计，非微信编译/压缩包大小）；未进行原生编译、上传或首屏性能验收。

### CNF-023: 第一批布局与交互基准（R33，2026-11-26）

- 沿用768px宽屏断点与1180px页面最大宽度；手机主要正文16px、宽屏17px，辅助说明13px起，主要触控区最小高度44px。局部标题和控件使用物理字号兜底，不随宽屏rpx无限放大；保留专题两列、卡片三列和讲解六段结构。
- 自定义底栏保持手机50px/宽屏66px的内容高度，安全区另计；仅四个主导航页使用tab-page安全留白，详情页不套底栏占位。实际遮挡须环境核验，不以静态样式断言已复现。
- 题型定位渲染后滚到目标，高亮持续2000ms；隐藏/卸载清理，非法ID不定位。卡片统计字段区分totalCardCount与resultCount。
- 三态菜单保持未开始、学习中、已掌握，标注当前值；详情/专题/图谱共用选择语义，状态数值与已有存储格式不变。
- 来源摘要展示四卡中与当前页签对应的状态和范围定位数量，按需展开已登记范围位置及缺口数量；不增加外部抓取、不修改生成数据。组织补充内容显式标记独立待核。
- 第一批实施与回归依据RUL-011 / TST-023 / VFY-008。没有新增页面、导航、后端、孩子档案或考核；没有提交、上传或发布授权。

> R33实施增补（2026-11-26）：以上基准已落地于七个阅读页、公共样式和两个新增只读摘要/状态选择模块。自有源码现为63文件（R31的61加2个utils；不含本机IDE私有配置），不是编译包体统计。禁云隔离副本同口径63文件无缺失，仅项目名、cloud-config、store三项有意差异，临时portrait已恢复auto。测试及原生环境证据统一见TST-023/VFY-008与TESTS的R33结果，原生菜单和新版手机缺证，不提升内容审核状态。

> R33手机补验（2026-11-27）：手机竖屏iPhone17代表页面已补验；原生菜单由用户确认可见并完成选择/取消/同值，运行时回读通过，VFY-008现行代表范围PASS。上述原生缺证为历史，不再据截图未捕获菜单推定不可见。63源码口径及auto方向不变，本次未改业务取值；隔离合成j_eq状态现为2、outbox5，未访问真实记录。完整设备方向矩阵与真实云/性能不因此获通过。

### CNF-024: 第二批阅读与记录配置（R34，2026-11-27）

- 范围仅B2/B4/B6，保留四tab与八注册页面；阅读上下文采用内存会话，最多20个返回片段，不持久化，不纳入同步。
- 查漏视图为进度/笔记/存疑，原全部/学习中/未开始筛选仅在进度视图使用；笔记查询仅用于已有笔记，按现有节点顺序展示，摘要最多100字符，空白笔记不计入。
- 状态菜单三项及数值不变，当前项使用短标识；界面直接显示“已掌握”等状态，不强调家庭/个人模式。来源收起态保留简短入口，详细审核/范围/缺口展开后访问。
- 阅读位置以会话内页签/展开及像素滚动为主，重建页面后从当前数据重算列表，再恢复界面；设备尺寸或内容变化时允许滚动被平台夹限。不承诺进程结束后恢复。
- 未保存笔记的可控制离开使用取消/放弃确认，不自动保存；保留原save失败与取消读取最新store语义。不修改store字段与云协议。
- 正文与触控配置沿用CNF-023。实施与证据见RUL-012、TST-024、VFY-009；结果待执行。

> R34实施补充（2026-11-27）：草稿兜底也采用会话内存，最多20条，仅卸载实例进入池；不保护进程结束。查漏每次重建取一次当前store业务快照派生条目，避免按67节点反复读取三个字段；统计沿用store.stats，不缓存历史业务快照。原生日志曾出现查漏56–93ms生命周期警告，本优化只消除冗余读取，不将模拟器耗时视为性能验收。

> R34验收补充（2026-11-27）：TST-024与VFY-009代表手机隔离范围PASS；新增回归36/36、40/40，旧UI44/44和同步65/65保留。65自有源码仅三项隔离差异，auto未变。会话草稿、取消/放弃有原生运行时与用户操作证据；进程结束、全设备矩阵及真实云不在通过范围。截图15张含2诊断，详见TESTS及simulator-r34汇总。

### CNF-025: 工程维护与源码提交配置（R35，2026-11-27）

- 根目录package.json设为private、Node.js >=18，无第三方依赖、无需安装；npm test顺序运行现有11组检查，失败即停止。单项仍可直接node执行，不启动云、IDE或部署。
- 检查顺序：check-data、check-reliable-extra、validate、verify_content、check-app-build、check-sources --self-test、check-data-contract、check-sync、check-ui、check-reading-context、check-records。结果仅代表各脚本声明的机械/隔离范围，不合并为真实云或内容人工核准。
- .gitattributes仅将apps/miniprogram/data下生成文件固定为LF，保持字节级重建稳定，不全仓重排换行；数学真源、manifest与历史快照不改。
- .gitignore新增排除deploy/server/data下运行数据，仅保留.gitkeep；原件resource_data、隔离副本.workbuddy、私有配置与凭证继续排除。截图和证据保留，不删除诊断帧。
- deploy/server是历史自建服务样例，不能替代当前微信云操作协议；源码push不执行部署脚本。现行文档入口为README、PRM-001最新修订、INDEX及TESTS；旧编号和历史描述保留并明确覆盖关系。
- 本轮基线：main / 7172697；fetch后HEAD与origin/main差异0/0。提交结果与复验在TESTS的R35执行摘要续记；不把旧微信审核状态描述为本轮已核查现状。
