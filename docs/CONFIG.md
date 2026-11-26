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
