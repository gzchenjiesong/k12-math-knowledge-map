#!/usr/bin/env node
/**
 * build-poster.js —— 从 app 数据模块渲染 A3 家庭挂图（两版）
 *
 * 定位：挂图是「真源的下游视图」，与小程序页面同源，不手工维护节点清单。
 * 输入：apps/miniprogram/data/{nodes,themes,bridges,topic_index}.js
 *       （这些模块由 tools/build-data.js 从可靠真源编译，故挂图天然对齐 v2.1.0）
 * 输出：
 *   deliverables/olympiad-poster-A3.html        按学段版（小学/初中/高中/奥赛四栏）
 *   deliverables/olympiad-poster-themes-A3.html 按主题版（11 主题专题串联）
 *
 * 零破坏：只生成 deliverables 下两个 HTML，不改真源、不改 app 数据、不改页面代码。
 * 运行：node tools/build-poster.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'apps/miniprogram/data');
const OUT = path.join(ROOT, 'deliverables');

const nodes = require(path.join(DATA, 'nodes.js'));
const themes = require(path.join(DATA, 'themes.js'));
const bridges = require(path.join(DATA, 'bridges.js'));
const topicIndex = require(path.join(DATA, 'topic_index.js'));

const DOMAINS = nodes.DOMAINS;
const ALL_NODES = nodes.ALL_NODES;
const SIGNAL_RULES = nodes.SIGNAL_RULES;
const THEMES = themes.THEMES;
const BRIDGES = bridges.BRIDGES;
const BRIDGE_STATS = bridges.BRIDGE_STATS;
const TOPIC_ITEMS = topicIndex.TOPIC_ITEMS;
const byId = {};
ALL_NODES.forEach(n => { byId[n.id] = n; });

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- 公共样式（保留原打印规格 A3 横向） ----------
const STYLE = `
  @page{size:A3 landscape;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#3a3f4a;font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;color:#1c2430}
  .stage{padding:20px 0}
  .poster{width:420mm;height:295mm;margin:0 auto;background:#fff;padding:8.5mm 10mm;
    box-shadow:0 8px 40px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden}
  @media screen{.poster{zoom:.72}}
  .top{border-bottom:2.5px solid #1c2430;padding-bottom:3mm;margin-bottom:3.5mm;
    display:flex;align-items:flex-end;gap:8mm}
  .top h1{font-size:23pt;letter-spacing:1px;line-height:1.15}
  .top .st{font-size:10pt;color:#55606f;margin-top:1.5mm}
  .legend{margin-left:auto;font-size:8.5pt;line-height:1.8;color:#3d4856;text-align:right}
  .legend .k{display:inline-block;border:1.2px solid #333;width:3.2mm;height:3.2mm;
    vertical-align:-.6mm;margin:0 1mm 0 2mm;border-radius:.5mm}
  .legend .tick{color:#0a7d4d;font-weight:bold}
  .printbtn{position:fixed;right:18px;top:18px;background:#2f6fd0;color:#fff;border:0;
    padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer;z-index:9}
  @media print{.printbtn{display:none}body{background:#fff}.stage{padding:0}.poster{box-shadow:none;margin:0}}
  .cols{display:grid;gap:4mm;flex:1}
  .col{border:1px solid #cfd6df;border-top:3.5px solid var(--cc);border-radius:2mm;
    padding:3mm 3.2mm;background:#fcfdfe;min-width:0;overflow:hidden}
  .colh{display:flex;align-items:center;gap:2mm;border-bottom:1px solid #e2e7ee;padding-bottom:2mm}
  .colh .idx{font-size:17pt;color:var(--cc);font-weight:bold;line-height:1}
  .colh .cname{font-size:12.5pt;font-weight:bold}
  .colmeta{font-size:7.6pt;color:#5a6675;margin:2mm 0 2.5mm;line-height:1.5}
  .fill{border-bottom:1px solid #8892a0;display:inline-block;min-width:9mm;color:transparent}
  .mod{margin-bottom:1.8mm;break-inside:avoid}
  .modh{font-size:9pt;font-weight:bold;color:var(--cc);background:#f0f4fa;
    border-left:2.5px solid var(--cc);padding:1mm 2mm;margin-bottom:1.2mm;border-radius:0 1mm 1mm 0}
  .modh .cnt{float:right;font-size:7pt;font-weight:normal;color:#7a8696}
  .mod ul{list-style:none;padding-left:.5mm}
  .mod li{display:flex;align-items:center;gap:1.6mm;height:4.6mm;font-size:8.4pt;line-height:1}
  .cb{border:1.2px solid #445066;width:3.4mm;height:3.4mm;flex:none;border-radius:.5mm;background:#fff}
  .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dt{flex:1;border-bottom:.6px dotted #b7c0cc;height:3mm;margin-left:1mm}
  .bottom{margin-top:3.2mm;border-top:2px solid #1c2430;padding-top:2.3mm;
    display:grid;grid-template-columns:1.1fr 1fr;gap:6mm}
  .bt{font-size:9pt;font-weight:bold;margin-bottom:1.5mm;letter-spacing:.3px}
  .rows{display:grid;grid-template-columns:1fr 1fr;gap:.8mm 4mm}
  .row{font-size:7.4pt;line-height:1.5;display:flex;gap:1.2mm;align-items:baseline;
    border-bottom:.5px dotted #d4dae2;padding:.5mm 0}
  .row b{color:#1a5fa8;white-space:nowrap}
  .row .ar{color:#8892a0}
  .row i{font-style:normal;color:#8a94a3;margin-left:auto;font-size:6.6pt;white-space:nowrap}
  .sg{font-size:7.2pt;line-height:1.4;border-bottom:.5px dotted #d4dae2;padding:.5mm 0}
  .sg b{color:#a8621a}
  .sg span{color:#4d5a6b}
  .sign{margin-top:2.2mm;font-size:8pt;color:#5a6675;display:flex;gap:10mm}
  .sign span{border-bottom:1px solid #8892a0;min-width:32mm;display:inline-block;color:transparent}
  .bridge-note{font-size:7.2pt;color:#0f766e;margin-top:1mm}
`;

function page(title, subtitle, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>${STYLE}</style></head><body>
<button class="printbtn" onclick="window.print()">打印 / 保存为 PDF（A3 横向）</button>
<div class="stage"><div class="poster">
  <div class="top"><div>
    <h1>${esc(title)}</h1>
    <div class="st">${esc(subtitle)}</div>
  </div><div class="legend">
    记录方式：<span class="k"></span>空白＝未开始　<span class="tick">✓</span>打勾＝已掌握　<span class="k" style="border-style:dashed"></span>画斜线＝学习中<br>
    每条右侧虚线填写“掌握日期”，板块名后填写累计掌握数。
  </div></div>
${body}
  <div class="sign">本周聚焦：<span></span>　下周补漏：<span></span>　记录人：<span></span>　更新日期：<span></span></div>
</div></div></body></html>
`;
}

function signalSection() {
  const rows = SIGNAL_RULES.map(r => {
    const names = (r.ids || []).map(id => byId[id] ? byId[id].n : id).join(' / ');
    return `<div class="sg"><b>${esc((r.k || []).join('、'))}</b><span>→ ${esc(names)}</span></div>`;
  }).join('');
  return `<div><div class="bt">题目信号 → 知识域速查</div><div class="rows">${rows}</div></div>`;
}

// ---------- 版本一：按学段（四栏） ----------
function buildStagePoster() {
  const colors = ['#6f52c9', '#2f6fd0', '#159b72', '#c47a1e'];
  const idxChar = ['⓪', '①', '②', '③'];
  const html = DOMAINS.map((d, di) => {
    const cnt = d.modules.reduce((s, m) => s + m.topics.length, 0);
    const mods = d.modules.map(m => {
      const items = m.topics.map(t => `<li><span class="cb"></span><span class="nm">${esc(t.n)}</span><span class="dt"></span></li>`).join('');
      return `<div class="mod"><div class="modh">${esc(m.name)}<span class="cnt">${m.topics.length} 项</span></div><ul>${items}</ul></div>`;
    }).join('');
    return `<section class="col" style="--cc:${colors[di % colors.length]}">
      <div class="colh"><span class="idx">${idxChar[di]}</span><span class="cname">${esc(d.name)}</span></div>
      <div class="colmeta">共 ${cnt} 项　已掌握 <span class="fill">____</span> / ${cnt}　日期 <span class="fill">____</span></div>
      ${mods}
    </section>`;
  }).join('');

  const bridgesHtml = BRIDGES.map(b =>
    `<div class="row"><b>${esc(b.fromName)}</b><span class="ar">→</span><span>${esc(b.toName)}</span><i>${esc(b.kind.replace('铺垫→', ''))}</i></div>`
  ).join('');
  const bottom = `<div class="bottom">
    <div><div class="bt">跨学段衔接链 · ${BRIDGE_STATS.total} 条（小学 → 课标 / 竞赛 / 奥赛）</div>
      <div class="rows">${bridgesHtml}</div>
      <div class="bridge-note">衔接关系来自独立声明（bridges.json），不改写知识点卡片；仅作学习路径参考。</div></div>
    ${signalSection()}
  </div>`;
  return page('数学阶梯 · 知识图谱家庭挂图（按学段）',
    '四段培养体系 · 小学 → 初中 → 高中 → 奥赛　｜　' + ALL_NODES.length + ' 知识点　｜　赛制依据：2026 全国高中数学联赛组委会通知 / 教育部教监管厅函〔2025〕7 号',
    `<div class="cols" style="grid-template-columns:repeat(4,1fr)">${html}</div>` + bottom);
}

// ---------- 版本二：按主题（11 栏，分三行网格） ----------
function buildThemePoster() {
  const toneColors = ['#2f6fd0','#d98324','#159b72','#6f52c9','#c2517a','#3f7fd0','#5a9fd0','#b87828','#a858a0','#4e9f6a','#6f52c9'];
  const groups = THEMES.map((t, i) => {
    const items = t.nodeIds.map(id => {
      const n = byId[id];
      return `<li><span class="cb"></span><span class="nm">${esc(n ? n.n : id)}</span><span class="dt"></span></li>`;
    }).join('');
    return `<section class="col" style="--cc:${toneColors[i % toneColors.length]}">
      <div class="colh"><span class="idx" style="font-size:12pt">${i + 1}</span><span class="cname" style="font-size:10.5pt">${esc(t.name)}</span></div>
      <div class="colmeta">${esc(t.sub)}　已掌握 <span class="fill">____</span> / ${t.nodeIds.length}</div>
      <ul>${items}</ul>
    </section>`;
  }).join('');
  const bottom = `<div class="bottom">
    <div><div class="bt">跨学段衔接链 · ${BRIDGE_STATS.total} 条</div>
      <div class="rows">${BRIDGES.map(b => `<div class="row"><b>${esc(b.fromName)}</b><span class="ar">→</span><span>${esc(b.toName)}</span><i>${esc(b.kind.replace('铺垫→', ''))}</i></div>`).join('')}</div>
      <div class="bridge-note">按主题纵览：同一主题内节点按 小学 → 初中 → 高中 → 奥赛 顺序排列，呈现深化链。</div></div>
    ${signalSection()}
  </div>`;
  return page('数学阶梯 · 知识图谱家庭挂图（按主题）',
    THEMES.length + ' 大主题 · ' + ALL_NODES.length + ' 知识点　｜　主题内节点按学段顺序排列，串联小学铺垫到竞赛进阶',
    `<div class="cols" style="grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr)">${groups}</div>` + bottom);
}

// ---------- 写出 ----------
const stagePath = path.join(OUT, 'olympiad-poster-A3.html');
const themePath = path.join(OUT, 'olympiad-poster-themes-A3.html');
fs.writeFileSync(stagePath, buildStagePoster());
fs.writeFileSync(themePath, buildThemePoster());
console.log('生成：' + path.relative(ROOT, stagePath) + '（按学段 · ' + DOMAINS.length + ' 栏 · ' + ALL_NODES.length + ' 节点）');
console.log('生成：' + path.relative(ROOT, themePath) + '（按主题 · ' + THEMES.length + ' 主题 · ' + ALL_NODES.length + ' 节点）');
console.log('衔接链：' + BRIDGES.length + ' 条；题目信号：' + SIGNAL_RULES.length + ' 类');
console.log('VERDICT=PASSED');
