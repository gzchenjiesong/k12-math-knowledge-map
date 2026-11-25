# 阶段 3 · 分批编制报告（v2.1.0）

- 分批口径：批次 1—10 沿用既有授课专题；批次 11 为 v2.0.0 新增小学段。每批按顺序先教案卡、再易错考点卡与真题示范卡。
- 四类卡数量口径：知识点 / 教案 / 易错 / 示范，每批均为 N/N/N/N（一节点一文件）。
- 检查结果：全量闸门 `check-data.js` `RESULT=9/9`、`VERDICT=PASSED`；扩展检查 `check-reliable-extra.js` 见 `tests/evidence/RELIABLE_EXTRA_V2.log`。
- 复核状态：全部 pending；verified 0（AI 不自证，`SPEC-008`）。
- 人工签核清单见 `tests/evidence/HUMAN_SIGNOFF_V1.md` 与 `HUMAN_SIGNOFF_V2.md`；证据锚点见 `reliable-data/evidence/SOURCES.json`。
- v1.0.0 的批次 1—10 快照见 `reliable-data/snapshots/v1.0.0/index/BATCH_REPORT.md`。

| 批次 | 专题 | 节点数 | 节点清单 | 四类卡（点/案/错/例） | 易错条目 / 示范题 | 复核状态 |
|---|---|---|---|---|---|---|
| 批次 1 | `t_alg` 代数基础与变形 | 5 | j_num, j_alg, j_frac, o_alg_skill, o_poly | 5 / 5 / 5 / 5 | 10 条 / 5 题 | pending 20，verified 0 |
| 批次 2 | `t_eq` 方程与不等式 | 4 | j_eq, j_ineq, s_ineq, o_ineq | 4 / 4 / 4 / 4 | 8 条 / 4 题 | pending 16，verified 0 |
| 批次 3 | `t_func` 集合与函数 | 7 | s_set, j_fun, j_quad, s_func, s_exp, s_deriv, o_func_eq | 7 / 7 / 7 / 7 | 14 条 / 7 题 | pending 28，verified 0 |
| 批次 4 | `t_trig` 三角与复数 | 5 | j_trig, s_trig, o_trig_id, s_complex, o_complex | 5 / 5 / 5 / 5 | 10 条 / 5 题 | pending 20，verified 0 |
| 批次 5 | `t_seq` 数列与归纳 | 3 | s_seq, o_induct, o_recur | 3 / 3 / 3 / 3 | 6 条 / 3 题 | pending 12，verified 0 |
| 批次 6 | `t_geo` 平面几何 | 13 | j_tri, j_cong, j_quadg, j_simi, j_circle, j_trans, o_geo_basic, o_geo_ceva, o_geo_area, o_geo_circle, o_geo_trans, o_geo_ineq, o_geo_vec | 13 / 13 / 13 / 13 | 26 条 / 13 题 | pending 52，verified 0 |
| 批次 7 | `t_solid` 立体几何与向量 | 3 | s_solid, s_vec, s_vec3 | 3 / 3 / 3 / 3 | 6 条 / 3 题 | pending 12，verified 0 |
| 批次 8 | `t_analytic` 解析几何 | 2 | s_line, s_conic | 2 / 2 / 2 / 2 | 4 条 / 2 题 | pending 8，verified 0 |
| 批次 9 | `t_num` 数论 | 6 | o_div0, o_dio, o_cong, o_dio2, o_fermat, o_numfun | 6 / 6 / 6 / 6 | 12 条 / 6 题 | pending 24，verified 0 |
| 批次 10 | `t_comb` 组合与概率统计 | 9 | o_pigeon, j_stats, j_prob, s_count, s_prob, o_binom, o_comb_adv, o_graph, o_comb_opt | 9 / 9 / 9 / 9 | 18 条 / 9 题 | pending 36，verified 0 |
| 批次 11（v2.0.0 新增） | `primary` 小学 4—6 年级思维铺垫 | 10 | p_num, p_div, p_alg, p_ratio, p_app, p_geo, p_transform, p_count, p_pigeon, p_logic | 10 / 10 / 10 / 10 | 20 条 / 10 题 | pending 40，verified 0（evidence=C） |

> 批次 11 小学段：教材版权页未提供，`source_ref` 如实标「未找到权威依据」、`evidence=C`、`review=pending`，不得声称已核对教材（`DSN-012`、`SPEC-008`）。
