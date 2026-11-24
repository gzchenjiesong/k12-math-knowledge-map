#!/usr/bin/env node
/**
 * render-html.js —— 把可靠数据源渲染为 HTML 人读视图（views/）
 *
 * 定位：HTML 是生成物，供家长/老师对照讲义人工签核用；不入库、不可手工编辑。
 * 输入：reliable-data/*.json
 * 输出：views/*.html
 *
 * 运行：node tools/render-html.js
 * 输出：RESULT= / VERDICT=PASSED|BLOCKED|FAILED
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'views');
const manifestPath = path.join(SRC, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.log('BLOCK 真源未发布（manifest 缺失）；先执行专项任务 PRM-010。');
  console.log('VERDICT=BLOCKED'); process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const types = [
  { dir: 'nodes', label: '知识点' },
  { dir: 'lessons', label: '授课教案' },
  { dir: 'pitfalls', label: '易错考点' },
  { dir: 'examples', label: '真题示范' }
];
let count = 0;
fs.mkdirSync(OUT, { recursive: true });

for (const t of types) {
  const dir = path.join(SRC, t.dir);
  if (!fs.existsSync(dir)) continue;
  const items = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => {
    const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const body = Object.keys(o).filter(k => k !== 'review' && k !== 'evidence' && k !== 'source_ref')
      .map(k => '<section><h3>' + esc(k) + '</h3><pre>' + esc(typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k], null, 2)) + '</pre></section>').join('');
    const meta = '<div class="meta">复核状态：' + esc(o.review || 'pending') +
      ' ｜ 证据等级：' + esc(o.evidence || '-') +
      ' ｜ 依据锚点：' + esc(o.source_ref || '未找到权威依据') + '</div>';
    return '<article><h2>' + esc(o.title || o.nodeId || f) + '</h2>' + meta + body + '</article>';
  }).join('\n');
  const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">' +
    '<title>' + esc(t.label) + ' · 人读视图</title>' +
    '<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1f2d3d}' +
    'article{border-bottom:1px solid #e3e8ef;padding:16px 0}section{margin:8px 0}h3{margin:4px 0;color:#1f6feb}' +
    'pre{white-space:pre-wrap;background:#f5f7fa;padding:8px;border-radius:6px}.meta{color:#8a94a6;font-size:13px}' +
    '.warn{background:#fff4e5;padding:10px;border-radius:6px}</style></head><body>' +
    '<div class="warn">此页由 tools/render-html.js 生成，请勿手工编辑。真源版本：' + esc(manifest.version) + '</div>' +
    '<h1>' + esc(t.label) + '（' + (items ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).length : 0) + ' 条）</h1>' +
    items + '</body></html>\n';
  const outFile = path.join(OUT, t.dir + '.html');
  fs.writeFileSync(outFile, html);
  count++;
  console.log('渲染 ' + path.relative(ROOT, outFile));
}
console.log('RESULT=' + count + '/' + types.length + ' FAILED=' + (types.length - count));
console.log('VERDICT=' + (count === types.length ? 'PASSED' : 'FAILED'));
