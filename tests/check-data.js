#!/usr/bin/env node
/**
 * check-data.js —— 可靠数据源出口闸门（独立于小程序数据校验）
 *
 * 定位：validate.js 校验文档与程序结构；本脚本只在数据源出口校验「发布资格」。
 * 检查项：
 *   D1 manifest 存在且版本非空
 *   D2 四类卡片各 N 份（N 由 manifest.domainBaseline.total 动态取，v1=57 / v2=67）
 *   D3 每条卡必备字段齐全（nodeId/title/review/evidence/source_ref）
 *   D4 review 只能取四态之一；verified 必须有 reviewer + date（不自证红线）
 *   D5 evidence 只能取 A/B/C
 *
 * 运行：node tests/check-data.js
 * 输出：RESULT= / VERDICT=PASSED|FAILED|BLOCKED
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
let pass = 0, fail = 0;
function say(ok, msg) { console.log((ok ? 'OK   ' : 'FAIL ') + msg); ok ? pass++ : fail++; }
function blocked(msg) { console.log('BLOCK ' + msg); console.log('VERDICT=BLOCKED'); process.exit(2); }

const mp = path.join(SRC, 'manifest.json');
if (!fs.existsSync(mp)) blocked('manifest.json 缺失：真源尚未发布，无可检查对象。');
let mf;
try { mf = JSON.parse(fs.readFileSync(mp, 'utf8')); }
catch (e) { console.log('FAIL manifest 解析失败：' + e.message); console.log('VERDICT=FAILED'); process.exit(1); }
say(!!mf.version, 'D1 manifest.version 非空（' + (mf.version || '空') + '）');

// 基线动态取值：v2.0.0 起从 manifest.domainBaseline.total 读取（分层 67）；旧版回退 counts.nodes
const BASE_N = (mf.domainBaseline && mf.domainBaseline.total) || mf.counts.nodes || 57;
const kinds = ['nodes', 'lessons', 'pitfalls', 'examples'];
const all = {};
for (const k of kinds) {
  const d = path.join(SRC, k);
  if (!fs.existsSync(d)) { say(false, 'D2 ' + k + '/ 目录缺失'); continue; }
  const fs_ = fs.readdirSync(d).filter(f => f.endsWith('.json'));
  say(fs_.length === BASE_N, 'D2 ' + k + ' 卡片数 = ' + BASE_N + '（实际 ' + fs_.length + '）');
  all[k] = fs_.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); }
    catch (e) { say(false, 'D2 ' + k + '/' + f + ' 解析失败'); return null; }
  }).filter(Boolean);
}

const REVIEWS = ['pending', 'checked', 'verified', 'disputed'];
let fieldBad = 0, reviewBad = 0, signBad = 0, evBad = 0;
for (const k of kinds) {
  for (const o of (all[k] || [])) {
    const miss = ['nodeId', 'title', 'review', 'evidence', 'source_ref'].filter(x => !o[x]);
    if (miss.length) fieldBad++;
    if (REVIEWS.indexOf(o.review) < 0) reviewBad++;
    if (o.review === 'verified' && (!o.reviewer || !o.date)) signBad++;
    if (['A', 'B', 'C'].indexOf(o.evidence) < 0) evBad++;
  }
}
say(fieldBad === 0, 'D3 必备字段齐全（缺失条目 ' + fieldBad + '）');
say(reviewBad === 0, 'D4a review 取值合法（异常 ' + reviewBad + '）');
say(signBad === 0, 'D4b verified 均有 reviewer + date（缺失签字 ' + signBad + '）');
say(evBad === 0, 'D5 evidence 取值合法（异常 ' + evBad + '）');

console.log('---');
console.log('RESULT=' + pass + '/' + (pass + fail) + ' FAILED=' + fail);
console.log('VERDICT=' + (fail === 0 ? 'PASSED' : 'FAILED'));
console.log('注意：本脚本只检查结构，不证明数学内容正确；功能交付与内容核验分开，现行边界见 SPEC-009 / RUL-010。');
process.exit(fail ? 1 : 0);
