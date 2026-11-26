# RESPONSIVE_V21：L1 横屏适配 + L2 演示模式验证记录

> 日期：2026-11-26
> 来源：`docs/RESEARCH-SCREEN.md` 调研结论，家长拍板「L1 + L2 一起做，手机也开 auto」
> 性质：纯布局/交互改动，不触碰真源、数据契约与内容状态

## 1. 改动清单

### 1.1 全局开关（`app.json`）

```json
"window": { ..., "pageOrientation": "auto" },
"resizable": true
```

- `resizable: true` → iPad 屏幕旋转 + PC/Mac 大屏模式（基础库 2.3.0 / 2.21.3+）。
- `pageOrientation: auto` → 手机跟随系统旋转（2.4.0+）。
- 两者叠加：手机 / iPad / PC 三种形态共用一套断点，不再锁定竖屏。

### 1.2 断点基类（`app.wxss`）

- 新增 `@media (min-width: 768px)`：`.page` 限宽 `1180px` 居中，`.card` padding/radius 改 px，通用文字类回到物理尺寸。
- 关键取舍：不用 `page .card` 提高权重，避免压过页面内 `.pt { padding: 0 }` 等特例。
- 断点命中：手机竖屏 375–430px 不命中；手机横屏 812–932px、iPad 竖/横 768–1194px、PC 大屏均命中。

### 1.3 重点页多栏

| 页面 | 宽屏布局 | 新增容器 |
|---|---|---|
| 讲解首页 `lecture` | 导语与三步原则并排（1.1fr / 0.9fr）；专题卡两列 | `.top-grid`、`.lec-grid` |
| 知识图谱 `graph` | 来源视图领域卡两列；主题视图主题卡两列；衔接链保持通栏 | 两处 `.list-grid` |
| 教程卡片 `cards` | 卡片三列网格 | `.card-list` |
| 讲解详情 `lesson` | 展开正文两列（证据条/操作区通栏） | 无（`.pt-body` 直接 grid） |

### 1.4 其余页兜底

`gaps` / `node` / `locator` 仅加宽屏字号断点。因为 `resizable` 在 iPad 上是全局开关，任何页面都必须横屏不破版。

### 1.5 L2 演示模式（`lesson` 详情页）

选择详情页而非 tab 首页的原因：它是 `navigateTo` 打开的，**天然没有 tabBar**，投影时无底部导航干扰。

- `data` 新增 `wide` / `demo` / `focusIdx`；`onLoad` 用 `wx.getWindowInfo`（带 `getSystemInfoSync` 回退）初始化 `wide`；`onResize` 监听尺寸变化，**缩回窄屏自动退出演示模式**，避免隐藏的知识点不可见。
- 宽屏时导语卡内出现「演示模式」按钮；进入后：
  - 自动聚焦第一个未掌握知识点（全部掌握则聚焦第一个）；
  - 只显示聚焦卡（其余 `.pt-dim` 隐藏），导语精简（隐藏 lead/goal/chain）；
  - 正文放大到 18px / 行高 1.85，标题 26–34px，适配电视观看距离；
  - 提供「‹ 上一个 / 下一个 ›」与 `n / total` 指示，一次只展开一个知识点。
- `demoMove()` 边界收敛到 `[0, points.length-1]`，不会越界。

## 2. 验证结果

### 2.1 静态校验（本次执行）

| 检查 | 结果 |
|---|---|
| `app.json` 解析 | OK：`resizable=true`、`pageOrientation=auto`、7 页 |
| `lesson.js` 语法（`node --check`） | OK |
| WXML 标签配对（view/text/block） | lecture 19/19、19/19；graph 48/48、43/43；cards 11/11、9/9；lesson 39/39、47/47、block 1/1，**全 OK** |
| `@media (min-width: 768px)` 覆盖 | app.wxss + 7 个页面 wxss，**8/8 全部存在** |

### 2.2 五条校验链

```
check-data           RESULT=9/9  FAILED=0
check-reliable-extra RESULT=33/33 FAILED=0
validate             RESULT=28/28 FAILED=0
verify_content       RESULT=22/22 FAILED=0
check-app-build      RESULT=24/24 FAILED=0
```

### 2.3 内容真实性状态

未改动任何真源卡：仍为 `pending=268`、`verified=0`。机械 PASS 不代表人工签核。

## 3. 未验证项（如实记录）

- **未做微信开发者工具模拟器 / 真机横屏截图**：本次 CLI 未接入工具链，仅完成配置解析、JS 语法、WXML 配对与 CSS 断点静态核对。
- 建议家长在以下三种形态各看一眼：手机竖屏（确认未命中断点、布局无回归）、手机横屏、iPad 横屏；再进入任一专题详情页点「演示模式」翻两页。
- A3 挂图与 HTML 交付物未随本轮改动；`deliverables/olympiad-knowledge-map.html` 仍是 v1「初中→高中→奥赛」老口径（L3 大屏演示页待定）。

## 4. 发布注意

`1.0.0` 正在审核中。本轮代码改动不会进入已提交的审核版本；若希望随首版发布，需在审核通过后**重新上传新版本**（或作为下一版本发布）。后台账号介绍由家长审批结束后人工修改。
