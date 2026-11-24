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

---

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

---

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

`UNCOVERED` 计数：**0**（2 项豁免为人工审查项，已写明理由与执行清单）。注意 `VFY-004` 为 `BLOCKED_NO_EVIDENCE`，按 `RUL-006` 整体不判"内容已完全正确"，但不妨碍功能交付。

---

## 四、执行结果

### R2 · 2026-11-24（内容保真轮）

用例级（20 个编号用例）：

```
RESULT=19/20 FAILED=0 BLOCKED=1
VERDICT=PASSED_WITH_BLOCKER   （功能可交付；内容正确性未被完整保证）
```

- `TST-001`~`TST-015`：15/15 PASS。
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
