#!/usr/bin/env node
/**
 * build-data.js —— 把可靠数据源（reliable-data/）编译为小程序可读的数据模块
 *
 * 定位：下游应用层不校验内容正确性，只做格式转换与完整性检查。
 * 输入：reliable-data/{nodes,lessons,pitfalls,examples}/*.json + manifest.json
 * 输出：apps/miniprogram/data/*.js（生成物，不入库）
 *
 * 闸门：
 *   1) manifest 必须存在且 version 非空 —— 否则视为「真源未发布」，直接 BLOCKED。
 *   2) 四类卡片必须 57/57 齐全 —— 否则 BLOCKED，不产出半成品数据。
 *   3) 每条内容的 review 必须是 verified —— 否则 BLOCKED（不自证红线）。
 *      * 例外：allow-pending 参数可在开发期产出过渡数据，但输出文件头部会带显著警告。
 *
 * 运行：node tools/build-data.js [--allow-pending]
 * 输出：RESULT= / VERDICT=PASSED|BLOCKED|FAILED
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'apps/miniprogram/data');
const allowPending = process.argv.includes('--allow-pending');

function die(msg) { console.log('BLOCK ' + msg); console.log('VERDICT=BLOCKED'); process.exit(2); }

const manifestPath = path.join(SRC, 'manifest.json');
if (!fs.existsSync(manifestPath)) die('reliable-data/manifest.json 不存在：可靠数据源尚未发布，请先完成专项任务（PRM-010）。');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (e) { console.log('FAIL manifest.json 解析失败：' + e.message); console.log('VERDICT=FAILED'); process.exit(1); }
if (!manifest.version) die('manifest.version 为空：真源未标记版本。');

const DIRS = ['nodes', 'lessons', 'pitfalls', 'examples'];
const files = {};
const problems = [];
for (const d of DIRS) {
  const dir = path.join(SRC, d);
  if (!fs.existsSync(dir)) { problems.push(d + '/ 目录缺失'); continue; }
  files[d] = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (files[d].length !== 57) problems.push(d + '/ 卡片数 ' + files[d].length + ' ≠ 57');
}
if (problems.length) {
  console.log(problems.map(p => 'BLOCK ' + p).join('\n'));
  console.log('VERDICT=BLOCKED'); process.exit(2);
}

// 校验 review 状态（verified 需人工签核，AI 不得自证）
let notVerified = 0;
for (const d of DIRS) {
  for (const f of files[d]) {
    const obj = JSON.parse(fs.readFileSync(path.join(SRC, d, f), 'utf8'));
    if (obj.review !== 'verified') notVerified++;
  }
}
if (notVerified > 0 && !allowPending) {
  die('有 ' + notVerified + ' 条内容未达 verified（人工签核未完成）。确需开发期过渡数据，请加 --allow-pending。');
}

// 生成数据模块（真实映射由专项任务确定后补齐；此处提供可复现骨架）
function wrap(name, data, warning) {
  const head = '// GENERATED FILE — 由 tools/build-data.js 生成，请勿手工编辑。\n' +
    '// source=reliable-data version=' + manifest.version + '\n' +
    (warning ? '// ⚠ ' + warning + '\n' : '') +
    'module.exports = ';
  return head + JSON.stringify(data, null, 2) + ';\n';
}

fs.mkdirSync(OUT, { recursive: true });
const nodes = files.nodes.map(f => JSON.parse(fs.readFileSync(path.join(SRC, 'nodes', f), 'utf8')));
const lessons = files.lessons.map(f => JSON.parse(fs.readFileSync(path.join(SRC, 'lessons', f), 'utf8')));
const pitfalls = files.pitfalls.map(f => JSON.parse(fs.readFileSync(path.join(SRC, 'pitfalls', f), 'utf8')));
const examples = files.examples.map(f => JSON.parse(fs.readFileSync(path.join(SRC, 'examples', f), 'utf8')));
const warning = allowPending && notVerified > 0 ? '过渡数据：' + notVerified + ' 条未人工签核，禁止用于交付判断' : '';

fs.writeFileSync(path.join(OUT, 'nodes.js'), wrap('nodes', nodes, warning));
fs.writeFileSync(path.join(OUT, 'lectures.js'), wrap('lectures', lessons, warning));
fs.writeFileSync(path.join(OUT, 'pitfalls.js'), wrap('pitfalls', pitfalls, warning));
fs.writeFileSync(path.join(OUT, 'examples.js'), wrap('examples', examples, warning));
fs.writeFileSync(path.join(OUT, 'manifest.generated.json'), JSON.stringify({
  sourceVersion: manifest.version, builtAt: new Date().toISOString(), notVerified, allowPending
}, null, 2));

console.log('生成：nodes.js / lectures.js / pitfalls.js / examples.js（各 57 条）');
console.log('RESULT=4/4 FAILED=0');
console.log('VERDICT=PASSED' + (warning ? '（过渡数据，含未签核条目）' : ''));
