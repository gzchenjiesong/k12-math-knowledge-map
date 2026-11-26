# 横屏（Landscape）实测与修复记录

- 日期：2026-11-26
- 设备：微信开发者工具模拟器，**iPhone 17 横屏**（874×276 逻辑像素，`deviceOrientation=landscape`）
- 取证方式：内置 CLI v0.3.11 `simulator_screenshot --optimize:false` 逐页截图
- 截图：`tests/evidence/simulator/LAND_*.png`

## 1. 背景：为什么用 iPhone 横屏而非 iPad 横屏

家长反馈在开发者工具里**找不到横屏切换开关**，且手机模式确实没有该按钮。经核对：

- 微信开发者工具的旋转按钮**只在 iPad 设备下出现**，且要求 `app.json` 开启 `resizable: true`（本项目已开）。手机机型不显示旋转按钮——这是工具设计，不是漏看。
- CLI 无切换设备/方向的参数（`simulator_open_page` 仅 page/query/scene）。
- 模拟器此前被重置回 iPhone 17（402×874 竖屏），非 iPad Pro 13。

为不依赖 UI 操作完成横屏验证，采用**临时配置法**：把 `app.json` 的 `window.pageOrientation` 从 `auto` 临时改为 `landscape`，`simulator_refresh` 触发重编译，模拟器即转为横屏（`windowWidth 874 × windowHeight 276`）。验证完成后**已恢复为 `auto`**（工作区干净，未入库该改动）。

> 说明：874×276 是**矮横屏**，比 iPad 横屏（约 1032×768）和 16:9 电视更极端，是对布局最严苛的检验；通过此场景后，更宽裕的屏幕只会更好。

## 2. 逐页结果（修复前）

| 页面 | 结果 | 说明 |
|---|---|---|
| 讲解首页 lecture | ✅ PASS | 导语卡/原则卡左右并排、专题两列、tabBar 正常；矮屏需滚动但布局不破 |
| 图谱 graph | ✅ PASS | 切换与统计卡正常，两列布局 |
| 卡片 cards | ✅ PASS | 三列布局生效 |
| 查漏 gaps | ✅ PASS | 小学分组标题紫色底白字可见（R22 修复在横屏同样生效） |
| 讲解详情 lesson | ✅ PASS | 导语卡完整、投屏演示入口可见，需滚动 |
| **投屏演示 present** | ❌ **FAIL** | **封面标题被底部按钮栏完全遮挡**（只露上半截），正文不可见；按钮栏独占近半屏 |

## 3. 根因

`.stage` 是 flex 列布局：`topbar` + `bar-track` + `.canvas(flex:1)` + `.controls`。在 276px 逻辑高度的矮屏下：

- `.controls` 的 `.ctl` 有 `padding: 24rpx 0` + `font-size: 36rpx`，整条约 **126rpx**；
- 顶部条与进度条再占约 60rpx；
- 剩余给 `.canvas` 的高度极小，而封面页内容（eyebrow + 60rpx 标题 + 副标题 + 简介 + bullets）远超该高度，虽 `.canvas` 可滚动，但截图落在顶部时标题被底部按钮栏压住。

## 4. 修复（`pages/present/present.wxss`）

新增**矮横屏专用媒体查询** `@media (min-width: 768px) and (max-height: 560px)`，只命中「宽屏且矮」的镜像场景，不影响 iPad 竖屏（1032×1376）与高度 >560px 的大屏横屏：

- 顶部条：padding/字号压缩（brand 26→20rpx、progress 30→24rpx、quit 24→20rpx）
- 内容区：eyebrow 30→20rpx、标题 72→42rpx、正文 38→26rpx、bullet 相关同步缩小，行距收紧
- **封面/结束页在矮屏隐藏 bullets**（本节目标等翻页可见），彻底消除被按钮栏压住的半行文字
- 按钮栏：`.ctl` padding 24→12rpx、字号 36→26rpx，整条从约 126rpx 压到约 60rpx

## 5. 修复后复验

| 检查项 | 结果 |
|---|---|
| 封面标题「代数基础与变形」完整可见、不拆孤字 | ✅ |
| 封面副标题 + 正文（line-clamp 2 行带省略号）完整显示 | ✅ |
| 底部「目录 / 上一页 / 下一页」按钮栏在屏幕内、无文字被压 | ✅ |
| 顶部进度 1/27 与退出按钮正常 | ✅ |
| 第 2 页（知识本质）：页码 2/27、小标题、节点标题、正文可见 | ✅ |
| 五条校验链 | 全绿（9/9、33/33、28/28、22/22、24/24） |

截图：`LAND_present.png`（修复前失败态）、`LAND_present_fixed2.png`（修复后封面）、`LAND_present_p2.png`（修复后正文页）。

## 6. 遗留 / 说明

- 正文页在矮屏下最后一行贴近按钮栏上沿，但 `.canvas` 是 `scroll-view`，可上滑看全文；真实 16:9 电视高度更宽裕，此取舍合理。
- 本轮只验证 iPhone 横屏（874×276）。iPad 真横屏（约 1032×768）仍建议家长在工具里切 iPad 后点旋转按钮确认一次（该按钮只在 iPad 设备下出现）。
- 内容仍为 `pending=268`、`verified=0`；机械 PASS 不代表人工签核。
