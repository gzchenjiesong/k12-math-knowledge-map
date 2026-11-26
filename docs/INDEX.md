# INDEX · 文档索引与写入规则

> 项目：奥数竞赛家庭学习工具链（交互图谱 / A3 挂图 / 书单 / 微信小程序「奥数知识卡片」）
> 本文件不承载业务结论，只管：内容归属、权威顺序、变更流程、编号表、文件清单。
> 权威顺序：**契约 > 规则 > 配置 > 代码 > 对话与日志**。

---

## IDX-001: 分类判定表

一条新内容该写进哪个文件？按顺序问，命中即停。不确定就查本表，不要新建第九类文档。

| # | 判定问题 | 去处 |
|---|---|---|
| 1 | 改了就违约 / 可被断言检验 / 跨模块生效？ | 契约 `SPECS.md` |
| 2 | 绝对不能做的平台 / 法律 / 政策红线？ | 契约 `SPECS.md`（标红线） |
| 3 | 描述系统怎么运转（状态流转 / 判定顺序 / 职责边界）？ | 规则 `RULES.md` |
| 4 | 描述某个当前取值 / 数量 / 标识 / 基准快照？ | 配置 `CONFIG.md` |
| 5 | 解释为什么 / 考据 / 备选 / 被否方案 / 决策史？ | 设计 `DESIGNS.md` |
| 6 | 给 Agent / 新协作者复用的上下文或指令模板？ | 上下文 `PROMPT.md` |
| 7 | 出过的错 / 根因 / 修法 / 不可回退的防线？ | 缺陷墙 `BUGWALL.md` |
| 8 | 验证某条约束或交付结果的可执行用例 / 证据？ | 测试台账 `TESTS.md` |

写契约前先过准入 4 条（可检验 / 跨模块 / 改动成本高 / 是约束而非取值），不全满足就降级到规则或配置。

## IDX-002: 权威顺序

```
契约 SPECS > 规则 RULES > 配置 CONFIG > 代码 > 对话与日志
```

- 文档与代码不一致：**先改文档并留修订记录，再同步代码**；禁止用代码悄悄改变规则。
- 对话、模型回答、会议里的临时结论，**落进对应文件才算定下来**。
- 历史提案、已收口章节占号但不生效；现行口径看 `PRM-001` 上下文卡、`RULES.md` 末次修订、本文件 `IDX-005` 占用说明。

## IDX-003: 新增内容流程

1. 用 `IDX-001` 判定归属；判为契约前过准入 4 条，不满足即降级。
2. 若为设计且未确认 → 只写提案、标注「提案，未进入实现」，不动正式文件与代码（见 `DSN-007`~`DSN-009`）。
3. 查 `IDX-005` 编号表取下一个号 → 写入条目 → **同一次改动里**回写编号表与变更记录。
4. 按 `IDX-004` 做类型同步；契约写「可检验条件 + `CNF-NNN` 引用」，不写字面值。
5. 补用例：新增不变量登记 `TST-NNN`，新增交付门槛登记 `VFY-NNN`；追溯矩阵 `UNCOVERED` 清零。
6. 收尾跑 `node tests/validate.js`，同步编号表、变更记录、前瞻编号集合。

## IDX-004: 三类变更流程

| 变更类型 | 要动的文件 |
|---|---|
| 只改取值 | 配置 `CONFIG.md` + 对应代码；对照基准快照，偏移需归因 |
| 改运转逻辑 | 规则 `RULES.md` + 逻辑代码；若影响不变量再加契约 |
| 改契约 | 契约 + 规则 + 配置 + 上下文 `PROMPT.md` + 代码 + 本索引变更记录 |

无对应增量的文件不要硬凑，在变更记录写「无对应增量，未改」。

## IDX-005: 编号约定表

九套前缀统一 `XXX-NNN` 三位数字，从 001 起；只增不减、不复用、不重排、修订不覆盖。

| 前缀 | 文件 | 已用范围 | 当前最大 | 下一个可用 |
|---|---|---|---|---|
| `SPEC-` | SPECS.md | 001–008 | 008 | 009 |
| `CNF-` | CONFIG.md | 001–017 | 017 | 018 |
| `RUL-` | RULES.md | 001–009 | 009 | 010 |
| `DSN-` | DESIGNS.md | 001–012 | 012 | 013 |
| `BUG-` | BUGWALL.md | 001–011 | 011 | 012 |
| `PRM-` | PROMPT.md | 001–010 | 010 | 011 |
| `IDX-` | INDEX.md（本文件） | 001–007 | 007 | 008 |
| `TST-` | TESTS.md | 001–019 | 019 | 020 |
| `VFY-` | TESTS.md | 001–006 | 006 | 007 |

- 契约 / 规则引用配置一律写 `CNF-NNN`，不写字面值；引用流程只写 `IDX-NNN`。
- 跨文件引用只写编号，不复制条目全文。校验脚本用一套正则 `/[A-Z]{3,4}-\d{3}/` 扫描全部九类。

> 占用说明：`DSN-007`~`DSN-009` 为提案（未实现），占号但不生效；`DSN-001`~`DSN-006` 为确认稿。`RUL-001` 有修订 R1，以最后一次修订为准。

## IDX-006: 文件清单与变更记录

### 文件清单

| 文件 | 角色 | 前缀 | 一句话职责 |
|---|---|---|---|
| `docs/INDEX.md` | 索引 | IDX | 分类判定、权威顺序、变更流程、编号表 |
| `docs/SPECS.md` | 契约 | SPEC | 不可违反的可检验约束与红线 |
| `docs/RULES.md` | 规则 | RUL | 系统怎么运转 |
| `docs/CONFIG.md` | 配置 | CNF | 当前取值与基准快照 |
| `docs/DESIGNS.md` | 设计 | DSN | 为什么这么定、备选、被否、决策史 |
| `docs/BUGWALL.md` | 缺陷墙 | BUG | 踩过的坑与不可回退防线 |
| `docs/PROMPT.md` | 上下文 | PRM | 给 Agent 的上下文卡与任务模板 |
| `docs/TESTS.md` | 测试台账 | TST / VFY | 编号用例、证据、追溯矩阵 |
| `tests/validate.js` | 校验脚本 | — | 编号连续 / 重复 / 路径 / 引用四类校验（结构） |
| `tests/verify_content.js` | 内容校验脚本 | — | 数值复算 / 定理条件 / 结论存在 / 一致性四类断言（内容可判定子集） |
| `tests/check-data.js` | 真源发布闸门 | — | 发布资格与结构：D1 manifest / D2 四类各 57 / D3 必备字段 / D4 review 四态 / D5 evidence 枚举 |
| `tests/check-reliable-extra.js` | 真源扩展检查 | — | 哈希一致性 / UNCOVERED / 覆盖度 / 结论 / 定理条件 / 异源复算 / 不自证 |
| `tools/build-reliable-data.js` | 真源编制器 | — | 从只读素材生成 228 张卡 + manifest + 锚点 + schema + 差距矩阵 |

> 交付物本体（非文档）：工作区根目录 3 个 HTML + `apps/miniprogram/` 小程序工程 + WorkBuddy 应用卡标记（不入库）。详见 `CNF-009`。

### 变更记录

| 轮次 | 日期 | 改动摘要 | 涉及文件 | 基准偏移 |
|---|---|---|---|---|
| R1 | 2026-11-24 | 初始化文档体系：把跨会话的项目结论、决策史、缺陷与用例按八个角色归档 | 全部 8 个文档 + validate.js | 无（首次建基准，见 `CNF-007`） |
| R2 | 2026-11-24 | 内容保真机制：新增 SPEC-008 / RUL-008~009 / CNF-010~011 / DSN-010 / BUG-009~011 / TST-013~015 / VFY-004 / PRM-009；修复 3 处内容错误；新增 verify_content.js 与 content_meta.js 并接入 APP | SPECS / RULES / CONFIG / DESIGNS / BUGWALL / TESTS / PROMPT / INDEX + 2 脚本 + 小程序 apps/miniprogram/data/lesson/store | 内容链新增基准 `CNF-011`；结构基准 `CNF-007` 不变 |
| R3 | 2026-11-24 | 解耦「可靠数据源建设」与「应用开发运行」：新增 PRM-010 专项任务启动 Prompt，把内容校验前移到数据源出口，下游只信任已发布版本 | PROMPT / INDEX | 无（仅新增上下文模板，不改约束与取值） |
| R4 | 2026-11-24 | 迁入 GitHub 仓库 `k12-math-knowledge-map`：doc→docs/、脚本→tests/、HTML→deliverables/、小程序→apps/miniprogram/；新建 resource_data（原始资料，不入库）/ reliable-data（真源）/ views（HTML 视图）/ deploy（部署，私有信息不入库）；一科一仓 | 全仓库目录 + 全部文档路径引用 | 路径基准整体迁移；编号与取值不变 |
| R5 | 2026-11-24 | 搭建进度同步框架：小程序 utils/sync.js 本地优先同步层 + deploy/server 零依赖 Node 进度服务（按 openid 隔离、HMAC token、冒烟 5/5）；敏感配置不入库 | apps/miniprogram/utils/{sync,runtime-config.example}.js、store.js、app.js、deploy/server/*、.gitignore | 新增运行时配置类（不入库）；编号与取值不变 |
| R6 | 2026-11-24 | 进度同步改用微信云开发：新增 cloud-config.js、sync.js 改接云数据库 progress 集合、app.js 初始化 wx.cloud；自建 server 降级为备选；核实环境 ID 并排除错误的 cloudbase-ai-toolkit 标识；创建集合并验证 _openid 隔离与写入链路 | CONFIG（CNF-012）/ DESIGNS（DSN-011）/ INDEX / README / deploy/README / apps/miniprogram/utils/{cloud-config,sync}.js、app.js | 新增同步配置基准 `CNF-012`；结构基准 `CNF-007`、内容基准 `CNF-011` 不变 |
| R7 | 2026-11-24 | 可靠数据源专项（PRM-010）首次发布 v1.0.0：编制 57×4 卡 + 依据锚点 + JSON Schema + 差距矩阵 + manifest；`tests/check-data.js` 为发布闸门、`tests/check-reliable-extra.js` 为扩展检查；新增 CNF-013 / TST-016~017 / VFY-005；全部卡 review=pending、verified=0 | CONFIG（CNF-013）/ TESTS（TST-016~017、VFY-005）/ INDEX / reliable-data/* / tools/build-reliable-data.js / tests/check-reliable-extra.js / tests/evidence/* | 新增真源基准 `CNF-013`；结构基准 `CNF-007`、内容基准 `CNF-011` 不变；发现旧侧 R2_CHECKED 15 条含 1 条重复，如实记入差距矩阵 |
| R8 | 2026-11-25 | 四段培养体系扩展 v2.0.0（小学 4—6 年级接入）：改 `SPEC-002` 为分层基线、CNF-001 增 `primary`，新增 CNF-014 / DSN-012 / VFY-006；零破坏方案落地——五个 `o_` 衔接节点 ID 与卡字段冻结，新增 10 个 `p_` 节点 40 卡（evidence=C / pending），跨学段边写入独立 `bridges.json`；归档 v1.0.0 快照；校验脚本去硬编码 57 | SPECS（SPEC-002 修订）/ CONFIG（CNF-001、CNF-014）/ DESIGNS（DSN-012）/ TESTS（VFY-006）/ INDEX / reliable-data/* / reliable-data/snapshots/v1.0.0/* / tools/{build-reliable-data,build-data}.js / tests/{check-data,check-reliable-extra}.js / tests/evidence/HUMAN_SIGNOFF_V2.md | 新增分层基准 `CNF-014`、`SPEC-002` 修订；E8a 断言 v1.0.0 的 228 卡哈希零漂移 |
| R9 | 2026-11-25 | 多路径异源交叉校验（知识点完整性/正确性专项）：新增 TST-018；四域隔离导出盲题包（剥离答案）+裸主题清单，独立反向解题 67 题、完整性基准 67 节点、定理条件四卡合并审查；结论一致 66/67（存疑 2 为题目陈述，冲突 0）、任务禁止的条件省略 0；发现 CC-F01/F02/F03 修复建议未执行；268 卡哈希与 manifest 未动、`pending=268`/`verified=0` | TESTS（TST-018）/ INDEX / reliable-data/index/CROSS_CHECK_V1.md / tests/evidence/crosscheck/* / tools/{export-crosscheck,compare-completeness}.js | 异源 AI 交叉**不构成人工签核、不解锁 verified**（SPEC-008）；人工闸门 VFY-005/VFY-006 仍 BLOCKED |
| R10 | 2026-11-25 | 内容修正/扩写发布 v2.1.0（家长决定内容产出不受教材扫描影响）：执行 CC-F01/F02/F03——s_conic 补椭圆方程结论 8√2/5、j_trans 补坐标结论 √41/P(8/5,0)（新推理档位独立复验一致且条件充分）；9 节点扩写进阶要点；补丁源 patches_v2_1_0.js；相对 v2.0.0 恰好 36 卡变化越界 0（E8c），v1/v2 快照完整保留（E8a）；E8 断言改为版本可追溯语义 | CONFIG（CNF-015）/ INDEX / reliable-data/snapshots/v2.0.0/* / reliable-data/source/patches_v2_1_0.js / reliable-data/CHANGELOG.md / reliable-data/index/CROSS_CHECK_V1.md / tests/evidence/crosscheck/RECHECK_V21.md / tests/check-reliable-extra.js | 有意的原 57 节点修改（7 个）导致相对 v1.0.0 漂移，历史快照不覆盖；内容依据数学公共知识 B/C 级、仍 pending，未解锁 verified |
| R11 | 2026-11-25 | app 数据可复现发布：新增 CNF-016 / TST-019；组织层数据固化为 `reliable-data/source/app_organization.json`（含小学段 t_primary domain/lecture/theme shell，67 节点四视图全覆盖）；`build-data.js` 从骨架升级为编译 6 模块（ALL_NODES/讲义六段式取真源，其余取配置）；`.gitignore` 放行 6 模块与 bridges.json 入库；`validate.js` 去硬编码 57/10；`check-app-build.js` 18/18 + 删除重建字节一致 | CONFIG（CNF-016）/ TESTS（TST-019）/ INDEX / README / .gitignore / reliable-data/source/app_organization.json / apps/miniprogram/data/*.js / tools/build-data.js / tests/{check-app-build,validate}.js / tests/evidence/*V21.log | app 数据为过渡数据（pending=268、verified=0），头部带未签核警告；clone 可运行但不解锁人工闸门 VFY-005/006 |
| R12 | 2026-11-25 | 小程序账号身份定稿：新增 CNF-017；后台查重实测「数海拾阶」「渐入数境」冲突后，定名「数学阶梯」、简称「阶梯」、介绍 118/120 字符（覆盖 67 知识点与四个功能点），名称避开「奥数」以保护词风险；`app.json` 全局标题与 `project.config.json` description 同步 | CONFIG（CNF-017）/ INDEX / apps/miniprogram/app.json / apps/miniprogram/project.config.json | 名称修改申请已提交待审核；服务类目须人工确认；账号身份定稿不代表内容已核准（pending=268、verified=0） |
| R13 | 2026-11-25 | 服务类目定稿（CNF-017 追加）：按资质与功能匹配核对官方类目表后，只保留「教育服务 > 教育信息展示」单一主营类目，移除「工具 > 计算器」（app 无计算功能）与「工具 > 备忘录」（仅本地掌握状态、弱匹配）；该类目个人主体可选、免资质，与名称/介绍/四 tab 内容展示功能三者对齐；服务类目与备案服务内容标识为两个独立环节 | CONFIG（CNF-017）/ INDEX | 服务类目调整与账号信息审批均已提交待审核；备案服务内容标识须另选（个人备案避开「教育」项）；不代表内容已核准（pending=268、verified=0） |
| R14 | 2026-11-25 | 备案提交顺序决策（CNF-017 追加）：先等名称审批生效再提交备案，不在审核期用默认名提交；依据备案订单提交后不同步改名、备案名 ≠ 实际名会被处置、管局审核期间无法改需重走变更备案全套；同时记录备案前置核对（名称取「数学阶梯」、服务内容标识选工具/信息查询、管理员与主体信息一致、不支持加急） | CONFIG（CNF-017）/ INDEX | 备案暂停等待名称审批；等待期可并行准备材料与上传代码；不代表内容已核准（pending=268、verified=0） |
| R15 | 2026-11-25 | 开发版本上传 `1.0.0`：微信开发者工具 CLI 上传成功（包 277,403 字节），生成开发版本、未提审未发布；代码包内界面标题已为「数学阶梯」，与后台待审批账号名独立，名称生效后无需重传；新增 `tests/evidence/UPLOAD_V100.md` 记录 | CONFIG（CNF-017）/ INDEX / tests/evidence/UPLOAD_V100.md | 上传为开发过渡数据（pending=268、verified=0）；提审前须完成名称审批与备案、配置用户隐私保护指引；提审与发布须管理员后台操作 |

| R16 | 2026-11-26 | 跨学段衔接关系可视化：新增第 7 个生成模块 `bridges.js`（从 bridges.json 编译 12 条边 + 富化字段 + 反向索引 + 统计）；图谱页主题视图新增「跨学段衔接链」折叠卡片与节点 `⇢N` 徽标，节点可跳详情；更正 DSN-007 记录滞后（小程序按主题视图早已实现，仅 A3 挂图未拍板）；check-app-build G1/G6 扩到 7 模块 + 新增 G7 四项，18/18→24/24 | CONFIG / DESIGNS（DSN-007 更正）/ PROMPT（PRM-007）/ TESTS（TST-019）/ INDEX / README / tools/build-data.js / tests/{check-app-build,validate}.js / apps/miniprogram/pages/graph/* / apps/miniprogram/data/bridges.js / tests/evidence/BRIDGES_V21.md | 衔接边为组织层声明，不改写真源卡（零破坏）；机械 PASS 不代表内容正确，仍 pending=268、verified=0 |

| R17 | 2026-11-26 | A3 挂图刷新到 v2.1.0（改生成式，杜绝手工过时）：新增 `tools/build-poster.js` 从 app 数据模块渲染两版挂图——按学段版（⓪小学10/①初中21/②高中15/③奥赛21=67 节点）、按主题版（DSN-007 提案落地，11 主题网格 + 主题内学段深化链）；两版含 12 条衔接链与 15 类题目信号速查，保留 A3 横向打印样式；删除重建字节一致；README 交付物口径改「生成式」 | README / INDEX / tools/build-poster.js / deliverables/olympiad-poster-A3.html / deliverables/olympiad-poster-themes-A3.html / tests/evidence/POSTER_V21.md | 挂图为真源下游视图，仍 pending=268、verified=0，机械 PASS 不代表内容正确；未做纸质打样 |

| R18 | 2026-11-26 | 用语调整：代码包内用户可见文案「授课」→「讲解」（tabBar 首项 / lecture.json + lesson.json 页面标题 / lecture 首页 5 处 / project.config.json description）；保留页面路径 `pages/lecture/`、数据字段 LECTURES、历史决策名（DSN-004/SPEC-007/TST-003）与版本证据原文（契约与可追溯性，非用户文案）；CNF-017 记录该调整并注明后台账号介绍仍为「授课卡片」、如需统一须家长人工改 | CONFIG（CNF-017）/ INDEX / apps/miniprogram/{app.json,project.config.json,pages/lecture/lecture.json,pages/lecture/lecture.wxml,pages/lesson/lesson.json} | 后台对外介绍字段未随代码改动（审批中）；内容仍 pending=268、verified=0 |

## IDX-007: 设计文档占用与生效说明

- **编号占用 ≠ 内容生效**：提案、历史存档、已收口章节都占号。
- 现行口径判定顺序：① `PRM-001` 上下文卡「当前口径」区 → ② `RULES.md` 末次修订 → ③ `IDX-005` 占用说明。
- `DSN-010`（内容保真三层机制）为 R2 确认稿，已生效；`DSN-007` 小程序侧「按主题视图」已于 v2.1.0 实现（A3 挂图主题版已生成（见 R17）），`DSN-008`~`009` 仍为未实现提案。
- 提案转确认稿：决策者确认后**另取新号、另起确认稿**，提案原文转历史存档，不覆盖、不删编号。
- 本项目设计主线是一次完整的定位演进：图谱工具 → 主题视图 → 题型索引 → **授课优先**（当前生效，见 `DSN-004`）；前几步不是被推翻，而是降为辅助层。
