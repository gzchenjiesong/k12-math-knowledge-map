# 阶段 1 · 57 节点 × 四类卡差距矩阵（生成物）

- 生成命令：`node tools/build-reliable-data.js`；真源版本：`1.0.0`；日期：2026-11-24。
- 现状口径：矩阵右四列描述**编制前素材状态**；本真源产出后四类卡均为 57/57，review 一律 `pending`。
- R2 旧侧 `R2_CHECKED` 列表共 15 条，去重后 14 个唯一节点（`s_ineq` 重复登记）。
  故旧侧实际为 14 checked + 43 pending，与任务描述的「15 checked / 42 pending」存在 1 条差异，**如实标注，不擅自凑数**。
- 本真源按 `RUL-008` 第 1 条：新写/改写内容一律先置 `pending`；旧侧 checked 仅保留在 `priorReview` 元数据，不继承为可信状态。
- 已知缺陷：`BUG-009`（o_geo_trans 缺 135° 结论，素材已修）、`BUG-010`（s_vec3 二面角锐钝，素材已修）、`BUG-011`（校验器浮点精确比较误报，素材已修）。

| nodeId | 标题 | 来源 | 旧侧复核 | 知识点卡 | 教案卡 | 易错卡 | 示范卡 | 已知缺陷 |
|---|---|---|---|---|---|---|---|---|
| j_alg | 整式与因式分解 | junior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_circle | 圆 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_cong | 勾股定理与逆定理 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_eq | 方程与方程组 | junior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_frac | 分式与二次根式 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_fun | 函数基础 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_ineq | 不等式 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_num | 实数与运算 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_prob | 概率初步 | junior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_quad | 二次函数专题 | junior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_quadg | 四边形 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_simi | 相似三角形 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_stats | 统计初步 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_trans | 图形变换 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_tri | 三角形与全等 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| j_trig | 解直角三角形 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_alg_skill | 代数变形技巧 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_binom | 组合恒等式与进阶计数 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_comb_adv | 抽屉 · 容斥 · 极端 · 不变量 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_comb_opt | 组合极值 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_complex | 复数进阶 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_cong | 整除与同余 | olympiad | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_dio | 不定方程初步 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_dio2 | 不定方程 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_div0 | 整除与同余初步 | junior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_fermat | 费马小定理 · 欧拉定理 · 孙子定理 | olympiad | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_func_eq | 函数迭代与函数方程 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_area | 面积法与等积变换 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_basic | 几何定理进阶(初中部分) | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_ceva | 梅涅劳斯 / 塞瓦 / 托勒密 / 西姆松 | olympiad | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_circle | 圆幂 · 根轴 · 四点共圆 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_ineq | 几何不等式与等周 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_geo_trans | 几何变换 | olympiad | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | BUG-009（已修，135°） |
| o_geo_vec | 复数法与向量法解几何 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_graph | 图论初步 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_induct | 数学归纳法 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_ineq | 不等式证明体系 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_numfun | 数论函数与格点 | olympiad | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_pigeon | 抽屉原理与极端原理 | junior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_poly | 多项式 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_recur | 递推数列与特征方程 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| o_trig_id | 三角恒等式与三角不等式 | olympiad | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_complex | 复数 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_conic | 圆锥曲线 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_count | 计数原理 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_deriv | 导数及其应用 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_exp | 指数与对数函数 | senior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_func | 函数概念与性质 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_ineq | 不等式 | senior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_line | 直线与圆 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_prob | 概率与统计 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_seq | 数列 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_set | 集合与常用逻辑用语 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_solid | 立体几何初步 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_trig | 三角函数与恒等变换 | senior | pending | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_vec | 平面向量 | senior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | — |
| s_vec3 | 空间向量与立体几何 | senior | checked（R2 机械复算） | 待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | BUG-010（已修，二面角锐钝） |

## 汇总

| 卡类 | 编制前 | 编制后 | 说明 |
|---|---|---|---|
| 知识点卡 | 0（无真源） | 57 | 从 nodes.js 结构化搬运，含来源/前置/关联/识别信号 |
| 授课教案卡 | 57（素材六段齐全，可信度混杂） | 57 | 从 lectures.js 搬运六段；build 过程不宣称正确 |
| 易错考点卡 | 57 节点各 2 条（散在素材中） | 57 文件 / 114 条 | 每节点独立成文件，补错因/触发/纠正 |
| 真题示范卡 | 57 节点各 1 题（散在素材中） | 57 文件 / 57 题 | 题目与解答分离，逐题给明确结论 |

> 差距性质：**结构性缺口**（此前无独立真源）远大于**内容性缺口**（素材已覆盖 57 点）。
> 但素材本身 15/42 混杂且无外部签核，故本真源不把任何条目标为 `verified`。
