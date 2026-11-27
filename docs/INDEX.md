# INDEX · 文档索引与写入规则

> 项目：奥数竞赛家庭学习工具链（交互图谱 / A3 挂图 / 书单 / 微信小程序「数海扶摇」）
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
| `SPEC-` | SPECS.md | 001–009 | 009 | 010 |
| `CNF-` | CONFIG.md | 001–025 | 025 | 026 |
| `RUL-` | RULES.md | 001–012 | 012 | 013 |
| `DSN-` | DESIGNS.md | 001–012 | 012 | 013 |
| `BUG-` | BUGWALL.md | 001–012 | 012 | 013 |
| `PRM-` | PROMPT.md | 001–010 | 010 | 011 |
| `IDX-` | INDEX.md（本文件） | 001–007 | 007 | 008 |
| `TST-` | TESTS.md | 001–025 | 025 | 026 |
| `VFY-` | TESTS.md | 001–009 | 009 | 010 |

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

| R19 | 2026-11-26 | 多屏适配与投影可行性调研（只调研未实现）：核对微信官方文档确认 iPad 横屏（`resizable: true`，2.3.0+）/ CSS 媒体查询 / match-media / row-col 栅格 / PC 大屏模式均官方支持；小程序投屏 API 仅绑定 video 组件，不能投任意页面；无 TV 端运行时，WMPF 属 B 端硬件接入。实测本项目 7 页零 @media、全 rpx、未开 resizable。给出 L1 横屏可用 / L2 演示模式 / L3 大屏演示页分层方案，待家长拍板 | docs/RESEARCH-SCREEN.md / INDEX | 未改代码；后台账号介绍由家长审批后人工改；1.0.0 审核中，本轮如要随首版发布需重新上传 |

| R20 | 2026-11-26 | L1 横屏适配 + L2 演示模式落地（家长拍板「L1+L2 一起、手机也开 auto」）：app.json 开 `resizable:true` + `pageOrientation:auto`；app.wxss 建 768px 断点基类（.page 限宽 1180px 居中、字号回物理尺寸）；讲解首页 top-grid/lec-grid 两列、图谱 list-grid 两列（衔接链通栏）、卡片三列、讲解详情正文两列，其余四页字号兜底；lesson 详情页加 onResize + 演示模式（无 tabBar、一屏一个点、前后翻页、投影字号 18px），窄屏自动退出。WXML 标签配对全 OK、8/8 断点覆盖、五链全绿 | app.json / app.wxss / pages/{lecture,graph,cards,lesson,gaps,node,locator}/* / tests/evidence/RESPONSIVE_V21.md / docs/RESEARCH-SCREEN.md / INDEX | 未做模拟器/真机横屏截图（CLI 未接入工具链），仅静态核对；1.0.0 审核中，随首版发布需重新上传；内容仍 pending=268、verified=0 |

| R21 | 2026-11-26 | M1 投屏演示模式（家长决策：手机+电视小米、走系统屏幕镜像、手机当遥控器、专注电视显示）：新增第 8 页 `pages/present`，全屏深色高对比大字幻灯片——每个知识点拆本质/方法/题目/解析/易错自检页（例题题干与解析分页先思后答）、底部大按钮+左右滑动翻页+目录跳转、`navigationStyle:custom`+状态栏避让；入口在 lesson 导语卡「▣ 投屏演示」。只读 lectures.js 视图重组，357 张幻灯片/0 异常节点，五链全绿（24/24 app-build 不变）。IDE 为验证 iPad 自动生成的多平台文件（app.miniapp.json/project.miniapp.json/i18n/base.json/project.config.json 改 multiPlatform，base.json 的「寇德计算器」为审批通过前的当前正式名，审批通过后须改「数学阶梯」）保留工作区但不入库 | app.json / pages/present/{js,wxml,wxss,json} / pages/lesson/{js,wxml,wxss} / docs/RESEARCH-SCREEN.md / tests/evidence/PRESENT_M1.md / INDEX | R20/R21 原记「CLI 未接入无法截图」有误：内置 CLI v0.3.11 实含 simulator_screenshot / simulator_open_page / automation_viewport_action，已实测截图成功（CURRENT_STATE.jpg 手机竖屏）；但 CLI 无切换设备/横屏参数，横屏需家长在工具 UI 选 iPad 设备后我截图。待家长按 MIRROR_TEST_GUIDE 实测；1.0.0 审核中，投屏页需真机调试或重传开发版；内容仍 pending=268、verified=0 |

| R22 | 2026-11-26 | iPad Pro 13 模拟器 CLI 截图实测（首轮真机级视觉验证，非纯静态）：家长在工具切 iPad Pro 13（1032×1376 竖屏，触发 768px 断点），CLI v0.3.11 `simulator_screenshot` 逐页取证 8 页。修 3 bug：①投屏页 `.canvas` 缺 `min-height:0` 致底部翻页栏被挤出屏幕（flex 子项按内容撑开）+ `.stage` 缺 `box-sizing:border-box`；②投屏封面标题 92→60rpx、正文 line-clamp 5 行（原拆行/溢出、一屏看不全）；③查漏页小学分组 id=primary 无背景色致白底白字（补紫色，graph 页同类问题当时漏改 gaps）。附带图谱副标题「4 大来源」→「4 大学段」。修复后逐页截图复验 PASS。CLI 截图能力已实测可用（更正此前"CLI 未接入"误记） | pages/present/present.wxss / pages/gaps/gaps.wxss / pages/graph/graph.wxml / tests/evidence/IPAD13_PREVIEW.md / tests/evidence/simulator/IPAD13_*.png / INDEX | 仅竖屏实测，横屏待家长旋转设备后验证；内容为 pending=268/verified=0 未变 |

| R23 | 2026-11-26 | 横屏实测与修复（家长找不到旋转开关：手机模式本无该按钮、仅 iPad 设备下出现；CLI 亦无方向参数）：临时把 window.pageOrientation 改 landscape 触发模拟器横屏（iPhone 17 横屏 874×276 矮屏）逐页取证 6 页后恢复 auto。发现 present 投屏页在矮横屏封面标题被底部按钮栏完全遮挡（controls 约 126rpx + 顶部条约 60rpx 吃掉矮屏）→ 新增 `@media (min-width:768px) and (max-height:560px)` 矮横屏专用断点（顶部条/内容字号压缩、按钮栏 126→60rpx、封面矮屏隐藏 bullets），复验封面/正文页完整可见。其余 5 页横屏 PASS。证据 LANDSCAPE_PREVIEW.md + LAND_*.png | pages/present/present.wxss / tests/evidence/LANDSCAPE_PREVIEW.md / tests/evidence/simulator/LAND_*.png / INDEX | 仅 iPhone 矮横屏实测（比 iPad 横屏更严苛），iPad 真横屏仍建议家长确认；IDE 多平台文件仍未入库；内容 pending=268/verified=0 |

| R24 | 2026-11-26 | 多平台配置入库决策变更：家长原为本地验证 iPad 启用多端处理（工具生成配置），最初按"本地验证不入库"处理；本次决定一并提交入库以便换设备复现验证环境。新增 CNF-018 记录 4 个入库文件（project.config.json 改 multiPlatform+condition:true+插件版本 / app.miniapp.json / project.miniapp.json / i18n/base.json），**重点待办：i18n/base.json 三处 name 为审批前旧名「寇德计算器」，名称审批通过后须改「数学阶梯」**（与后台账号改名独立）。库内核心内容此前已全部入库（HEAD=origin/main），本轮补齐最后 4 个文件 | docs/CONFIG.md（CNF-018）/ INDEX / apps/miniprogram/{project.config.json,app.miniapp.json,project.miniapp.json,i18n/base.json} | 入库前五链全绿（9/9、33/33、28/28、22/22、24/24）；内容仍 pending=268/verified=0；旧名改动待名称审批通过后执行 |

| R25 | 2026-11-26 | 最终定名「数海扶摇」与账号信息更新：名称经平台审核通过（取代因「通用词命名」被驳回的「数学阶梯」），简称复用同名，介绍定稿 114/120 字符（换名+授课→讲解+新增跨学段衔接链+扶摇直上呼应新名），账号信息后台已全部更新、备案已提交（平台审核中）。新增 CNF-019 记录现行口径；清理工程内全部旧名残留——app.js/app.json/project.config.json/graph.wxml/present.js/present.wxml/build-poster.js 及两版 A3 挂图（生成器重新产出），i18n/base.json 三处 name（CNF-018 遗留待办）一并改为「数海扶摇」，全量扫描零残留。历史证据与 R12–R24 旧名条目保留不改写 | docs/CONFIG.md（CNF-019）/ INDEX / apps/miniprogram/{app.js,app.json,project.config.json,i18n/base.json,pages/graph/graph.wxml,pages/present/present.js,pages/present/present.wxml} / tools/build-poster.js / deliverables/olympiad-poster-{A3,themes-A3}.html / tests/evidence/RENAME_FINAL.md | 旧名改动已完成；待办：① 后台 1.0.0 是功能改动前包，新功能随首版发布需重传开发版（**已于 R26 完成**）；② 微信认证未认证（无被搜索/被分享能力，认证通过重置改名次数）；③ 备案转管局审核 1–20 工作日，完成前不可发布。内容仍 pending=268/verified=0 |

| R26 | 2026-11-26 | 重传开发版 `1.0.0`（覆盖 11-25 旧开发包，家长明确要求）：用微信开发者工具 CLI `wechatide -c WorkBuddy upload` 上传，成功（包 303,430 字节，较旧包 277,403 增约 26 KB = 衔接链/投屏页/A3挂图/多屏适配/定名更新）。同一版本号覆盖未提审的开发版本。登录主体陈介松、未过期；基于提交 `cd5a1f1`、工作区干净、上传前五链全绿。证据 `tests/evidence/UPLOAD_V100.md` 增补重传记录（保留原记录、更正"名称通过后无需重传"仅对名称字段成立） | tests/evidence/UPLOAD_V100.md / docs/INDEX.md | 现行后台开发版 `1.0.0` 已含全部新功能，可直接提审；提审/发布仍须管理员后台操作；备案与认证按 R25 待办由家长人工处理；内容仍 pending=268/verified=0 |

| R27 | 2026-11-26 | 提交代码审核（家长在公众平台后台操作）：15:35:28 提交开发版 `1.0.0`（11-26 重传包），状态「审核中」，平台预估 1–7 天。版本描述 132/200 字符（家长删去草稿末尾内部状态披露句，聚焦产品功能）；测试账号选「无需登录」、订单中心 path 留空、隐私指引选「采集用户隐私」（与后台已配置指引一致）。`SUBMIT_V100_CHECKLIST.md` 增补提审事实区块与实际提交文案 | tests/evidence/SUBMIT_V100_CHECKLIST.md / docs/INDEX.md | 审核中不自动上线，通过后须手动发布且备案须全部完成；若驳回按清单第 5 节对照处理。内容仍 pending=268/verified=0 |

| R28 | 2026-11-26 | 投屏演示页改为标准 16:9 PPT 画布（家长要求按电视屏幕定制横屏 PPT、进入后类似 PPT 播放、电视投影手机/iPad 当控制器）。调研 55/65/75/85/100 寸电视：4:3 已淘汰、全是 16:9 4K，四个主力尺寸占 74%，故只做一套 16:9 母版不做 4:3 两套（4:3 只在 iPad 控制器端）。新增 CNF-020 固化口径。`pages/present` 重构：固定 1280×720 坐标系 + transform scale 等比适配，最大 16:9 矩形居中 letterbox；7 类 PPT 版式（封面金句/编号卡/题纸/绿框解析/双栏易错自检），例题保持先思后答两页；遥控器 4 按钮悬浮画布外、3.5s 自动淡出、触摸唤醒。iPad 13" 模拟器实测画布 1032×581（1.776≈16/9）、52 页、6 张版式截图取证；修复 kicker 与信息条重叠、方法卡溢出、封面标签压页脚、字段名笔误。五链全绿 | docs/CONFIG.md（CNF-020）/ docs/INDEX.md / apps/miniprogram/pages/present/{js,wxml,wxss} / tests/evidence/TV_PPT_16X9.md / tests/evidence/simulator/PPT16x9_*.jpg | 系统镜像固有限制：唤醒态控制条仍会出现在电视画面（3.5s 后淡出），要完全无控制条须升级双端方案，本轮按 M1 决策不做；真机投屏待家长按 MIRROR_TEST_GUIDE 实测。注意：本次为审核期功能改动，后台审核包为改动前版本，若需随首版上线须重传开发版（家长决策）。内容仍 pending=268/verified=0 |
| R29 | 2026-11-26 | README 演示截图更新 + iPad 底栏字号适配。① README 投屏演示图从旧版 `IPAD13_present.png` 换为新版 16:9 PPT 实拍：从 `PPT16x9_*.jpg` 裁去上下黑边（定位画布 y=352..850、888×499、比例 1.7796）得 `README_present_{cover,essence,answer}.jpg`，README 由 4 图扩为 6 图（3 iPad 页 + 3 投屏页）。② 家长明确"控制条出现没关系、不影响功能使用"，本轮不改投屏控制条逻辑。③ 微信原生 tabBar 字号固定约 10px，iPad 1032px 窗口下偏小——改用自定义 tabBar（CNF-021）：`app.json` 加 `custom:true`（list 保留供断言）、新增 `custom-tab-bar/index` 四件套、物理 px 分档（手机 12px / 宽屏 16px）、`utils/tabbar.js` 同步四页选中态。iPad 实测 `hasBar:true`、selected 0↔1 切换正常、字号清晰。五链全绿 | README.md / docs/CONFIG.md（CNF-021）/ docs/INDEX.md / apps/miniprogram/{app.json,custom-tab-bar/index.*,utils/tabbar.js,pages/{lecture,graph,locator,gaps}/*.js} / tests/evidence/TABBAR_CUSTOM_IPAD.md / tests/evidence/simulator/{README_present_*.jpg,TABBAR_*_ipad.jpg} | 自定义 tabBar 基础库 <2.5.0 回退原生（功能不受影响）；审核期功能改动，若需随首版上线须重传开发版（家长决策）。内容仍 pending=268/verified=0 |
| R30 | 2026-11-26 | README 首屏 3 张 iPad 截图补齐为新样式：家长发现 GitHub README 上 `IPAD13_{lecture,lesson,graph}.png` 仍是自定义 tabBar 之前的旧小字按钮样式。在 iPad 13" 模拟器（1032px）重截覆盖同名文件——首页/图谱页底部显示蓝色胶囊高亮新 tabBar，详情页用 `id=t_alg` 重截、内容完整。README 引用路径不变，推送后 GitHub 自动刷新。证据文档 `TABBAR_CUSTOM_IPAD.md` 补记 | tests/evidence/simulator/IPAD13_{lecture,lesson,graph}.png / tests/evidence/TABBAR_CUSTOM_IPAD.md / docs/INDEX.md | 纯截图更新，代码未改；五链全绿 |

| R31 | 2026-11-26 | 按家庭信息工具边界补11条来源登记、67节点追溯（42范围定位）；字段版本/幂等操作同步，修正基础权限查询混用、旧本地迁移和页面保存失败；四卡镜像与审核/来源哈希绑定、实际答案变异防线、旧反向seed退役。先更新SPEC-009/RUL-010/CNF-022；本地回归全部通过，详见TST-020~022与执行摘要 | README、docs治理、evidence来源、store/sync/sync-state、app及状态页、构建器/contract、7生成模块及清单、tests | 不新增孩子档案或考核；268卡/manifest/历史快照不变；未commit/push/部署，真实云与真机VFY-007缺证，旧新客户端不得混用 |

| R32 | 2026-11-26 | 使用官方本地命令行在禁云、独立storage键副本完成手机8页运行、18次模板样式摘要、67卡清单及四学段例题抽检；原生复现并修复取消笔记仍显示草稿，回归先37/39失败后39/39通过，模拟器复验取消不增加outbox。结果及调试限制见TESTS执行摘要 | RULES（RUL-010补充）/ TESTS（TST-021、VFY-007增补）/ INDEX / pages/node/node.js / tests/check-sync.js / tests/evidence/simulator-r32/ | iPad等待用户手动切换设备；真实云、真机、整包体积/性能仍缺证；未commit/push或上传发布，真源及生成数据无新增改动。SPEC/CONFIG/PROMPT无对应增量，未改 |

R32追加（用户切换iPad后）：iPad Pro 13(M4)竖屏1032×1376已实测8页、两列专题/三列卡片、最长双来源换行、笔记取消及1032×581演示画布；新增9张截图与汇总，见TESTS的R32补充。当前停留演示页等待用户直接旋转，以验证实时resize；尚非横屏/真机/云同步通过。本次无业务代码改动。

R32再补（配置式横屏）：用户未找到旋转按钮，改在隔离app.json及演示页覆盖中临时设landscape，实测iPad1376×1032下8页及1376×774演示画布，新增8张横屏证据后恢复auto。固定横屏验证不替代实时onResize；不再要求用户寻找按钮。生产配置及业务源码未改，边界详见TESTS。

R32收尾：用户明确因缺实测环境暂缓投屏页验证，后续实时旋转/onResize/电视镜像标SKIPPED而非PASS；保留既有静态方向模拟器证据，结束本轮调整后范围的模拟器验收，不要求用户继续操作。投屏onResize未修、VFY-007真实云及真机缺证不变。

| R33 | 2026-11-26 | 用户确认第一批：题型定位/卡片计数修复、响应式字号触控、首页精简、显式状态选择、提示解答分离、来源摘要。先登记RUL-011/CNF-023/TST-023/VFY-008，实施及结果续记 | RULES / CONFIG / TESTS / INDEX、相关页面与回归 | 实施中；不扩展第二批功能，不改真源与同步协议，投屏继续SKIPPED；SPEC/PROMPT无对应增量，未改 |
| R33续记 | 2026-11-26 | 第一批代码与回归已落地：UI44/44、同步及详情65/65；来源/生成/数学子集回归通过。iPad固定横竖屏代表检查共16截图，含4张菜单诊断；实际题型链接跳转、零结果总数、提示/答案独立、图谱入口不误导航已观察。隔离auto恢复，63自有源码仅3配置差异 | 七阅读页 / app与tabBar样式 / utils/{status-picker,content-summary}.js / tests/{check-ui,check-sync}.js / tests/evidence/simulator-r33 / TESTS / CONFIG / INDEX | VFY-008仍BLOCKED：新版手机、原生菜单选择/取消缺证；VFY-007不解锁。未改数学真源、生产方向或present，未commit/push/上传发布，未实现第二批 |

| R33手机补验 | 2026-11-27 | 用户切换iPhone17，手机竖屏七阅读页代表检查完成；新增15截图、总31。用户确认菜单实际可见并完成选择/取消/同值，回读j_eq=2、outbox仅4→5，同值仍5；截图缺原生选项不是界面缺失。UI44/44、同步65/65、数据契约49/49复跑通过 | TESTS / CONFIG / INDEX / tests/evidence/simulator-r33 | VFY-008代表性隔离范围PASS；未改业务代码或真源，未做完整手机横屏/iPad原生菜单矩阵，VFY-007仍缺证、投屏SKIPPED；未commit/push/发布 |

| R34 | 2026-11-27 | 用户仅授权B2阅读上下文/草稿保护、B4笔记存疑聚合、B6自解释交互与去冗余文案；先登记RUL-012/CNF-024/TST-024/VFY-009再实施 | RULES / CONFIG / TESTS / INDEX及七阅读页与回归 | 实施中；不做B1/B3/B5，不改真源/同步协议/present，不发布；SPEC/PROMPT无对应契约增量未改 |

| R34收尾 | 2026-11-27 | B2会话返回/草稿保护、B4查漏三视图与笔记查询/锚点及存疑、B6短控件和来源折叠已实施；B2回归36/36、记录40/40、UI44/44、同步65/65；手机代表链路及用户原生继续编辑/放弃+回读通过，15截图含2诊断；查漏聚合消除逐字段重复读取 | 七阅读页、custom-tab-bar、utils/{reading-context,draft-guard,status-picker,content-summary}.js、tests/{check-reading-context,check-records,check-ui,check-sync}.js、tests/evidence/simulator-r34、CONFIG / TESTS / INDEX | TST-024与VFY-009代表性隔离范围PASS；真源/生成物/协议/present未改，未做B1/B3/B5、未commit/push/发布；真实云/真机/性能VFY-007继续缺证，投屏SKIPPED |

| R35 | 2026-11-27 | 用户授权两轮优化后整理工程并commit/push：更新README及PRM-001现行入口、标注旧deploy样例；移除首页建议死代码；专题存疑改为最新store取反并补回归；登记CNF-025/TST-025/BUG-012，统一11组测试入口与生成物LF，补运行数据忽略 | README / PROMPT / CONFIG / RULES / TESTS / BUGWALL / INDEX、deploy说明、package.json / .gitattributes / .gitignore、lecture / lesson / reading-context、check-sync / check-records / validate | 整理与复验进行中，提交/推送结果后续留痕；数学真源、manifest、快照、同步协议、present未改；SPEC/DESIGNS无对应增量未改；不上传提审发布 |

> R35复验续记：npm test十一组全部通过；静态32/32、记录46/46、同步65/65、UI44/44、会话36/36，其余来源/契约/生成/内容子集通过。主代理内存恢复陈旧缓存读取，4项定向失败，证明确有回归防线；日志和边界见TST-025与TESTS R35执行摘要。推送待最终暂存检查；真实云/真机/性能缺证与投屏SKIPPED不变。

> R35提交边界续记：本次源码提交纳入154个审核过的改动/新增文件，无删除；原件、私有配置、运行数据与隔离副本均排除，8个生成文件暂存字节一致。完整来源修复、两轮交互优化与历史证据一并纳入，未修改数学真源/快照及present。提交与远端推送是否完成以Git日志/远端SHA为事实来源，不在当前文件中预写成功。

> R35文件清单修订：上表旧57节点/228卡和反向编制器描述仅为历史。现行基线见CNF-022；tools/build-reliable-data.js已退役并拒绝写入，正向入口为tools/build-data.js。工程快速回归见CNF-025，协作入口见PRM-001最新修订。

## IDX-007: 设计文档占用与生效说明

- **编号占用 ≠ 内容生效**：提案、历史存档、已收口章节都占号。
- 现行口径判定顺序：① `PRM-001` 上下文卡「当前口径」区 → ② `RULES.md` 末次修订 → ③ `IDX-005` 占用说明。
- `DSN-010`（内容保真三层机制）为 R2 确认稿，已生效；`DSN-007` 小程序侧「按主题视图」已于 v2.1.0 实现（A3 挂图主题版已生成（见 R17）），`DSN-008`~`009` 仍为未实现提案。
- 提案转确认稿：决策者确认后**另取新号、另起确认稿**，提案原文转历史存档，不覆盖、不删编号。
- 本项目设计主线是一次完整的定位演进：图谱工具 → 主题视图 → 题型索引 → **授课优先**（当前生效，见 `DSN-004`）；前几步不是被推翻，而是降为辅助层。
