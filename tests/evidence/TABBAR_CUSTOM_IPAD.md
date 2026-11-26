# 自定义 tabBar：iPad 底栏字号适配

生成时间：2026-11-26　关联：CNF-021 / R29

## 1. 问题

微信原生 `tabBar` 的文字字号由客户端固定（约 10px 物理像素），**不随屏幕尺寸或 WXSS 变化**，也无法通过 `app.json` 配置字号。在 iPad（窗口宽 1032px）上，底部 4 个标签「讲解 / 图谱 / 题型 / 查漏」相对大屏明显偏小，可读性差。原截图 `IPAD13_lecture.png` 放大后可见字号约 10px。

## 2. 结论与方案

改用**自定义 tabBar**（基础库 2.5.0+ 支持，官方文档 `framework/ability/custom-tabbar`）：

- `app.json` 的 `tabBar` 增加 `"custom": true`，其余字段（`list` / `color` / `selectedColor` / `backgroundColor` / `borderStyle`）**完整保留**——官方要求兼容低版本与区分 tab 页，`tests/validate.js` 的 `NAV` / `TAB` 断言也依赖 `list` 原样存在。
- 新增 `apps/miniprogram/custom-tab-bar/index.{js,json,wxml,wxss}` 四件套（微信规定路径与文件名固定，不可改为 pages 下）。
- 字号用**物理 px** 显式控制（rpx 在宽屏会等比放大，达不到"按设备分档"的目的）：
  - 基础（手机）：`font-size: 12px`，tabBar 高 50px；
  - `@media (min-width: 768px)`（iPad 横竖屏 / 手机横屏 / PC）：`font-size: 16px`，tabBar 高 66px。
- 选中态：官方规定每个 tab 页持有独立 tabBar 组件实例，须逐页 `getTabBar().setData({selected})`。封装 `utils/tabbar.js` 的 `setSelected(page, index)`，四个 tab 页在 `onShow` 分别传 0/1/2/3。
- 跳转仍用 `wx.switchTab`（`data-path` 从组件 `list` 读取，与 `app.json` 的 `list` 一一对应）。

## 3. 实测验证（微信开发者工具 CLI，iPad 13" 模拟器）

| 检查项 | 结果 |
|---|---|
| 窗口宽度 | 1032px → 命中 768px 断点，字号 16px |
| 运行时 tabBar 实例 | `hasBar: true`（自定义组件已挂载） |
| 讲解页选中态 | `selected: 0`，「讲解」蓝色胶囊高亮 |
| 图谱页选中态 | `selected: 1`，高亮从「讲解」切到「图谱」 |
| 字号观感 | 由约 10px 提升到 16px，清晰可读、无截断 |
| 布局 | 高度 66px 含安全区，未遮挡页面内容 |

证据图：`tests/evidence/simulator/TABBAR_lecture_ipad.jpg`、`TABBAR_graph_ipad.jpg`。

## 4. 边界与后续

- 低版本基础库（< 2.5.0）会回退到原生 tabBar 渲染（字号仍是小的），但功能不受影响；本项目面向微信近期版本，未做额外兼容。
- 手机竖屏走 12px 基础档，与原生观感接近，不会因宽屏放大而过大。
- `wx.setTabBarItem` 等 tabBar 样式类接口在自定义模式下失效——本项目未使用。
- 本次为审核期的功能改动：后台审核中的包为改动前版本，若需随首版上线须重传开发版（家长决策，工具不代劳）。内容仍 `pending=268/verified=0`。

## 5. 关联改动

- README 演示截图同步：投屏演示图从旧版 `IPAD13_present.png` 换为新版 16:9 PPT 实拍（从 `PPT16x9_*.jpg` 裁去上下黑边，得 888×499 纯画布 `README_present_{cover,essence,answer}.jpg`），README 由 4 图扩为 6 图。
- **补充（R30）**：README 首屏 3 张 iPad 图（`IPAD13_lecture.png` / `IPAD13_lesson.png` / `IPAD13_graph.png`）此前仍是旧原生 tabBar 小字样式；在自定义 tabBar 生效后重截覆盖同名文件——首页「讲解」、图谱页「图谱」均显示蓝色胶囊高亮新样式，详情页用 `id=t_alg`（代数基础与变形）重截、内容完整。README 引用路径不变，GitHub 页面在推送后自动更新为新样式。
