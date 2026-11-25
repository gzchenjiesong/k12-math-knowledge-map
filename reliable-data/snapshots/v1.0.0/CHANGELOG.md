# 可靠数据源变更记录

> 只增不减、不覆盖历史；每次版本变更追加一节。

## v1.0.0 · 2026-11-24 · 首次发布

- 产物：知识点卡 57 / 授课教案卡 57 / 易错考点卡 57（114 条）/ 示范卡 57（57 题），共 228 张卡。
- 字段：按 `CNF-005` 六段式与任务字段规格落卡；JSON Schema 见 `reliable-data/schema/`。
- 依据：`reliable-data/evidence/SOURCES.json` 共 8 条锚点；本地 `resource_data/` 无原件，A/B 类均标 `MISSING_LOCAL_COPY`。
- 复核：全部 228 张卡 `review=pending`、`verified=0`；AI 不自证（`SPEC-008`）。
- 闸门：`node tests/check-data.js` 结果见 `tests/evidence/CHECK_DATA_V1.log`。
- 差异声明：旧侧 `R2_CHECKED` 15 条含 1 条重复，去重为 14 个节点（43 pending），与任务描述 15/42 不一致，已在差距矩阵如实标注。
- 未解决：人工签核闸门 `VFY-005` 为 `BLOCKED_NO_EVIDENCE`；SHA-256 一致性与 `UNCOVERED` 由 `tests/check-reliable-extra.js` 独立声明。
