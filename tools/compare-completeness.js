#!/usr/bin/env node
/**
 * compare-completeness.js — 知识点完整性粗筛（只读，不改真源）
 *
 * 把 completeness_baseline.md 的「核心要点」与真源节点卡/教案卡的实际要点做
 * 关键词重合度比对，标出低覆盖节点（<阈值）供人工确认。
 * 注意：这是关键词粗筛，不是语义判定；低覆盖 ≠ 真缺漏，需人工逐条确认。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RD = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'tests/evidence/crosscheck');

// 解析基准：节点ID|核心要点|必备条件|高频易错
const base = fs.readFileSync(path.join(OUT, 'completeness_baseline.md'), 'utf8');
const baseline = {};
base.split('\n').forEach(line => {
  // 基准文本中绝对值符号含竖线（如 |z|²），四段正则会失配。
  // 只取 ID + 第一段「核心要点」（该段基本不含竖线），条件/易错段另行人工审查。
  const m = line.match(/^([a-z][a-z0-9_]*)\|([^|]*)/);
  if (m) baseline[m[1]] = { points: m[2], cond: '', errors: '' };
});

// 中文/符号分词：提取 2-gram 汉字 + 字母数字词，用于粗重合
function tokens(s) {
  const out = new Set();
  const han = s.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  han.forEach(seg => {
    for (let i = 0; i + 1 < seg.length; i++) out.add(seg.slice(i, i + 2));
  });
  (s.match(/[a-zA-Z][a-zA-Z0-9]{1,}/g) || []).forEach(w => out.add(w.toLowerCase()));
  (s.match(/\d+/g) || []).forEach(n => out.add(n));
  return out;
}

const rows = [];
for (const id of Object.keys(baseline).sort()) {
  const nodePath = path.join(RD, 'nodes', id + '.json');
  const lessonPath = path.join(RD, 'lessons', id + '.json');
  if (!fs.existsSync(nodePath)) { rows.push({ id, cov: -1, note: '节点卡缺失' }); continue; }
  const node = JSON.parse(fs.readFileSync(nodePath, 'utf8'));
  const lesson = fs.existsSync(lessonPath) ? JSON.parse(fs.readFileSync(lessonPath, 'utf8')) : {};
  const realText = [
    (node.points || []).join(' '),
    (node.approaches || []).join(' '),
    (node.signals || []).join(' '),
    (node.description || ''),
    (lesson.essence || ''),
    (lesson.method || []).join(' '),
    (lesson.links || '')
  ].join(' ');

  const bt = tokens(baseline[id].points);
  const rt = tokens(realText);
  let hit = 0;
  bt.forEach(t => { if (rt.has(t)) hit++; });
  const cov = bt.size ? Math.round(hit / bt.size * 100) : 100;
  rows.push({ id, cov, baseN: bt.size, hit });
}

rows.sort((a, b) => a.cov - b.cov);
console.log('基准节点数：' + Object.keys(baseline).length);
console.log('=== 低覆盖节点（关键词重合 < 55%，供人工确认）===');
rows.filter(r => r.cov >= 0 && r.cov < 55).forEach(r =>
  console.log(r.id + ' | ' + r.cov + '% | 基准词 ' + r.baseN + ' 命中 ' + r.hit));
console.log('=== 覆盖分布 ===');
const buckets = { '<40': 0, '40-54': 0, '55-69': 0, '70-84': 0, '>=85': 0, '缺卡': 0 };
rows.forEach(r => {
  if (r.cov < 0) buckets['缺卡']++;
  else if (r.cov < 40) buckets['<40']++;
  else if (r.cov < 55) buckets['40-54']++;
  else if (r.cov < 70) buckets['55-69']++;
  else if (r.cov < 85) buckets['70-84']++;
  else buckets['>=85']++;
});
console.log(JSON.stringify(buckets));

// 写机器粗筛结果
let md = ['# 知识点完整性机器粗筛（关键词重合度）', '',
  '> 粗筛不是语义判定。低覆盖可能是表述差异，需人工对照 completeness_baseline.md 与真源卡确认。', '',
  '| 节点 | 覆盖率 | 基准词数 | 命中 | 提示 |', '|---|---|---|---|---|'];
rows.forEach(r => {
  md.push('| ' + r.id + ' | ' + (r.cov < 0 ? '缺卡' : r.cov + '%') + ' | ' + (r.baseN || '—') +
    ' | ' + (r.hit === undefined ? '—' : r.hit) + ' | ' +
    (r.cov >= 0 && r.cov < 55 ? '⚠ 低覆盖，需人工确认' : (r.cov < 0 ? '节点卡缺失' : '')) + ' |');
});
fs.writeFileSync(path.join(OUT, 'completeness_coarse.md'), md.join('\n'), 'utf8');
console.log('粗筛报告：tests/evidence/crosscheck/completeness_coarse.md');
