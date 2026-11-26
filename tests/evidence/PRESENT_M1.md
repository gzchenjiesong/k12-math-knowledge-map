# 投屏演示模式（M1 系统屏幕镜像）实现证据

- 日期：2026-11-26
- 关联：`docs/RESEARCH-SCREEN.md` 第 8 节 M1 路径、`tests/evidence/MIRROR_TEST_GUIDE.md`、`RESEARCH-SCREEN` R20 横屏基础
- 决策（家长）：投屏走 M1 系统屏幕镜像；手机常亮可接受（演示时需手机交互操作）；本模块专注电视演示显示，不迁就手机观感。

## 1. 实现形态

新增独立页面 `pages/present/present`（第 8 个页面），全屏幻灯片式演示：

| 特性 | 说明 |
|---|---|
| 全屏沉浸 | `navigationStyle: custom` 去掉导航栏；`position: fixed` 铺满，无 tabBar 干扰 |
| 深色高对比 | 深蓝黑底 `#0b1020` + 白字，投影环境下远距离可读；关键色青绿 `#4fd1a5` / 金黄 `#f0c561` |
| 大字 | 正文 46rpx（宽屏`@media`下最大 1600rpx 阅读宽）、标题 76–92rpx、要点 42rpx；均用 rpx 随屏幕等比放大 |
| 一屏一主题 | 每个知识点拆成「本质 / 方法 / 题目 / 解析 / 易错自检」独立页；**例题题干与解析分页**（先思考再揭示答案） |
| 遥控器交互 | 底部大按钮「目录 / 上一页 / 下一页」+ 左右滑动翻页；顶部进度 `n/total` + 进度条 |
| 目录跳转 | 演示中点「目录」浮层，按知识点跳到对应页，适配讲解中途跳点 |
| 横屏适配 | `pageOrientation: auto` + 全局 `resizable: true`；`@media (min-width:768px)` 限制阅读宽度；顶部用 `statusBarHeight` 避让状态栏 |

入口：`pages/lesson/lesson` 导语卡操作区新增「▣ 投屏演示」→ `goPresent()` → `navigateTo('/pages/present/present?id=<专题id>')`。原 L2 页内演示模式保留，两者不冲突。

## 2. 数据来源（零破坏）

只读 `apps/miniprogram/data/lectures.js`（真源生成物）的 `g.points[]`，字段 `essence / method / example.q / example.a / pitfalls / check` 直接映射为幻灯片；`g.lead / goal / chain` 用于封面与结束页。
- 不新增数据模块、不回写真源卡、不改编译链。
- 内容仍 `pending=268`、`verified=0`；机械 PASS 不代表人工签核。

## 3. 分页规模（静态实测）

11 专题共 **357 张幻灯片**、0 异常节点（节点标题均可从真源解析）：

| 专题 | 页数 | 专题 | 页数 |
|---|---|---|---|
| t_primary 小学 | 52 | t_solid 立体几何 | 17 |
| t_alg 代数基础 | 27 | t_analytic 解析几何 | 12 |
| t_eq 方程不等式 | 22 | t_num 数论 | 32 |
| t_func 函数 | 37 | t_comb 组合概率 | 47 |
| t_trig 三角复数 | 27 | t_geo 平面几何 | 67 |
| t_seq 数列归纳 | 17 | — | — |

## 4. 验证

| 项 | 结果 |
|---|---|
| JS 语法（present.js / lesson.js） | `node --check` PASS |
| WXML 标签配对（present: view/text/scroll-view） | 20/20、14/14、2/2 全 OK |
| 分页数据完整性 | 357 页、0 异常节点 |
| app.json | 8 页含 present、resizable=true、pageOrientation=auto |
| 五条校验链 | 9/9、33/33、28/28、22/22、24/24 全绿 |

## 5. 未覆盖 / 待真机确认

- **未做模拟器或真机截图**：CLI 未接入本次工具链，仅静态核对 + 数据级验证。
- **M1 实测清单见 `MIRROR_TEST_GUIDE.md`**：需家长在小米手机+电视上验证黑屏、横屏破版、投影字号可读性。
- **代码版本前提**：当前上传的 `1.0.0` 是横屏/投屏改动**之前**的包；要用投屏模式需真机调试扫码，或重新上传开发版（不影响审核中版本快照）。
- 竖屏可用但非最佳；本模块以投屏（横屏镜像）为主要目标。
