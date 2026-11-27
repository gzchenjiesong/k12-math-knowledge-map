# TESTS · 测试与验收台账

> 装：编号用例、执行结果、证据路径、追溯关系。
> 不装：用例实现代码、业务规则与数值、一次性调试日志。
> `TST-NNN` = 可自动执行、确定性、同输入可复现的断言；`VFY-NNN` = 依赖真实环境的验收项。
> 状态四档：`PASS` / `FAIL` / `BLOCKED_NO_EVIDENCE` / `SKIPPED`。

---

## 一、测试用例 TST-NNN（自动化）

字段顺序：编号 | 归属 | 前置条件 | 步骤 | 期望 | 证据文件 | 状态 | 最近执行轮次

### TST-001: JSON 严格校验

- **归属**：`SPEC-002` / `CNF-005`
- **前置**：10 个 JSON 文件存在
- **步骤**：对 `app.json`、`project.config.json`、`sitemap.json` 及 7 个页面 `.json` 逐一 `JSON.parse`
- **期望**：10/10 解析成功，0 异常
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1（2026-11-24）

### TST-002: JS 语法校验

- **归属**：`BUG-002` / `BUG-008`
- **前置**：14 个 JS 文件存在
- **步骤**：对全部 JS 与内嵌脚本用 `new Function` 解析（注入 `require/module/exports/Page/App/getApp/wx` 桩）
- **期望**：14/14 解析通过，0 语法错误
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-003: 页面四件套配对与授课优先导航

- **归属**：`SPEC-007`
- **前置**：`app.json` 可读
- **步骤**：检查 `app.pages` 每项均有 `js/json/wxml/wxss` 四件套；检查 `tabBar.list[0].pagePath` 与首页首屏叙事
- **期望**：7 页面 × 4 文件齐全；tabBar 首项 = `apps/miniprogram/pages/lecture/lecture`
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-004: WXML 标签栈配对

- **归属**：`BUG-005`
- **前置**：7 个 `.wxml` 存在
- **步骤**：用标签栈检查 `view/text/button/textarea/block/input/template` 的开闭配对
- **期望**：7/7 无未闭合、无错配
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-005: 57 节点授课全覆盖

- **归属**：`SPEC-002`
- **前置**：`nodes.js` / `lectures.js` 可读
- **步骤**：收集 `ALL_NODES` 的 ID 集合与 `LECTURES[].points[].nodeId` 集合，双向比对
- **期望**：授课覆盖数 = 节点总数 = `CNF-001` 基线（57/57），无遗漏、无悬空
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-006: 讲解六要素完整

- **归属**：`CNF-005` / `RUL-002`
- **前置**：`lectures.js` 可读
- **步骤**：逐点检查 `essence/method(≥2)/example{q,a}/pitfalls(≥1)/links/check(≥2)`
- **期望**：57/57 知识点六段齐全
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-007: 专题节点与主题映射一致

- **归属**：`RUL-007` / `SPEC-002`
- **前置**：`lectures.js` / `themes.js` 可读
- **步骤**：对每个专题，比对 `points[].nodeId` 集合与 `themes.THEME_OF` 同主题节点集合
- **期望**：10/10 专题节点集合完全一致，57 节点全覆盖、无重复
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-008: 全 ID 引用无悬空

- **归属**：`BUG-003`
- **前置**：`nodes.js` / `topic_index.js` 可读
- **步骤**：遍历节点 `pre`/`rel`、题型 `nodes`、规则 `ids` 引用，检查目标 ID 存在
- **期望**：悬空引用数 = 0
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-009: 题型数据完整性与结构

- **归属**：`BUG-007` / `RUL-004`
- **前置**：`topic_index.js` 可读
- **步骤**：检查 `TOPICS_BY_NODE[nodeId]` 为 ID 字符串数组、`TOPIC_ITEMS` 可按 ID 查名、题型 `lesson{core,steps,trap}` 齐全
- **期望**：34 题型 / 10 分组 / 51 节点覆盖，关联名称均可解析
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-010: 模拟运行交互

- **归属**：`RUL-003` / `BUG-006` / `BUG-008`
- **前置**：页面 JS 可加载（注入 wx / Page 桩）
- **步骤**：模拟 `onShow`/`onLoad`→默认展开断言；`cycleStatus`→三态切换与双视图同步；`toggleExample`→解答展开；`locator.locate`→题型命中；`node.onLoad`→反查题型
- **期望**：默认展开首个专题、状态切换正确且两视图一致、解答可展开、题型命中与反查非空，无 undefined
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-011: 文档四类校验

- **归属**：`SPEC-006`
- **前置**：8 个文档存在
- **步骤**：`node tests/validate.js` 执行编号连续性 / 跨文件重复 / 路径存在性 / 失效引用四类校验
- **期望**：四类校验全绿，前瞻编号集合与 `IDX-005` 一致
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-012: 模板哈希基准比对

- **归属**：`BUG-001`
- **前置**：`apps/miniprogram/manifest.json` 存在
- **步骤**：对 manifest 声明的 9 个文件按 LF 规范化后算 SHA-256，与清单比对
- **期望**：9/9 一致
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1

### TST-013: 内容正确性机械断言（四类）

- **归属**：`SPEC-008` / `BUG-009` / `BUG-010` / `BUG-011` / `CNF-011`
- **前置**：`verify_content.js` 与 5 个数据模块可读
- **步骤**：`node tests/verify_content.js`，执行 C1 数值复算（10 条）+ C2 定理条件完整性（8 条）+ C3 结论存在性扫描 + C4 跨文件一致性（3 条）
- **期望**：`RESULT=22/22 FAILED=0`、`VERDICT=PASSED`；数值用容差比较（BUG-011）
- **证据**：`tests/evidence/CONTENT_VERIFY_R2.log`
- **状态**：PASS（**边界**：只证明可机械判定子集无矛盾，不证明内容正确，见 `SPEC-008`）
- **最近执行**：R2（2026-11-24）

### TST-014: 关键定理条件完整性专项

- **归属**：`SPEC-008` 第 2 条 / `RUL-009`
- **前置**：`lectures.js` 可读
- **步骤**：对费马（p∤a）、欧拉（互素）、中国剩余（模数互素）、基本不等式（各项为正）、韦达（验 Δ）逐一检查条件关键词是否出现在讲解中
- **期望**：8/8 条件完整；发现任一缺失即 FAIL 并按 `RUL-009` 闭环
- **证据**：`tests/evidence/CONTENT_VERIFY_R2.log`（C2 段）
- **状态**：PASS
- **最近执行**：R2

### TST-015: 内容缺陷回归断言

- **归属**：`BUG-009` / `BUG-010` / `RUL-009`
- **前置**：`lectures.js` 可读
- **步骤**：断言 `o_geo_trans` 讲解含「135°」、`s_vec3` 含锐钝说明、`o_cong` 费马条件已补全
- **期望**：3/3 命中，确保三处已修缺陷不回退
- **证据**：`tests/evidence/CONTENT_VERIFY_R2.log`（C4 段）
- **状态**：PASS
- **最近执行**：R2

### TST-016: 可靠数据源发布资格闸门

- **归属**：`SPEC-008` / `RUL-008` / `PRM-010`
- **前置**：`reliable-data/manifest.json` 与四类卡各 57 份存在
- **步骤**：`node tests/check-data.js`，执行 D1 manifest 版本 / D2 四类各 57 / D3 必备字段 / D4 review 四态且 verified 带签字 / D5 evidence 枚举
- **期望**：`RESULT=9/9 FAILED=0`、`VERDICT=PASSED`
- **证据**：`tests/evidence/CHECK_DATA_V1.log`
- **状态**：PASS
- **最近执行**：R7（2026-11-24）
- **边界**：只检查发布资格与结构，**不证明数学内容正确**（`SPEC-008`）

### TST-017: 可靠数据源扩展机械检查

- **归属**：`SPEC-008` / `CNF-013` / `PRM-010`
- **前置**：`reliable-data/manifest.json`、`tests/check-reliable-extra.js` 可读
- **步骤**：`node tests/check-reliable-extra.js`：E1 哈希一致性（manifest ↔ 文件）、E2 追溯 UNCOVERED、E3 覆盖度与条目数、E4 结论存在性、E5 定理条件、E6 异源独立复算（17 条）、E7 不自证红线
- **期望**：`VERDICT=PASSED`、`UNCOVERED=0`；全部 228 卡 `review=pending`、`verified=0`
- **证据**：`tests/evidence/RELIABLE_EXTRA_V1.log`
- **状态**：PASS
- **最近执行**：R7
- **边界**：补 `check-data.js` 不查的哈希一致性与 UNCOVERED；仍不证明讲解正确

### TST-018: 多路径异源交叉校验（内容正确性辅助，非签核）

- **归属**：`SPEC-008` / `CNF-013` / `PRM-010`
- **前置**：v2.0.0 真源 268 卡可读；四个独立解题/评审方互相隔离
- **步骤**：`node tools/export-crosscheck.js` 导出盲题包（剥离答案，禁读 answer_key/reliable-data/apps）+ 裸主题清单 → 路径 A 四域独立反向解题（67 题）→ 路径 B 裸主题完整性基准（67 节点）→ 路径 C 定理条件四卡合并审查 → 主审逐条比对并落 `reliable-data/index/CROSS_CHECK_V1.md`
- **期望**：结论冲突 0（或如实记录）；任务明令禁止的条件省略 0；发现项进修复清单；268 卡哈希与 manifest 不变、`pending=268`、`verified=0`
- **证据**：`tests/evidence/crosscheck/*`、`reliable-data/index/CROSS_CHECK_V1.md`
- **状态**：PASS（67 题独立解覆盖，结论一致 66/67，存疑 2 为题目陈述，冲突 0；定理条件齐全 0 省略）
- **最近执行**：R9
- **边界**：**异源 AI 交叉不构成人工签核、不解锁 `verified`**（`SPEC-008`）；"一致"仅表示两套独立推导无矛盾，不等于内容已核实。关键词粗筛 `completeness_coarse.md` 仅定位线索，低覆盖≠缺漏。发现项 CC-F01/F02/F03 未执行，修改走 v2.0.1。

### TST-019: app 数据生成物一致性（生成物 ↔ 真源 ↔ 组织配置）

- **归属**：`CNF-016` / `SPEC-008`
- **前置**：`reliable-data/` v2.1.0 + `source/app_organization.json` + `index/bridges.json` 可读；`tools/build-data.js --allow-pending` 已生成 7 模块
- **步骤**：`node tests/check-app-build.js` → G1 七模块导出齐全；G2 `ALL_NODES` 逐字段等于真源 nodes 映射；G3 `LECTURES.points` 六段式等于真源 lessons（含补丁）；G4 四视图覆盖同一 67 节点集；G5 组织层内容等于配置；G6 头部版本与未签核警告；G7 BRIDGES 等于 bridges.json、富化字段/反向索引/端点正确
- **期望**：24/24 PASSED；删除 7 模块后重跑生成器字节级一致（可复现）
- **证据**：`tests/evidence/APP_BUILD_V21.log`、`tests/evidence/BUILD_APP_V21.log`、`tests/evidence/BRIDGES_V21.md`
- **状态**：PASS（24/24；G7 为衔接边新增 4 项 + G1/G6 扩到 7 模块）
- **最近执行**：R16
- **边界**：一致性≠内容正确；真源仍 `pending=268`、`verified=0`，app 数据为带警告的过渡数据，人工闸门 VFY-005/006 不变（`SPEC-008`）

---

### TST-020: 资料来源登记与节点追溯

- 归属：SPEC-009 / RUL-010 / CNF-022。
- 运行：`node tests/check-sources.js`。
- 期望：全部节点存在映射、引用不悬空、定位和获取状态诚实、来源与内容核验分离；本地原件哈希在存在时可校验；未获取原件明确告警而非伪称已下载。
- 状态：**PASS**，最近执行 R31；`--self-test` 42/42，结构1/1，4个本地原件HASH_OK、NOT_PRESENT=0。67/67映射、117引用、42/67范围定位、67节点保留98条缺口；定义/例题逐条外部核验均为0。证据摘要见本文件R31。

### TST-021: 跨设备同步与旧数据迁移回归

- 归属：SPEC-003 / SPEC-009 / RUL-010 / CNF-022。
- 运行：`node tests/check-sync.js`，全部使用隔离内存存储与云数据库桩。
- 期望：零值/空笔记/取消存疑不复活、旧确认不清新变更、并发修改不整份覆盖、失败重试幂等、旧状态保留、拉取失败不新建假空档、异常输入安全拒绝。真实云权限不由桩测试替代。
- 状态：**PASS**，最近执行 R32，39/39；保留 R31 的37项，新增取消笔记恢复已存值/空值且不增队列、编辑期间远端更新后取消显示最新已存版本两项。修复前37/39（新增两项失败）、修复后39/39；手机隔离模拟器同场景已复验。真实环境见VFY-007，不能写为已实测。

### TST-022: 真源编译与核验回归防线

- 归属：SPEC-008 / SPEC-009 / RUL-010 / CNF-022。
- 运行：既有 `tests/check-app-build.js`、`tests/check-reliable-extra.js`、`tests/verify_content.js` 及新增数据回归测试。
- 期望：当前审核标签等于真源；重复内容漂移阻止编译；修改实际答案会触发对应核验失败；生成物可重建；历史快照不变；旧反向编制器不会写入真源。
- 状态：**PASS**，最近执行 R31，`node tests/check-data-contract.js` 49/49；app一致性29/29、可靠性扩展33/33、数学子集23/23、真源结构9/9。实际错答案并更新hash仍被拦截；八生成文件逐字节重建一致。证据摘要见本文件R31。

### TST-023: 第一批页面交互与展示回归

- 归属：RUL-011 / CNF-023 / SPEC-009。
- 运行：`node tests/check-ui.js` 与 `node tests/check-sync.js`。
- 期望：题型父子展开、渲染后定位、失效目标及生命周期清理；总数与结果数分离；三页显式状态选择的确认/取消/同值/失败；提示与解答独立；当前卡类来源摘要及补充内容标签；首页边界文案和关键布局配置。
- 状态：**待执行（R33实施中）**。内存行为及静态断言不替代原生页面渲染；既有数据与同步回归也须复跑。

> R33执行增补（2026-11-26）：现行状态 **PASS**。主代理复跑 `check-ui.js` 44/44、`check-sync.js` 65/65，既有来源/数据检查均通过，详见本文件R33结果与 `tests/evidence/simulator-r33/runtime-evidence.json`。Git HEAD旧locator/cards四文件注入内存后9/44、35失败，防线能够拒绝旧行为；这些失败包含新需求缺失，不是35个独立旧缺陷，也不宣称所有测试均先红后绿。原生状态菜单和新版手机验收仍由VFY-008单列缺证。

### TST-024: 第二批阅读上下文、记录聚合与简洁文案

- 归属：RUL-012 / CNF-024 / SPEC-003 / SPEC-009。
- 前置：禁真实storage/云的隔离VM，使用当前页面源码与数据；保留既有回归。
- 步骤：运行新增reading-context/records检查及check-ui/check-sync；验证跨tab返回链、同页多实例、导航失败/重复/隐藏迟到回调、重建后最新store与旧UI分离、草稿取消离开/放弃/保存失败、笔记和存疑查询/返回/远端刷新；验证精简文案和可访问来源事实。
- 期望：会话有界且零持久化；聚合由唯一store派生，失效ID/空白笔记安全处理；未保存草稿不被远端刷新或取消离开覆盖；所有旧同步/数据防线保留。
- 证据：待执行；**BLOCKED_NO_EVIDENCE（R34实施中）**。不以VM代替原生返回行为。

> R34执行增补（2026-11-27）：现行状态 **PASS**。新增 `tests/check-reading-context.js` 36/36、`tests/check-records.js` 40/40；旧 `check-ui.js` 44/44、`check-sync.js` 65/65均实际复跑。新harness真实加载reading-context/draft-guard，记录测试同时真实加载store/sync-state；没有用空壳替代。接口集成期间UI曾43/44，补齐返回/来源/存疑handler后44/44。汇总见 `tests/evidence/simulator-r34/runtime-evidence.json`；原生范围由VFY-009单列。

### TST-025: 工程入口、忽略边界与清理回归（R35）

- 归属：CNF-025 / RUL-012修订 / BUG-012。
- 前置：当前仓库、Node.js 18+、Git；不连接真实云，不执行微信上传发布。
- 步骤：npm test；validate检查11组固定测试入口、无依赖配置、生成物LF属性及Git实际忽略/放行；check-sync验证首页两个真实导航零业务写入且无旧建议状态/事件；check-records验证专题存疑按最新store取反、非法ID零操作及失败保留。
- 期望：旧回归均保留；新增断言可拒绝原缓存取反实现；运行数据忽略而.gitkeep可入库；原件/私有配置/隔离副本不入库；生成物可重建且真源/快照无新增漂移。
- 状态：待执行，BLOCKED_NO_EVIDENCE；本项是源码交付检查，不解除VFY-007，也不重算R33/R34原生验收。

> R35执行增补（2026-11-27）：现行状态 **PASS（工程与隔离回归范围）**。根目录npm test十一组全部通过，validate由28增至32项、records由40增至46项，其他组数量不减少。主代理用内存替换恢复专题陈旧缓存取反，真实记录套件42/46、4项定向失败（预期exit1）；未变异源码46/46。日志首个命令转义语法错误不作为回归证据，之后实际变异运行与修复后全量日志分别保留。证据：`tests/evidence/CHECKS_R35.log`、`tests/evidence/REGRESSION_R35_STALE_MUTATION.log`。

## 二、验收用例 VFY-NNN（环境相关）

### VFY-001: 应用卡与小程序配置可交付

- **归属**：`CNF-003` / 交付门槛
- **前置**：应用卡标记存在
- **步骤**：检查 `app.json` 四 tab 合法、7 页面四件套齐全、无 JS 语法错误
- **期望（量化）**：genie 文件 1 个；tabBar 4 项；页面四件套 28 个文件；JS 错误 0
- **证据**：`tests/evidence/VALIDATION_R1.log`
- **状态**：PASS
- **最近执行**：R1
- **备注**：真机交互体验在交付轮次由用户经预览面板人工确认；本项只验证可交付的静态配置。

### VFY-002: A3 挂图单页打印

- **归属**：`BUG-004` / 交付门槛
- **前置**：`deliverables/olympiad-poster-A3.html` 存在，Chrome 可用
- **步骤**：用浏览器 `page.pdf({format:'A3', landscape:true, printBackground:true})` 生成 PDF，解析 `/Type /Page[^s]` 对象数与 `/MediaBox`
- **期望（量化）**：page objects = 1；MediaBox = 1191×843 pt（A3 横向）；内容无裁切
- **证据**：`tests/evidence/VFY-002_R1.pdf`、`tests/evidence/VFY-002_R1.log`
- **状态**：PASS
- **最近执行**：R1

### VFY-003: 交互图谱浏览器渲染与交互

- **归属**：交付门槛
- **前置**：`deliverables/olympiad-knowledge-map.html` 存在，Chrome 可用
- **步骤**：浏览器打开，检查节点渲染数、点击展开、掌握状态切换、定位器命中、查漏清单；监听 console error / pageerror
- **期望（量化）**：节点 57；定位器命中 ≥ 1；查漏条目 > 0；JS 错误 0
- **证据**：`tests/evidence/VFY-003_R1.png`、`tests/evidence/VFY-003_R1.log`
- **状态**：PASS
- **最近执行**：R1

### VFY-004: 内容人工闸门签核

- **归属**：`SPEC-008` / `RUL-008` / `DSN-010`
- **前置**：`apps/miniprogram/data/lectures.js`、`apps/miniprogram/data/content_meta.js` 可读
- **步骤**：由**人**（家长 / 老师 / 孩子）对照学校讲义或权威教材，按 `RUL-008` 人工闸门清单抽检：① 定理条件；② 例题数值；③ 结论落点；④ 口吻是否把方法论说成硬结论。逐条核对后决定是否置 `verified` 并记录核对人 + 日期。
- **期望（量化）**：抽检 ≥ 10 个知识点；每个含定理的讲解均有适用条件；每个"求 X"题均有结论；核对结果写入 `CNF-010` 状态。
- **证据**：**尚无外部签核证据**。R2 轮仅由本项目 AI 做过 15 节点抽查复算（`R2_CHECKED`），按 `SPEC-008` 不自证红线，AI 抽查不算人工闸门通过。
- **状态**：**BLOCKED_NO_EVIDENCE**（等待用户/老师签核；不得判 PASS）
- **最近执行**：R2（识别为阻塞项）

> VFY-004 是本系统唯一能真正保证内容正确性的人工环节。在此之前，全部内容的复核状态均为 `pending` 或 `checked`，**没有任何一条是 `verified`**。

### VFY-005: 可靠数据源人工签核闸门

- **归属**：`SPEC-008` / `RUL-008` / `CNF-013` / `PRM-010`
- **前置**：`reliable-data/` v1.0.0 已发布；`reliable-data/evidence/SOURCES.json` 标明本地原件状态；供复核的 HTML 视图由 `tools/render-html.js` 生成
- **步骤**：由**人**（家长 / 老师）对照学校集训队讲义，抽检 ≥10 个节点：① 定理条件是否齐全；② 例题数值是否算对；③ 问「求 X」是否给结论；④ 口吻是否把方法论说成硬结论。核对通过的节点在真源新版本中置 `verified` 并记录 reviewer + date；未签核条目保持 `pending`。
- **期望（量化）**：抽检 ≥10 节点；`verified` 条目 100% 带 reviewer + date；无 AI 自证。
- **证据**：**尚无外部签核证据**。本地 `resource_data/` 无讲义原件，8 条锚点中 7 条为 `MISSING_LOCAL_COPY`；v1.0.0 全部 228 卡 `review=pending`、`verified=0`。
- **状态**：**BLOCKED_NO_EVIDENCE**（等待人对照讲义签核；不得判 PASS）
- **最近执行**：R7（识别为阻塞项）

> 正确性是「依据充分 + 人工签核」的结果，不是 AI 自证。机械 `PASSED` 与哈希一致只说明可判定部分无矛盾。

### VFY-006: 小学段教材锚点与人工签核闸门（v2.0.0）

- **归属**：`SPEC-008` / `CNF-014` / `DSN-012`
- **前置**：`reliable-data/` v2.0.0 已发布，小学 10 节点 40 卡全部 `evidence=C` / `review=pending`
- **步骤**：由**人**（家长 / 老师）提供三套小学分册与《举一反三》版权页（ISBN / 版次 / 印次），回填 10 节点页码锚点；对照实体书抽检例题结论与定理条件；通过者在新版本置 `checked`（教材交叉验证），仅人工签字后置 `verified` 并记 reviewer + date。
- **期望（量化）**：10 节点全部回填 `source_ref` 具体版次 + 页码；抽检 ≥5 节点；`verified` 100% 带签字；无 AI 自证。
- **证据**：**尚无外部签核证据**。小学分册版权页未提供、PDF 下载中；`source_ref` 如实写「未找到权威依据」。
- **状态**：**BLOCKED_NO_EVIDENCE**（等待教材版权页 + 人工签核；不得判 PASS）
- **最近执行**：R8（识别为阻塞项）

---

### VFY-007: 新同步真实云权限、升级与手机/iPad验收

- **归属**：SPEC-003 / SPEC-009 / RUL-010 / CNF-022。
- **前置**：维护者确认现有集合为基础权限「仅创建者可读写」；全部测试设备使用新版；使用经授权的测试账号和测试数据，先备份，不直接对真实家庭记录做破坏性测试。
- **步骤**：同微信账号手机/iPad互改状态、清空笔记、取消存疑；分别离线改不同字段、同字段；恢复网络、切前后台、发送中继续编辑、强退重启；确认本地与云端结果收敛且失败不清队列。另用不同账号验证云端不可互读写、同一手机切换微信账号后的宿主storage隔离；验证基础权限下doc.set新增/重试返回值与_id分页、实际配额和长日志读取耗时。
- **升级验收**：旧云重复快照与无dirty旧本地状态可保留迁移；旧版本混写不受支持，全部设备升级前不得发布新协议。不得直接回滚旧版或删除旧云记录；本轮没有执行实际迁移、改权限或备份真实数据。
- **原生验收**：检查手机/iPad来源长文本显示、全节点卡片布局、原生编译包体与加载性能；本轮源码字节统计不能替代。
- **状态**：**BLOCKED_NO_EVIDENCE**；R31仅有隔离桩测试，`REAL_CLOUD=NOT_TESTED HOST_ACCOUNT_STORAGE_ISOLATION=NOT_TESTED`。本项是云同步上线前验收，不是人工全签核前提。
- **R32增补**：手机原生隔离模拟器的来源显示、卡片清单及代表例题、本地状态/笔记/存疑和页面返回刷新已有证据，见执行结果R32；不替代真实云、账号storage隔离、手机/iPad真机互通、原生整包体积或性能验收。R32的iPad模拟器仍待手动切换设备，不沿用R22/R28等历史截图作为新版验收。

### VFY-008: 第一批页面隔离环境验收

- 归属：RUL-011 / CNF-023 / TST-023。
- 范围：新版首页、图谱/题型定位、卡片统计、状态菜单、提示/答案与来源摘要；手机及iPad固定横竖屏长内容、零结果、底部可达性。
- 前置：禁云且独立storage键的隔离副本，不修改真实家庭记录；仅复用已授权的开发者工具验证通道。
- 状态：**BLOCKED_NO_EVIDENCE（R33待执行）**。未获证据的设备、方向及交互分别保留缺证，不引用R32旧截图冒充新版通过；投屏继续SKIPPED，VFY-007不由本项解锁。

> R33执行增补（2026-11-26）：现行状态仍为 **BLOCKED_NO_EVIDENCE（部分执行）**。已取得iPad固定横竖屏代表页面与真实点击证据，共16张截图，其中4张是菜单诊断，不能计作菜单通过。新版手机布局、原生状态选择及取消尚缺证。证据汇总为 `tests/evidence/simulator-r33/runtime-evidence.json`；范围与已确认结果见执行结果R33。隔离方向已恢复auto，生产配置未改；后续需用户在隔离窗口手动切手机，并确认原生菜单实际显示与操作情况。投屏继续SKIPPED。

> R33手机补验（2026-11-27）：现行判定 **PASS（第一批代表性隔离页面与交互范围）**。用户切换iPhone17后补齐七阅读页代表检查；用户明确确认原生菜单实际可见，并亲自完成选择已掌握、再次打开取消、选择同值，运行时回读确认状态落盘且仅新增一次操作。截图未捕获原生选项不再作为界面缺失证据。具体操作与边界见执行结果R33手机补验及汇总JSON的phoneSupplement；旧缺证记录保留。不扩为完整手机横屏矩阵、iPad原生菜单复验、真机/云同步、包体或性能通过，VFY-007状态不变。

### VFY-009: 第二批手机隔离交互验收

- 归属：RUL-012 / CNF-024 / TST-024。
- 前置：最新源码同步到禁云独立storage副本；仅合成笔记与标记，投屏不测。
- 步骤：手机搜索→详情→题型/图谱→返回，核对页签/展开/位置；未保存笔记取消离开及放弃；笔记查询→定位编辑→清空→返回列表；存疑开关及聚合刷新；检查简洁状态控件、来源折叠可达性和底栏。
- 期望：真实代表流程与回读一致，无新增可见溢出；必要提示保留；截图缺原生弹层时按实际用户观察单独记录，不猜测。
- 状态：**BLOCKED_NO_EVIDENCE（R34待执行）**。非全机型矩阵、非真实云验收；VFY-007不解锁。

> R34执行增补（2026-11-27）：现行状态 **PASS（手机竖屏代表性隔离交互范围）**。搜索→详情→题型→返回完整页栈，例题页签/提示/滚动601恢复，原生返回后搜索保留；详情→图谱→返回讲解页签通过。笔记查询/锚点/清空、存疑开关与聚合、来源折叠可达已有原生截图和回读。原生navigateBack卸载后会话草稿兜底通过（不是物理手势/进程结束测试）。用户亲自完成放弃、仅继续编辑两种原生弹窗操作，分别回读笔记和outbox保持不变；首次继续编辑后用户额外保存已单独核实并从零写入证据排除。共15张截图含2张诊断，清空输入通过真实页面输入handler设置空值后点击保存，不冒充键盘删除。查漏冗余读取优化后重新编译并复核notes=0/disputed=0/total=67/outbox=10。详情见R34执行摘要与汇总JSON；非iPad/横屏全矩阵，VFY-007仍缺证、投屏SKIPPED。

## 三、追溯矩阵

契约 / 缺陷 / 交付门槛必须追到用例；`UNCOVERED` 必须清零或写明豁免理由。

| 来源编号 | 对应用例 | 判定 | 说明 |
|---|---|---|---|
| `SPEC-001` | `TST-011` | COVERED | 文档体系存在且编号自洽，是「文档优先」的可检验代理 |
| `SPEC-002` | `TST-005`、`TST-007` | COVERED | 节点基线全覆盖 |
| `SPEC-003` | `TST-010` | COVERED | 双视图共用唯一状态源 |
| `SPEC-004` | 人工审查 | 豁免 | 版权红线无法用代码断言；发布前人工抽检 `apps/miniprogram/data/*.js` 原创性，见 `PRM-006` |
| `SPEC-005` | 人工审查 | 豁免 | 政策表述人工核对 `CNF-008`，见 `PRM-006` |
| `SPEC-006` | `TST-011` | COVERED | 编号四类校验 |
| `SPEC-007` | `TST-003` | COVERED | tabBar 首项断言 |
| `SPEC-008` | `TST-013`~`015`、`VFY-004` | COVERED（部分） | 机械断言覆盖可判定子集；人工闸门 `VFY-004` 仍 BLOCKED，正确性未被完整保证 |
| `BUG-001` | `TST-012` | COVERED | 模板哈希基准 |
| `BUG-002` | `TST-002` | COVERED | JS 语法 |
| `BUG-003` | `TST-008` | COVERED | 引用无悬空 |
| `BUG-004` | `VFY-002` | COVERED | 单页 A3 打印 |
| `BUG-005` | `TST-004`、`TST-010` | COVERED | 标签配对 + 事件分离 |
| `BUG-006` | `TST-010` | COVERED | 默认展开 |
| `BUG-007` | `TST-009` | COVERED | 题型结构 |
| `BUG-008` | `TST-002`、`TST-010` | COVERED | 定义完整 + 运行无 undefined |
| `BUG-009` | `TST-013`、`TST-015` | COVERED | 结论存在性 + 135° 回归 |
| `BUG-010` | `TST-015`、`VFY-004` | COVERED（部分） | 锐钝说明断言；人工复核 `VFY-004` 仍 BLOCKED |
| `BUG-011` | `TST-013` | COVERED | 容差比较，22/22 全绿 |
| 交付门槛 | `VFY-001`、`VFY-002`、`VFY-003` | COVERED | 应用卡 / 打印 / 浏览器三项 |
| 可靠数据源发布资格 | `TST-016` | COVERED | `check-data.js` 9/9 PASSED（结构，非内容正确） |
| 哈希一致性 / UNCOVERED | `TST-017` | COVERED | `check-reliable-extra.js` E1/E2 显式声明状态 |
| `SPEC-008`（真源出口） | `TST-016`、`TST-017`、`VFY-005` | COVERED（部分） | 机械闸门全绿；人工闸门 `VFY-005` 为 `BLOCKED_NO_EVIDENCE` |
| `CNF-013` | `TST-016`、`TST-017`、`VFY-005` | COVERED | 版本 / 计数 / 复核基准有对应用例 |
| `CNF-014`（分层基线） | `TST-016`、`TST-017`、`E8`/`E9` | COVERED | `check-data.js` D2 动态取基线；extra E8 零破坏、E9 小学合规 |
| `DSN-012`（四段体系） | `TST-016`、`E8b`、`E9d`、`VFY-006` | COVERED（部分） | 新增 40 卡 + 12 条衔接边可断言；人工闸门 `VFY-006` 为 `BLOCKED_NO_EVIDENCE` |
| `SPEC-008`（小学段） | `TST-016`、`TST-017`、`VFY-006` | COVERED（部分） | 小学 40 卡全 pending/evidence=C；教材版权页未提供，人工闸门阻塞 |
| 内容正确性辅助校验 | `TST-018` | COVERED（部分） | 四路径异源交叉：结论冲突 0、定理条件省略 0；**非人工签核、不解锁 verified** |
| `CNF-015`（v2.1.0 修正） | `TST-016`、`TST-017`、`E8c`、`TST-018` | COVERED（部分） | 36 卡变更作用域精确（越界 0）、两题独立复验一致；快照完整保留；人工闸门仍 BLOCKED |
| `CNF-016`（app 数据可复现） | `TST-019` | COVERED | 6 模块生成物逐字段等于真源+配置（18/18）、删除重建字节一致；仍为过渡数据不解锁 verified |
| `SPEC-009` / `RUL-010` / `CNF-022`（来源与消费） | `TST-020`、`TST-022` | COVERED（部分） | 来源定位、哈希、生成与变异覆盖；不代表数学核准，多模型与人工证据未新增 |
| `SPEC-003` / `SPEC-009` / `CNF-022`（同步） | `TST-021`、`VFY-007` | COVERED（部分） | 隔离37项通过；真实云权限、账号隔离和手机/iPad验收缺证 |
| 新增自有源码静态检查 | `TST-001`、`TST-002` | COVERED | R31改为动态遍历自有JS/JSON，包含sync、present和自定义tabBar，模板缺失不计PASS |
| `RUL-011` / `CNF-023`（第一批交互与布局） | `TST-023`、`VFY-008` | COVERED（部分） | R33 UI44/44、同步及详情65/65；iPad横竖屏代表证据已有，新版手机与原生菜单实际选择/取消缺证 |
| `SPEC-003` / `SPEC-009`（R33状态入口增补） | `TST-021`、`TST-023`、`VFY-007` | COVERED（部分） | 原同步回归保留并扩为65项；不改变R31协议，不以菜单桩解锁真实云验收 |
| `RUL-011` / `CNF-023`（R33手机补验，2026-11-27） | `TST-023`、`VFY-008` | COVERED | 手机竖屏代表页面、真实题型点击、0/1/3搜索、来源/提示/解答、底部可达性及用户原生菜单操作+回读通过；VFY-008代表范围PASS，不含完整设备矩阵 |

| `RUL-012` / `CNF-024`（会话阅读、草稿、记录与简洁交互） | `TST-024`、`VFY-009` | COVERED | B2专项36/36、记录及文案40/40；手机代表性隔离流程及用户原生弹窗操作+回读通过，不扩大为真机/进程恢复/性能验收 |

| `CNF-025` / `RUL-012` R35修订 / `BUG-012` | `TST-025` | COVERED | 统一入口、真实Git忽略边界、LF及首页死代码清理；专题陈旧缓存/非法节点/失败回归，执行结果见R35续记 |

`UNCOVERED` 计数：**0**（2 项豁免为人工审查项，已写明理由与执行清单）。注意 `VFY-004`、`VFY-005`、`VFY-006` 均为 `BLOCKED_NO_EVIDENCE`，按 `RUL-006` 整体不判"内容已完全正确"，但不妨碍功能交付与真源发布。v2.0.0 的 228 旧卡哈希零漂移已由 E8a 断言。

---

## 四、执行结果

### R35 · 2026-11-27（工程规整与源码推送准备）

本轮整理README、现行PRM-001与历史deploy说明，保留全部编号和原始历史条目；新增根package.json及生成物LF属性、运行数据忽略规则。删除首页建议区死代码，专题存疑修复见BUG-012。没有改数学真源、真源manifest、组织配置、历史快照、生产云配置或present页。

| 实际执行 | 结果 | 证据/边界 |
|---|---:|---|
| npm test（11组串行） | exit0 | CHECKS_R35.log，全组失败即停，不启动云/IDE |
| check-data / check-reliable-extra | 9/9、33/33 | 哈希、当前契约及历史快照防线保留 |
| validate / verify_content | 32/32、23/23 | 新增4项工程断言；本机模板9/9，SKIPPED=0 |
| check-app-build / check-data-contract | 29/29、49/49 | 八生成文件合计1,221,898字节，内存重建逐字节一致 |
| check-sources --self-test | 结构1/1、自测42/42 | 本机4原件HASH_OK；原件不提交，换机缺失不算哈希通过 |
| check-sync / check-ui | 65/65、44/44 | 首页真实导航及返回零业务写入；旧防线未减少 |
| check-reading-context / check-records | 36/36、46/46 | 记录新增6项，陈旧值两方向、失败两方向及非法入口 |
| 陈旧缓存内存变异 | 42/46，4项定向失败 | 预期拒绝错误实现；首个转义错误不计测试证据 |
| Git受保护路径差异 | 无 | 四类数学卡/manifest/source/快照/present/app.json/cloud-config相对7172697不变 |
| Git diff --check | exit0 | 无空白错误；暂存及远端确认在交付续记 |

证据文件：`tests/evidence/CHECKS_R35.log` 与 `tests/evidence/REGRESSION_R35_STALE_MUTATION.log`。现存R32/R33/R34分别31/31/15张图片，三个runtime汇总均保留；R34两张诊断帧不改作成功证据。本轮未重新做原生模拟器验收，R35小修为真实源码隔离回归，不能把R34截图当作R35最新编译截图。

结论：TST-025工程范围PASS，UNCOVERED=0。VFY-007真实云/跨账号storage/双设备真机/包体与性能仍BLOCKED_NO_EVIDENCE，VFY-004~006人工证据状态不变；投屏实时旋转/镜像SKIPPED。用户本轮授权正常提交推送源码，不授权微信上传、提审、发布或部署。

> R35提交前检查续记：按明确路径暂存154个文件（含R31–R34累积改动、R35规整及证据），无文件删除；暂存清单无原件PDF、私有配置、运行数据或.workbuddy，单文件均小于10MB。八生成文件的Git暂存字节与工作树逐一相同，受保护数学真源/组织源/快照与present等路径零改动。GitHub main与fetch基线均为7172697，无远端分叉；正常commit/push另以Git记录为准，不执行强推或绕过钩子。本提交记录的是源码交付与测试证据，不代表微信发布。

### R34 · 2026-11-27（B2/B4/B6实施与代表性手机验收）

- 实施：新增会话reading-context/draft-guard，七页接入返回链与UI白名单；跨tab重建保留父链，普通返回复用实例，失败不消费片段。草稿可控离开确认，原生卸载内存兜底，最多各20条；不持久化、不自动保存、不改同步协议。
- 查漏复用store新增进度/笔记/存疑，笔记正文查询、100字符Unicode摘要、空白排除、详情锚点；详情增加存疑。专题的个人存疑不再覆盖真源reviewLabel。七页直接状态与动作、来源审核按需展开，移除家庭等误导性限定和首页冗余建议文本，保留必要失败/草稿/批量确认。
- 主代理实际复跑：reading-context **36/36**、records **40/40**、UI **44/44**、sync **65/65**；来源结构1/1、自测42/42、四原件HASH_OK；数据契约49/49、应用29/29、扩展33/33、数学子集23/23、结构9/9、validate28/28（SKIPPED=0）。没有以代理摘要代替复跑。
- 隔离环境仍为iPhone17 screen402×874/window402×776、SDK3.18.0、auto。65自有文件无缺失，仅project.config/cloud-config/store三有意差异，未复制IDE私有配置。生产app.json、真源268卡、manifest、组织真源、历史快照与present相对HEAD无改动；八生成物字节重建一致。
- 手机实际搜索一元二次方程得到1项，经j_eq例题页签/提示→tp_quadroot→返回，重建lecture/cards/node，tab=example/hint[0]=true/scroll=601；再原生返回cards保留关键词。详情讲解页签→图谱→返回后tab=explain。首次屏外题型点击和多步重建中间截图不作为成功证据。
- 合成笔记保存使outbox5→6；查漏笔记正文查询1项并直达笔记区。原生navigateBack后重进恢复未保存草稿，存储和outbox仍6，取消编辑读回已存笔记。个人存疑开/关后聚合1→0，outbox6→7→8。
- 原生草稿弹窗有清晰截图。首次用户继续编辑后额外补字保存，用户明确确认，outbox8→9；这不是取消离开零写入证据。随后独立放弃草稿：用户确认返回，outbox仍9，重新进入草稿未复活；再次仅继续编辑：用户确认无其他动作，回读editing=true、草稿仍在、已存笔记不变、outbox仍9。清空输入经页面onNoteInput传空值，再实际点保存并返回，笔记0项、outbox10；不冒充键盘逐字删除。
- 日志曾返回查漏生命周期56–93ms及图谱52–56ms警告；查漏改每次build一次当前业务快照，消除逐节点三字段重复storage读取，新增第40条回归。复跑交互四组、重新编译并原生复核空态/统计/队列；不宣称完成性能验收。日志快照未返回应用异常，不等于全历史零错误。
- 证据：`tests/evidence/simulator-r34/runtime-evidence.json`，15张截图均读取，其中2张明确诊断帧；用户弹窗操作+运行时回读单独标来源，不伪称全自动原生点击。
- 判定：**TST-024=PASS；VFY-009=PASS（代表性手机隔离范围）**。所有系统离开拦截、进程结束、iPad/横屏全矩阵未覆盖；真实云/账号storage/双设备真机/包体性能VFY-007仍BLOCKED，投屏SKIPPED。HEAD仍7172697；未commit/push/上传/发布，未操作真实记录。B1/B3/B5未实施。

### R33 · 2026-11-26（第一批布局与交互实施，原生验收部分缺证）

- 范围：题型父子展开/定位高亮、卡片总数与结果数分离、七阅读页响应式字号与44px触控盒、首页精简、三页明确状态选择、提示/解答独立、当前卡类来源摘要。没有第二批功能、考试、孩子档案、新页面或新后端。
- 主代理实际复跑：`check-ui.js` **44/44**、`check-sync.js` **65/65**；来源结构1/1、自测42/42、四原件HASH_OK；数据契约49/49、应用29/29、可靠性扩展33/33、数学子集23/23、真源结构9/9。均exit0；内存桩不替代原生或真实云。
- UI负向实验：内存注入Git HEAD旧locator/cards四文件后9/44，35项失败，预期拒绝旧行为。包含新增需求断言，不能表述为35个旧bug；未声称主代理观察了所有新增测试完整先红后绿过程。
- 原生诊断：七阅读页WXML/WXSS加全局与底栏WXSS，共16次成功。返回摘要长度相同（WXML32400、WXSS6893），不是逐文件体积、整包构建、上传包体或性能验收。
- 继续使用 `.workbuddy/simulator-r32/app`，禁云、R32独立storage键，仅合成记录；不是跨设备云同步。设备为iPad Pro13(M4)，SDK3.18.0：固定横屏screen1376×1032/window1376×968，固定竖屏screen1032×1376/window1032×1312。截图为优化尺寸，不等于逻辑窗口。
- 横屏：新版首页11专题、建议默认收起，实际点击查找入口进入cards；“复数”搜索总67/匹配3。s_trig展开来源并切例题后示范题审核pending，范围2/2、缺口1，长来源换行；只点提示后hint[0]=true而answer为空。焦点注入tp_quadroot使t_eq父组与子项都展开，后续截图目标到顶部；不是完整链接点击，也不以截图证明2000ms高亮。首页建议展开并滚到底，note约699.27至852.53，在968高窗口底栏上方完整可见，仅覆盖该页与该设备。
- 竖屏：新版首页双列、搜索入口及底栏可见；无匹配搜索得到总67/结果0/列表0并显示空态。s_trig实际解答按钮点击后hint为空、answer[0]=true，完整解答与答案可见，outbox仍4。j_eq真实题型链接点击跳到locator，父子展开且目标滚到顶部。方程专题原本折叠，实际点j_eq头部后六段双列展开。查漏学习中筛出1项，总67；图谱主题视图显示独立状态控件，点击后仍在graph路由、菜单pending、outbox仍4，没有误跳详情。
- **状态菜单仍缺证**：node横竖屏截图只有暗遮罩、没有原生选项，未完成真实选择或取消。独立A/B/C原生对照仅观察到opened，截图是无遮罩首页，未收到选择/失败回调；对照不充分，不能归因成应用bug或截图工具bug。VM取消/同值/失败/迟到回调断言通过不解锁本项。新版手机也未实测，官方已检查接口无机型切换命令，需在隔离窗口手动切换，不拿旧截图代替。
- **取证错误已纠正**：误写首页选择器、误读顶层outbox、使用渲染后不保留的bindtap选择器、等待折叠内容均曾报错；随后核对实际模板/运行数据，用正确选择器或实际父项点击继续。`:not`查询意外匹配两元素，未用于成功断言；解答按钮先读文字再点。以上属于验证步骤问题，不误记为应用缺陷。
- 收尾恢复隔离app.json为auto并刷新，实读首页11专题/adviceExpanded=false、window1032×1312、outbox4，临时诊断变量已清。自有源码63文件无缺失，仅project.config/cloud-config/store三项隔离差异；先前包含IDE私有配置时报告的单文件缺失已按明确排除口径纠正，不复制私有配置。生产app.json、268数学卡、manifest、组织真源、历史快照和present页相对HEAD无改动；八生成物与真实输入字节重建一致。
- 证据：`tests/evidence/simulator-r33/runtime-evidence.json`（人工汇总，不是原始转储）及同目录16张截图；12张代表页面、4张菜单诊断，均已读取。末次日志快照仅基础库与lazy-loading两条info，不代表完整历史无异常。
- 台账收尾复验：`validate.js` **28/28**、SKIPPED=0（自有JS25/25、脚本16/16、JSON18/18、8页面32件、模板哈希9/9）；`git diff --check` exit0，仅生成文件LF/CRLF提示；16个证据截图路径全部存在。
- 判定：**TST-023=PASS；VFY-008=BLOCKED_NO_EVIDENCE**。真实云/账号storage隔离/真机互通/包体性能仍属VFY-007缺证；投屏后续旋转和电视镜像继续SKIPPED，present缺onResize未修。未commit/push、上传发布、部署、改真实云权限或读写真实家庭记录。

#### R33手机补验 · 2026-11-27（用户切换手机，原生菜单由用户操作并回读）

- 环境实读iPhone17，screen402×874、window402×776，safe-area底部34，SDK3.18.0；截图415×901是优化输出。首轮误沿用旧0.3.10参考版本返回agent_behind，已读取本机内置0.3.11并再次确认equal/登录有效后继续，未安装或更新软件。
- 63自有源码与隔离副本无缺失，仅project.config、禁云配置和store三项有意差异。业务代码本次无修改，生产/隔离方向均保持auto，仍只使用R32合成记录。
- 手机首页单列11专题与查找入口可读；展开家长建议并滚到底，note区域left14/right388/top433.1875/bottom655.203125，window776、scrollWidth402，截图完整位于底栏上方。卡片实际输入复数/复数法与向量法解几何/无匹配词，结果依次3/1/0、总数始终67，状态标签与空态正常。
- s_trig展开双课标长来源及缺口均换行；提示打开时answer为空，收提示后开解答时hint[0]=false、answer[0]=true，完整公式与答案可见，outbox仍4。j_eq真实题型链接跳转locator，t_eq父组及tp_quadroot子项展开并滚到顶部。专题实际展开后wide=false/demo=false，正文单列；查漏学习中1项，图谱节点与独立状态控件可读，点击不误跳详情。
- 图谱首次滚动请求未到目标，截图实际为小学组；保留该图但不作为方程组证据。随后读取目标rect top1917.765625并滚动，另取phone-graph-equations.jpg，实际显示方程专题。工具success不单独当定位成功。
- 原生菜单：手机截图同样只有遮罩。用户明确答复实际**能看到三个选项**，随后按要求执行“选择已掌握→重新打开→取消”，并确认正常返回。主代理回读displayedStatus=storedStatus=2、menuPending=false、outbox4→5，最后操作仅status.j_eq=2；首页随即done1/learning0/todo66/total67。再次由用户选择当前已掌握，回读仍2、menuPending=false、outbox仍5，未重复写入。选择和取消之间没有独立中间回读，证据是用户确认+整段前后运行时比较，不冒充全自动原生点击。
- 结论：手机原生弹层可见并可操作，截图未捕获选项；不依据图片遮罩擅改状态选择实现。iPad原生菜单未重新手动验证，旧诊断保持历史，不推导所有设备弹层都已通过。
- 新增15张phone截图均已读取，累计31张（包括历史/诊断）；汇总JSON保留原记录，新增phoneSupplement及现行状态。最后恢复首页顶部、建议收起，隔离j_eq=已掌握/outbox5保留，不直接篡改或清理同步历史。
- 本次实际复跑UI44/44、同步65/65、数据契约49/49通过；八生成文件字节重建一致。日志快照只有info及getSystemInfoSync弃用、graph.onShow54ms两条warning，未返回应用异常，不能当全历史零错误或性能通过。
- 收尾静态/台账校验28/28、SKIPPED=0，diff空白检查exit0（只有生成文件行尾提示）；31图路径存在且无重复，生产与隔离均auto。数学真源、manifest、组织源、历史快照、present和生产app.json相对HEAD无差异。
- **现行交付判定：TST-023=PASS；VFY-008=PASS（代表性隔离范围）**。手机完整横屏矩阵、iPad原生菜单复验不在此次已执行证据内；真实云/账号隔离/真机互通/包体性能VFY-007继续BLOCKED；投屏仍按用户暂缓SKIPPED。未commit/push/上传发布，未读写真实家庭数据。

### R32 · 2026-11-26（手机原生隔离仿真，平板待续）

- 实际通道为已安装开发者工具的官方命令行（0.3.11，已登录、版本匹配），不是当前会话直接调用MCP。未安装软件、未使用或记录MCP令牌。压缩前两个后台结果已不可读取，因此重新执行，不把缺失结果判为通过。
- 隔离副本：`.workbuddy/simulator-r32/app/`；61个自有文件核对后仅项目名、空云环境和独立storage键三文件不同。`env:''`，只用 `r32_simulator_only_state` / `r32_simulator_only_legacy_queue`；全部编辑使用合成笔记，未读写生产记录。
- 环境：iPhone 12/13 (Pro)，screen 390×844、window 390×753、基础库3.18.0。官方截图优化为363×785，不是逻辑窗口尺寸。
- 编译诊断：8页面和自定义tabBar的WXML/WXSS共18次均返回success；使用实际参数 `--file-path`。各结果摘要长度相同（WXML 32400、WXSS 7299），不能据此推导逐文件或整包字节；不存在模板的负探针确实报文件不存在。此工具只读局部编译摘要，不当作整包构建、上传或体积验收。
- 运行：8个注册页均实际导航/加载；四个主tab选中态0/1/2/3正确；首页11专题、图谱4学段/11主题、题型10组34项、查漏4组67节点；状态变为学习中后首页/图谱/查漏均为总67、学习中1、未开始66。
- 卡片：运行时列表67项，概念/讲解/例题缺失列表为空；逐页目视抽检 `p_alg`、`j_eq`、`s_complex`、`o_poly` 四学段代表例题，切换与展开答案正常。不声称逐个目视检查了全部67张详情。小学解答中的Markdown `**` 以字面文本显示，未当作排版完善或数学核准。
- 来源：方程专题4点均pending；j_eq/j_ineq显示2022课标第四学段、印刷56/PDF63页，s_ineq显示高中2017/2020版PDF24—25页，o_ineq明示暂无已核正文定位。截图中长来源可换行、未见横向溢出；小字可读性仍须平板/真机确认。
- 本地交互：j_eq状态0→1、笔记保存后重新进入及模拟器刷新仍保留；存疑1→0正常，隔离outbox由2→3→4，禁云期间保留未发送操作。投屏页t_eq共22页，点击下一页后cur=1、kind=essence、画布390×219；仅手机竖屏验证，非横屏/电视投屏。
- 实际修复：原生模拟器复现“取消编辑后显示未保存草稿，但存储仍为旧笔记”；先补回归得37/39，再修 `node.toggleNote` 为重新读取已存版本、不写store，39/39通过。模拟器复验 `displayed===stored`、`editing=false`，outbox仍2；编辑中远端更新后取消场景在隔离DB桩通过，非真实云验证。
- 调试边界：Windows传递函数内双引号曾被吞，改用外层双引号/JS单引号；`:nth-child(3)`实际误命中首tab，改用 `data-tab='example'` 后通过；刷新是异步的，首次导航被首页重载覆盖，待实际页栈确认后重新导航成功；中文stdout经PowerShell管道解析会乱码，后续自动断言返回布尔/数字。以上为验证链问题，不误报为应用缺陷。
- 收尾日志快照仅返回基础库与lazy-loading两条info，未返回应用异常行；不是完整历史日志或零错误保证。
- 本轮复跑：同步39/39；来源结构1/1、自测42/42且4原件HASH_OK；数据契约49/49；应用29/29；扩展33/33；数学子集23/23；真源结构9/9；静态28/28、SKIPPED=0；`git diff --check`通过。数学真源268卡、manifest、组织真源、历史快照相对HEAD无改动。
- 证据：`tests/evidence/simulator-r32/runtime-evidence.json` 为结果人工汇总，截图同目录 `phone-*.jpg`；非原始完整控制台转储。未commit/push、上传发布、云权限更改或真实数据迁移。
- **待续**：当前官方接口未提供模拟器机型切换；需用户在 `k12-math-r32-isolated-validation` 窗口手动选择iPad后继续。VFY-007仍BLOCKED_NO_EVIDENCE。初评其余页面问题（题型父组展开、投屏resize）本轮未修，不宣称已解决。

#### R32补充 · iPad竖屏实际验收（用户切换设备后）

- 运行时实测 `iPad Pro 13 (M4)`，screen1032×1376、window1032×1312、SDK3.18.0；截图888×1184为优化输出。仍使用禁云隔离副本，复用的是同一模拟器storage，不是云端跨设备同步实验。
- 8页实际加载，四主tab选中态正确；首页两列、卡片三列、67卡字段缺失0；节点j_eq例题切换及展开正常。首页/图谱/查漏仍一致为总67、学习中1、未开始66。
- 方程专题来源和当前生成数据中最长的s_trig双来源文本均目视检查；后者边界left84/right956/width872/height54，在1032px窗口内换行完整。正文两列未见重叠或横向溢出。来源12px浅色字偏小，节点标题/折叠按钮与15px正文比例不统一，记为体验优化项，不宣称排版已完善。
- 讲解演示模式 `wide=true/demo=true/focus=0/open=j_eq`；可退出。节点笔记编辑取消后 `displayed===stored`、editing=false、outbox仍4；没有增加同步写入。
- 投屏t_eq实际下一页为cur1/22、kind=essence，画布1032×581、scale0.80625，16:9居中留黑边、内容和控制栏完整。当前保留该页等待手动旋转，不通过重开页面掩盖resize问题。
- 本轮日志快照没有返回应用异常行，但有 `getSystemInfoSync`弃用警告（验证代码也调用该接口）和一次graph的 `Page.onLoad took 56ms`提示；不能以单次时间判定性能通过或失败。
- 9张新增证据为同目录 `ipad-portrait-*.jpg`，汇总追加到runtime-evidence.json。没有新改业务代码或真源；未commit/push/上传发布。
- **未完成**：iPad横屏、当前页实时旋转、真机/电视镜像；VFY-007真实云及账号隔离缺证不变。下一步请用户保持当前演示页直接点击模拟器旋转按钮，不退出、不重新编译。

#### R32补充 · 配置触发iPad固定横屏（非实时旋转）

- 用户反馈找不到旋转按钮，并提出修改app.json。更正此前要求：不再要求寻找未确认存在的按钮；按官方显示区域文档的 `pageOrientation: landscape` 路径在隔离副本验证。参考：https://developers.weixin.qq.com/miniprogram/en/dev/framework/view/resizable.html 。
- 临时改隔离 `app.json` 的window.pageOrientation及 `pages/present/present.json` 的页面覆盖为landscape，刷新后实测iPad Pro13(M4)屏幕1376×1032、窗口1376×968。8页实际加载，卡片67项；新增8张 `ipad-landscape-*.jpg`。
- 最长s_trig双来源区域left194/right1193/width999/height36，在1376px窗口内；可见两列正文无横向溢出。标题和折叠按钮仍受rpx放大、与小字号正文比例不统一，属于已记录体验项。节点例题展开成功，但本次首屏截图并未包含完整答案，不扩大为全页目视通过。
- 投屏t_eq第2/22页画布1376×774（16:9）、scale1.075，标题正文和页脚完整；截图时控制栏已自动隐藏，不作为唤醒态遮挡验证。末次console快照只返回基础库/lazy-loading信息。
- 测试后两处配置均恢复auto；与生产61文件逐哈希对比只保留项目名、禁云、独立storage键三项原有隔离差异。生产方向配置与业务源码未改，没有上传发布。
- **边界**：固定横屏重新编译会重新初始化页面，不能覆盖实时onResize。投屏页缺onResize的问题仍未修、真机实时旋转仍待验；不再让用户反复寻找按钮。VFY-007真实云、账号隔离及真机性能仍缺证。

#### R32收尾 · 用户暂缓投屏实测

- 用户明确：“投屏页当前缺乏实测环境，所以先pass 不验证吧。”本轮将投屏页后续实时旋转、onResize及电视镜像验证记为 **SKIPPED（用户暂缓）**，不是PASS；保留已取得的手机/iPad固定方向模拟器截图，不再要求用户提供旋转操作或实测环境。
- 投屏页缺onResize尚未修复，不因跳过验证而视为已解决。按调整后范围结束本轮模拟器验收；真实云同步、跨账号storage隔离、包体及性能仍保留VFY-007缺证状态，不转为通过。

### R31 · 2026-11-26（来源追溯、同步和数据一致性）

本轮在本地 `7172697` 工作区基线上执行，未commit/push、未操作真实云、未上传发布。以下为主代理实际复跑摘要，不以子任务报告代替结果。

| 命令 | 实际结果 | 范围 |
|---|---|---|
| `node tools/build-data.js --allow-pending` | 7/7 PASSED | 7模块+生成清单；CONTENT_REVIEW单列pending=268/verified=0 |
| `node tests/check-sources.js --self-test` | 结构1/1，变异42/42 PASSED | 67映射、117引用、42范围定位、4本地原件哈希匹配 |
| `node tests/check-sync.js` | 37/37 PASSED | Node内存多设备/多账号桩，无真实SDK调用 |
| `node tests/check-data-contract.js` | 49/49 PASSED | 执行真实脚本的内存变异、历史保护、字节重建 |
| `node tests/check-app-build.js` | 29/29 PASSED | 真源、来源、补充卡与生成物一致性 |
| `node tests/check-reliable-extra.js` | 33/33 PASSED | 哈希、数学子集、镜像、历史快照与追溯 |
| `node tests/verify_content.js` | 23/23 PASSED | 可判定数学子集，不是全量内容核准 |
| `node tests/check-data.js` | 9/9 PASSED | 真源结构与审核字段 |
| `node tests/validate.js` | 28/28 PASSED，SKIPPED=0 | 自有小程序JS23/23、工程脚本15/15、JSON18/18、8页面32件；模板哈希9/9 |
| `git diff --check` | exit0 | 无空白错误；Git提示生成文件LF/CRLF转换，不影响当前字节重建 |

- 修复复核发现：原新版同步混用了基础权限与安全规则占位符，现已依据官方契约去除；不把DB桩宽容行为当SDK保证。无dirty旧本地数据低优先级迁移，页面存储失败不伪报成功，专题批量状态原子保存。
- 变异有效性：把复数等实际发布答案改为99并同步更新hash，仍能被E6/数学断言拦截；指定镜像、来源造假、假签核字段、历史哈希损坏均有负用例。测试中的合成签核从不落真源。
- 数据保护：268张卡、真源manifest、组织真源和历史snapshots相对HEAD无差异；外部PDF仅在gitignored目录，Git跟踪的resource_data仍仅README与.gitkeep；八生成文件与内存重建逐字节一致。
- 来源边界：全部67节点仍有缺口（98条）；定义与例题逐条外部核验均0，未进行本轮独立多模型或人工签核，不宣称所取得课标为最新版。VFY-004~006保留历史缺证，旧文案中“人工能保证绝对正确”等以SPEC-009/RUL-010为准。
- 运行边界：VFY-007仍BLOCKED_NO_EVIDENCE；没有真机/真实云隔离、原生编译包体或性能证据。源码61文件合计1,373,415字节，其中生成八文件1,221,898字节，仅为未编译文件统计。旧新客户端不得混用；操作日志增长和全量扫描成本未做真实容量压测。

### R7 · 2026-11-24（可靠数据源专项轮）

```
发布闸门 RESULT=9/9 FAILED=0  VERDICT=PASSED
扩展检查 RESULT=24/24 FAILED=0 UNCOVERED=0 VERDICT=PASSED
人工闸门 VFY-005=BLOCKED_NO_EVIDENCE（无外部签核，全部 228 卡 pending）
```

- 产物：`reliable-data/` v1.0.0，四类各 57 卡（228 张）、114 条易错、57 道示范题，`manifest.json` 逐条 SHA-256。
- 证据：`tests/evidence/CHECK_DATA_V1.log`、`tests/evidence/RELIABLE_EXTRA_V1.log`、`tests/evidence/BUILD_RELIABLE_V1.log`、`tests/evidence/VALIDATION_R7.log`、`tests/evidence/CONTENT_VERIFY_R7.log`、`tests/evidence/HUMAN_SIGNOFF_V1.md`。
- 边界声明：`PASSED` 只表示发布资格、结构、哈希与可判定数值无矛盾；**不证明数学讲解正确**，不表示「全部已核实」。

### R2 · 2026-11-24（内容保真轮）

用例级（20 个编号用例）：

```
RESULT=19/20 FAILED=0 BLOCKED=1
VERDICT=PASSED_WITH_BLOCKER   （功能可交付；内容正确性未被完整保证）
```

- `TST-001`~`TST-015`：15/15 PASS。
- `TST-016`~`TST-018`：3/3 PASS（TST-018 为异源交叉校验，非人工签核）。
- `VFY-001`~`VFY-003`：3/3 PASS。
- `VFY-004`：**BLOCKED_NO_EVIDENCE** —— 无外部人工签核，按 `SPEC-008` AI 不得自证，不得判 PASS。

断言级（校验脚本逐条输出，证据已归档）：

| 校验链 | 命令 | 断言结果 | 证据文件 |
|---|---|---|---|
| 文档四类 + 工程静态/数据 | `node tests/validate.js` | 见下方 R2 复跑 | `tests/evidence/VALIDATION_R2.log` |
| 内容正确性机械断言 | `node tests/verify_content.js` | `RESULT=22/22 FAILED=0`、`VERDICT=PASSED` | `tests/evidence/CONTENT_VERIFY_R2.log` |
| 浏览器环境验收 | 系统 Chrome + Playwright | `RESULT=8/8 FAILED=0`、`VERDICT=PASSED` | `tests/evidence/VFY-002_R1.*`、`tests/evidence/VFY-003_R1.*` |

- 证据优先级：自动化断言 > 浏览器运行时报告 > 截图 > 目视；AI 自查不算人工签核。
- **重要边界**：`verify_content.js` 的 22/22 PASS 只说明"可机械判定的部分没发现错误"，**不等于内容全部正确**。真正的内容正确性依赖 `VFY-004` 人工闸门，当前为阻塞状态。

### R1 · 2026-11-24（初始化轮，历史保留）

用例级（15 个编号用例）：

```
RESULT=15/15 FAILED=0
VERDICT=PASSED
```

断言级：文档四类 + 工程静态/数据 `RESULT=27/27`（`tests/evidence/VALIDATION_R1.log`）；浏览器验收 `RESULT=8/8`。

> R1 关键实测值：A3 PDF page objects = 1、MediaBox = `0 0 1191.12 842.88`（A3 横向）、挂图条目 = 57；图谱节点 = 57、定位器命中 = 6、查漏条目 = 57、JS 错误 = 0；官方模板源哈希 9/9（LF 规范化）。
> R2 关键实测值：内容断言 22/22；修复内容缺陷 3 处（BUG-009/010/011）；实质核查节点 15/57，其余 42 个仍 `pending`。
