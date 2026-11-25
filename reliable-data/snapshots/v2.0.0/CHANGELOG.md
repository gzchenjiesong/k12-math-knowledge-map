# 可靠数据源变更记录

> 只增不减、不覆盖历史；每次版本变更追加一节。

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
