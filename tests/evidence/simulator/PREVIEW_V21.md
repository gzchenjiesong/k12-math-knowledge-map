# v2.1.0 微信开发者工具预览验证记录

日期：2026-11-25
工程：`D:/GitHub/k12-math-knowledge-map/apps/miniprogram`（appid `wxad6ce16e02f3b1fe`）
环境：微信开发者工具 2.02.2609250；wechatide-skill 0.3.11；登录态有效，`versionRelation=equal`，`cliTokenRequired=false`

## 结论

模拟器预览通过：小学段 `t_primary` 在图谱页（来源视图 / 主题视图）与授课页（列表 / 详情）均正常显示。
过程中发现并修复 4 类显示问题，修复后重新编译、重新截图、五条校验链全绿。控制台无 error（仅启动期 Perf 提示）。

## 验证矩阵

| 场景 | 观测结果 | 判定 |
|---|---|---|
| 图谱页 · 按来源 | `4 大来源 · 67 个知识点`；置顶「⓪ 小学数学思维铺垫（4—6 年级）」紫色底色、白字清晰 | PASS |
| 图谱页 · 按主题 | `11 大主题 · 67 个知识点`；首主题 `t_primary` 默认展开，`0/10`，10 个节点均带「小学」标签、紫色左边框 | PASS |
| 授课页 · 专题列表 | `67 个知识点`；`11 大专题 · 点击开始授课`；首卡「小学数学思维铺垫」`0/10` | PASS |
| 授课页 · `?id=t_primary` 详情 | 标题/学习目标/知识链正常；首节点 `p_num` 六段式（本质/方法/例题/易错/链接/自检）完整；证据 `evidence=C`、`review=pending` | PASS |
| 控制台 | `grep -i error` 返回空 | PASS |
| 真机预览 | `create_preview_qrcode --qr-format window` 成功，二维码已在 IDE 窗口生成（pack 总大小 275543 B） | 已生成，待扫码 |

## 修复项（模拟器预览发现）

1. `apps/miniprogram/pages/graph/graph.wxss`：新增 `.domain-head.primary` 渐变底色（原 `.domain-head` 白字无底色，小学条目白底白字不可读）；新增 `.src-primary` 标签配色；新增 `.theme-head.tone11`。
2. `reliable-data/source/app_organization.json`：`t_primary.tone` 由 `tone6` 改为 `tone11`，避免与 `t_geo` 同色；重新生成 `apps/miniprogram/data/themes.js`。
3. `apps/miniprogram/pages/graph/graph.wxml`：硬编码「三大来源 / 十大主题 / 初中高中奥赛」改为按 `domains.length` / `themes.length` 动态显示，标签补「小学」。
4. `apps/miniprogram/pages/lecture/lecture.wxml`：硬编码「57 个知识点 / 十大专题」改为 `stat.total` / `lectures.length`；`pages/cards/cards.js` 来源排序纳入 `primary`（小学→初中→高中→奥赛）。

## 证据

- 修复前：`graph-source-v21.jpg`（小学领域白底白字）
- 修复后：`graph-source-fixed.jpg`、`graph-theme-fixed.jpg`、`lecture-primary-fixed.jpg`、`lesson-primary-fixed.jpg`
- 五链：`tests/evidence/{CHECK_DATA,RELIABLE_EXTRA,VALIDATION,CONTENT_VERIFY,APP_BUILD}_V21.log`（均已刷新，全绿）

## 遗留（非阻塞）

- 授课详情页节点来源标签显示「① 小学数学思维铺垫」，图谱页领域名为「⓪ 小学数学思维铺垫」。该字段来自真源 v2.1.0，改动会触发 10 张节点卡哈希变化并打破 E8c「相对 v2.0.0 恰好 36 卡变化」的发行约束，建议留到下一个补丁版本统一处理。
- 全部 268 卡仍 `pending`、`verified=0`；机械校验通过 ≠ 内容已人工核准。
