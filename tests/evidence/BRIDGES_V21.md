# 跨学段衔接关系可视化 · 实现与验证记录

生成时间：2026-11-26　适用版本：v2.1.0（数据）/ 小程序图谱页按主题视图

## 1. 背景与定位

`reliable-data/index/bridges.json` 是 v2.1.0 零破坏设计里衔接边的**唯一声明处**（DSN-012），共 12 条「铺垫→课标 / 竞赛衔接 / 奥赛」边。此前仅存在于数据层，图谱页未消费——主题视图只是分组列表，不展示节点间关系。本次把衔接边接入 app 数据与图谱页，让主题视图真正呈现「小学如何铺垫到进阶」。

**零破坏约束**：衔接边不回写真源卡字段，228 卡哈希冻结不变（DSN-012）；旧 ID、来源视图、主题视图既有结构均不改。

## 2. 数据层改动

- `tools/build-data.js`：新增从 `reliable-data/index/bridges.json` 编译 `apps/miniprogram/data/bridges.js`（第 7 个生成模块）。
  - `BRIDGES`：12 条边，保留 from/to/kind 原字段，富化 fromName/toName/fromDomain/toDomain/fromTheme/toTheme 供页面直接渲染。
  - `BRIDGES_BY_NODE`：节点 → `{out:[], in:[]}` 反向索引。
  - `BRIDGE_STATS`：`{total:12, byKind:{'铺垫→课标':7,'铺垫→竞赛衔接':4,'铺垫→奥赛':1}}`。
  - 新增结构闸门：衔接边两端节点必须在真源内。
- `tests/check-app-build.js`：新增 G7（4 项），核对 BRIDGES 的 from/to/kind 逐条等于 bridges.json、富化字段一致、反向索引正确、端点无悬空；模块头校验由 6 个扩到 7 个。
- `tests/validate.js`：必需文件清单加入 `data/bridges.js`。

## 3. 页面层改动（apps/miniprogram/pages/graph/）

- `graph.js`：引入 bridges 模块；buildTree 为每个主题节点计算 `bridgeCount`（参与衔接边数）；按固定顺序（课标→竞赛衔接→奥赛）预分组 `bridgeGroups`，避免在 wxml 中写数组字面量与嵌套 wx:if/wx:for。
- `graph.wxml`：主题视图顶部新增可折叠「跨学段衔接链」卡片，按类型分组显示 12 条边（起点→终点，标小学/进阶），任一端点可点击跳节点详情；参与衔接的节点显示 `⇢N` 徽标；提示文案同步更新。
- `graph.wxss`：新增衔接卡片 / 分组 / 行 / 节点 / 徽标样式，浅底深字，与现有主题视图风格一致。

## 4. 数据核对

| 项 | 结果 |
|---|---|
| BRIDGES 条数 | 12（课标 7 / 竞赛衔接 4 / 奥赛 1） |
| 参与衔接节点 | 20 / 67 |
| 小学起点边 | 12（全部边均从小学段出发） |
| 分组总数 | 12 = BRIDGES 总数，无遗漏 |
| 反向索引 | out/in 由边正确派生（G7 断言） |
| 端点悬空 | 0 |

## 5. 校验链

| 脚本 | 结果 |
|---|---|
| check-data | 9/9 PASSED |
| check-reliable-extra | 33/33 PASSED |
| validate | 28/28 PASSED |
| verify_content | 22/22 PASSED |
| check-app-build | 24/24 PASSED（原 18/18，G7 增 6 项） |

**诚实边界**：机械校验 PASS 不等于内容正确；268 卡仍 `review=pending`、`verified=0`，人工签核闸门未解锁（SPEC-008）。衔接边为组织层关系声明，不含数学讲解内容。

## 6. 待人工确认

- 模拟器截图验证：本次改动为数据驱动渲染，已做静态数据核对 + wxml/js 一致性核对；如需可视化截图，请在微信开发者工具中打开图谱页 → 按主题 → 展开「跨学段衔接链」核验（CLI 未加入本次会话工具链，未自动截图）。
