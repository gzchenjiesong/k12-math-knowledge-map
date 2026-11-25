# 小程序代码上传记录 v1.0.0

## 上传事实

| 项 | 值 |
|---|---|
| 上传时间 | 2026-11-25 |
| 工具 | 微信开发者工具 CLI（`wechatide -c WorkBuddy upload`） |
| 工程 | `apps/miniprogram` |
| appid | `wxad6ce16e02f3b1fe` |
| 上传版本号 | `1.0.0` |
| 版本备注 | 数学阶梯首个版本：67知识点四类卡+小学段，图谱/授课/题型/查漏四视图 |
| 代码包大小 | 277,403 字节（约 271 KB） |
| 结果 | `success: true`（生成开发版本，尚未提交审核、未发布） |
| 登录主体 | 陈介松（check_wechatide_status：loginExpired=false，skillVersion=0.3.11，versionRelation=equal） |

## 上传前核对

- 五条校验链全绿：`check-data` 9/9、`check-reliable-extra` 33/33、`validate` 28/28、`verify_content` 22/22、`check-app-build` 18/18。
- 模拟器四场景 PASS（图谱来源/主题、授课列表/详情），console 无 error（见 `tests/evidence/simulator/PREVIEW_V21.md`）。
- 工作区干净，上传基于 `origin/main` 最新提交 `052ee60`。
- 代码包内名称核对：`app.json` 全局标题、`app.js` globalData.appName、`project.config.json` description 均为「数学阶梯」，四个 tab 与页面标题无「奥数知识」旧名残留。

## 关于名称审批期间上传

- 上传的是**开发版本**，不进入发布链路，不受账号名称审核状态影响：后台账号名（待审批生效）与代码包内界面标题（已是「数学阶梯」）是两个独立字段。
- 因此名称审批通过后**无需重新上传**，本开发版本可直接用于后续提交审核。
- 备案仍按 CNF-017 的「先名称生效、后备案」顺序执行；上传代码与备案并行，二者无依赖。

## 后续步骤（均须管理员在后台操作）

1. 等待名称/简介/头像审批生效、完成备案（CNF-017）。
2. 公众平台 → 版本管理 → 开发版本 `1.0.0` → 提交审核（填功能页面、用户隐私保护指引、版本说明）。
3. 审核通过后**手动点发布**，不会自动上线。

## 状态声明

上传的仍是开发过渡数据：268 张卡全部 `review=pending`、`verified=0`，人工签核闸门 VFY-005/006 未解锁；机械校验全绿不代表内容已人工核准（SPEC-008）。
