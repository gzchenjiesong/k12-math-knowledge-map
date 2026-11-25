# 可靠数据源变更记录

> 只增不减、不覆盖历史；每次版本变更追加一节。

## v2.1.0 · 2026-11-25 · 内容修正 / 扩写 / 补漏（交叉校验驱动）

- 触发：`reliable-data/index/CROSS_CHECK_V1.md` 四路径异源交叉校验发现；家长决定内容产出不受教材扫描页影响，该改即改。
- 性质：全部修改依据**数学公共知识 / 标准定理**（B/C 级），不冒充教材核对、不复制付费教材原文（SPEC-004）；改写内容仍 `review=pending`（SPEC-008）。
- CC-F01 `s_conic`：原题"与椭圆交于两点求弦长"未给椭圆方程、无定值 → 改为椭圆 x²/4+y²=1 与直线 y=x+1，明确结论弦长 8√2/5；补 Δ>0 与弦长公式条件。
- CC-F02 `j_trans`：原题将军饮马无坐标、无数值 → 改为 A(0,2)、B(4,3) 求 x 轴上 P，明确结论最小值 √41、P(8/5,0)；补同侧/异侧条件。
- CC-F03 / 完整性补漏：9 节点扩写进阶要点与方法，含 o_binom（范德蒙德/生成函数）、o_poly（有理根定理/插值）、o_graph（欧拉vs哈密顿/二部图）、o_comb_opt（调整法/整数离散）、s_complex（欧拉公式/三角形式）、p_div（最大公因数/最小公倍数）、p_ratio（比例性质/百分数应用）。
- 可追溯：被修改节点的卡 `version=2.1.0` 标记，其余未修改卡与 v2.0.0 逐字节一致；补丁源 `reliable-data/source/patches_v2_1_0.js`；v2.0.0 快照见 `reliable-data/snapshots/v2.0.0/`。
- 修改节点：j_trans、o_binom、o_comb_opt、o_graph、o_poly、p_div、p_ratio、s_complex、s_conic。
- 未解决：人工签核闸门 `VFY-005` / `VFY-006` 仍阻塞，`verified=0`；教材扫描页属于独立校验项目，不阻塞本版本内容产出。

## v2.0.0 · 2026-11-25 · 四段体系扩展（小学段接入）

- 产物：四类卡各 67（知识点 / 教案 / 易错 / 示范），共 268 张卡；其中 v1.0.0 的 228 卡 ID、字段与 SHA-256 **逐字节冻结不变**，快照见 `reliable-data/snapshots/v1.0.0/`。
- 新增：小学 4—6 年级思维铺垫 10 节点（`p_` 前缀）及四类卡 40 张，素材 `reliable-data/source/primary_nodes.js`。
- 零破坏：五个 `o_` 衔接节点 ID 与卡字段冻结；逻辑归属与 `p_` → `o_` 衔接边写入独立 `reliable-data/index/bridges.json`，不回写旧卡（`DSN-012`）。
- 证据：小学段教材版权页未提供，10 节点全部 `source_ref=未找到权威依据`、`evidence=C`、`review=pending`；不得声称已核对教材（`SPEC-008`）。
- 规格：`SPEC-002` 改为分层基线，`CNF-001` 增小学层，新增 `CNF-014` / `DSN-012`；校验脚本去硬编码 57 改动态取基线。
- 未解决：人工签核闸门 `VFY-005` / `VFY-006` 仍阻塞，`verified=0`；教材 PDF 家长下载中，版权页待补。

## v1.0.0 · 2026-11-24 · 首次发布

- 产物：知识点卡 57 / 授课教案卡 57 / 易错考点卡 57（114 条）/ 示范卡 57（57 题），共 228 张卡。
- 字段：按 `CNF-005` 六段式与任务字段规格落卡；JSON Schema 见 `reliable-data/schema/`。
- 依据：`reliable-data/evidence/SOURCES.json` 共 8 条锚点；本地 `resource_data/` 无原件，A/B 类均标 `MISSING_LOCAL_COPY`。
- 复核：全部 228 张卡 `review=pending`、`verified=0`；AI 不自证（`SPEC-008`）。
- 闸门：`node tests/check-data.js` 结果见 `tests/evidence/CHECK_DATA_V1.log`。
- 差异声明：旧侧 `R2_CHECKED` 15 条含 1 条重复，去重为 14 个节点（43 pending），与任务描述 15/42 不一致，已在差距矩阵如实标注。
- 未解决：人工签核闸门 `VFY-005` 为 `BLOCKED_NO_EVIDENCE`；SHA-256 一致性与 `UNCOVERED` 由 `tests/check-reliable-extra.js` 独立声明。
