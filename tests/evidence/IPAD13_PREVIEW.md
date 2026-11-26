# iPad Pro 13 模拟器实测（CLI 截图取证）

- 日期：2026-11-26
- 设备：iPad Pro 13 (M4)，1032×1376，**竖屏**（`deviceOrientation: portrait`，windowWidth 1032 > 768 宽屏断点已触发）
- 工具：内置 CLI v0.3.11 `simulator_screenshot --optimize:false` + `simulator_open_page`
- 截图目录：`tests/evidence/simulator/`

## 1. 发现的 3 个问题与修复

### P1 投屏页底部按钮栏被挤出屏幕（严重）
- **现象**：`IPAD13_present.png` / `present3.png` 中只有标题和正文铺满屏幕，看不到「目录 / 上一页 / 下一页」。
- **根因**：`.canvas`（scroll-view）设 `flex:1` 但未设 `min-height:0`；flex 子项默认 `min-height:auto` 会按内容高度撑开，把 `flex-shrink:0` 的 `.controls` 顶出视口。另 `.stage` 未设 `box-sizing:border-box`，`padding-top:statusBarH` 额外撑高。
- **修复**：`.canvas { flex:1; min-height:0 }` + `.stage { box-sizing:border-box }`。
- **验证**：`IPAD13_present_fixed.png` 底部三按钮清晰可见。

### P2 投屏页封面标题拆两行 + 正文溢出（中等）
- **现象**：92rpx 标题「代数基础与变形」把「形」字挤到第二行；lead 整段正文塞满屏幕。
- **修复**：封面/结束页标题 92→60rpx + `word-break:break-all`；正文 42→34rpx + `-webkit-line-clamp:5`；bullets 文本 3 行截断；副标题 34→30rpx。常规正文 46→38rpx、bullet 42→36rpx。
- **验证**：`IPAD13_present_fixed.png` 标题单行、正文 5 行带省略号、目标文字不再被按钮栏压住。

### P3 查漏页小学分组白底白字（严重，同类遗漏）
- **现象**：`IPAD13_LANDING.png` 中「⓪小学数学思维铺垫（4—6年级）」标题白字无背景，几乎看不见。
- **根因**：`.group-head` 只定义了 `.junior/.senior/.olympiad` 三种背景，新增小学段 id=`primary` 无样式（graph 页当时修过同类问题，gaps 页漏了）。
- **修复**：补 `.group-head.primary { background:#6f52c9 }`。
- **验证**：`IPAD13_gaps_fixed.png` 小学分组紫色底白字，清晰可见。

### 附带文案修正
- 图谱页副标题「4 大来源」→「4 大学段」（来源口径已过时，现为四学段）。

## 2. 逐页验证结果（iPad Pro 13 竖屏）

| 页面 | 截图 | 结果 |
|---|---|---|
| 查漏补缺 | IPAD13_LANDING / gaps_fixed | P3 修复前白底白字 → 修复后正常 |
| 讲解首页 | IPAD13_lecture | PASS：导语+原则左右并排、专题两列、字号正常 |
| 图谱 | IPAD13_graph | PASS：四学段两列、切换 tab 正常（副标题措辞已修） |
| 教程卡片 | IPAD13_cards | PASS：三列、搜索/筛选正常 |
| 题型定位 | IPAD13_locator | PASS：单列长列表、分组卡片正常 |
| 专题讲解详情 | IPAD13_lesson | PASS：导语卡完整、「▣投屏演示」与「演示模式」入口可见、列表单列 |
| 投屏演示 | IPAD13_present / present_fixed | P1/P2 修复后 PASS |
| 节点详情 | IPAD13_node | PASS：卡片、分段 tab、关键子点正常 |

## 3. 说明与限制

- **导航栏顶部**部分截图左上角有淡色圆形头像/文字透出：为微信开发者工具模拟器自身渲染（系统返回区），非页面 bug——各页 navigationBarTitleText 均正确显示。
- **仅竖屏实测**：CLI 无切换设备/方向参数，本次设备为 iPad Pro 13 竖屏（1032px 宽已触发 768px 断点）。横屏需家长在工具里旋转设备后我再截图验证。
- 其余五链全绿：9/9、33/33、28/28、22/22、24/24。
- 内容仍 `pending=268`、`verified=0`；本轮仅 UI 布局修复，不触碰内容真实性。
