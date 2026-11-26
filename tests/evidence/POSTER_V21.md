# A3 家庭挂图刷新到 v2.1.0 · 实现与验证记录

生成时间：2026-11-26　适用版本：v2.1.0（67 节点 / 四段培养体系 / 11 主题）

## 1. 问题

旧挂图 `deliverables/olympiad-poster-A3.html` 是 v1.0.0 手工硬编码：标题写「三大来源 · 12 板块 · 57 知识节点」，不含小学段，与当前 67 节点 / 四学段 / 11 主题的真源严重脱节。手工改会再次过时。

## 2. 方案：生成式挂图

新增 `tools/build-poster.js`，从 app 数据模块（真源的下游编译产物）渲染，**不手工维护节点清单**：

- 输入：`apps/miniprogram/data/{nodes,themes,bridges,topic_index}.js`
- 输出两版 A3 横向挂图（保留原打印规格 `A3 landscape` / 勾选记录 / 虚线填写日期 / 打印按钮）：
  1. `deliverables/olympiad-poster-A3.html`——按学段版：四栏（⓪小学 10 / ①初中 21 / ②高中 15 / ③奥赛 21），共 67 节点
  2. `deliverables/olympiad-poster-themes-A3.html`——按主题版（DSN-007 提案落地）：11 主题 × 5 列 3 行网格，主题内节点按学段顺序排列呈现深化链，共 67 节点
- 两版底部均含：跨学段衔接链 12 条（来自 bridges.json，标注课标/竞赛衔接/奥赛）+ 题目信号速查 15 类（来自 SIGNAL_RULES）

## 3. 核对结果

| 项 | 按学段版 | 按主题版 |
|---|---|---|
| 节点条目数 | 67 | 67 |
| 旧「三大来源 / 57 知识节点」残留 | 0 | 0 |
| 四学段序号 ⓪①②③ | 齐全 | — |
| 主题数 | — | 11 |
| 衔接链 | 12 条 | 12 条 |
| 题目信号 | 15 类 | 15 类 |
| 可复现（删除重建字节一致） | IDENTICAL | IDENTICAL |

## 4. 校验链

check-data 9/9、check-reliable-extra 33/33、validate 28/28、verify_content 22/22、check-app-build 24/24，全部 PASSED。

## 5. 诚实边界

- 挂图为真源下游视图，机械 PASS 不代表内容正确；268 卡仍 `review=pending`、`verified=0`，人工签核闸门未解锁（SPEC-008）。
- 衔接链与主题顺序为组织层声明（零破坏，不回写真源卡）。
- 打印效果需在浏览器打开 HTML → 打印 → A3 横向核验；本次已做数据级与字节级验证，未做纸质打样。
