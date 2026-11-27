#!/usr/bin/env node
'use strict';
/**
 * 已退役的历史一次性反向迁移器（SPEC-009 / RUL-010）。
 * apps/miniprogram/data 已是生成物，不可再作为可靠真源的输入；
 * 旧逻辑重读 67 节点后追加小学素材会重复 p_num，更不能重写真源、来源登记或历史快照。
 * 此入口无文件读写、无恢复/强制模式，任何参数均以 exit 2 拒绝执行。
 * 内容维护在 reliable-data 独立流程完成；应用仅运行 build-data.js 正向消费。
 */
console.error('BLOCK RETIRED_REVERSE_SEED：build-reliable-data.js 是已退役的一次性迁移器。');
console.error('禁止 apps 生成物反向覆盖 reliable-data、manifest、来源登记或历史 snapshots。');
console.error('请在独立可靠性流程维护真源；开发消费请运行 node tools/build-data.js --allow-pending。');
console.log('VERDICT=BLOCKED');
process.exitCode = 2;
