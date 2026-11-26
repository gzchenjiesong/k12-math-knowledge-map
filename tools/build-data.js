#!/usr/bin/env node
/**
 * build-data.js —— 把唯一真源编译为小程序可读的 7 个数据模块
 *
 * 定位：下游应用层不校验内容正确性，只做格式转换与结构完整性检查。
 * 输入：
 *   reliable-data/manifest.json
 *   reliable-data/{nodes,lessons,pitfalls,examples}/*.json   —— 内容四类卡（真源）
 *   reliable-data/source/app_organization.json               —— 组织层配置（领域/专题/主题/三维卡/题型/证据元数据）
 *   reliable-data/index/bridges.json                          —— 跨学段衔接边（零破坏声明处，不回写真源卡）
 * 输出：apps/miniprogram/data/*.js（7 个页面消费模块，生成物；v2.1.0 起入库以可复现）
 *   nodes.js / lectures.js / cards.js / themes.js / topic_index.js / content_meta.js / bridges.js
 *
 * 页面消费契约（字段名固定，不可改）：
 *   nodes.js       → { DOMAINS, ALL_NODES, SIGNAL_RULES }
 *   lectures.js    → { LECTURES }
 *   cards.js       → { CARDS, cardCount }
 *   themes.js      → { THEMES, THEME_OF, THEME_NAME, DOMAIN_SHORT }
 *   topic_index.js → { TOPIC_GROUPS, TOPIC_ITEMS, TOPICS_BY_NODE }
 *   content_meta.js→ { DOMAIN_SOURCE, R2_CHECKED, metaFor, EVIDENCE_LABEL, REVIEW_LABEL }
 *   bridges.js     → { BRIDGES, BRIDGES_BY_NODE, BRIDGE_STATS }
 *
 * 闸门：
 *   1) manifest 存在且 version 非空 —— 否则真源未发布，BLOCKED。
 *   2) 四类卡各 N 份（N 取 manifest.domainBaseline.total）—— 否则 BLOCKED。
 *   3) 每条卡 review=verified —— 否则 BLOCKED；--allow-pending 可产出开发期过渡数据（头部带警告）。
 *   4) 组织配置齐全（domain/lecture/theme shell、领域/模块映射）—— 否则 BLOCKED。
 *   5) 结构一致性：67 节点 = ALL_NODES = LECTURES.points 并集；theme shell 与 lecture shell 一一对应且节点集相同。
 *   6) 衔接边两端节点必须在真源内（bridges.json 为唯一声明处，不回写卡片字段）。
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
function fail(msg) { console.log('FAIL ' + msg); console.log('VERDICT=FAILED'); process.exit(1); }

// ---------- 1. manifest ----------
const manifestPath = path.join(SRC, 'manifest.json');
if (!fs.existsSync(manifestPath)) die('reliable-data/manifest.json 不存在：真源未发布。');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (e) { fail('manifest.json 解析失败：' + e.message); }
if (!manifest.version) die('manifest.version 为空：真源未标记版本。');
const BASE_N = (manifest.domainBaseline && manifest.domainBaseline.total) || manifest.counts.nodes || 57;

// ---------- 2. 四类卡 ----------
const DIRS = ['nodes', 'lessons', 'pitfalls', 'examples'];
const cards = {};
const problems = [];
for (const d of DIRS) {
  const dir = path.join(SRC, d);
  if (!fs.existsSync(dir)) { problems.push(d + '/ 目录缺失'); continue; }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (files.length !== BASE_N) problems.push(d + '/ 卡片数 ' + files.length + ' ≠ ' + BASE_N);
  cards[d] = {};
  for (const f of files) {
    const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    cards[d][o.nodeId] = o;
  }
}
if (problems.length) { console.log(problems.map(p => 'BLOCK ' + p).join('\n')); console.log('VERDICT=BLOCKED'); process.exit(2); }

// review 闸门
let notVerified = 0;
for (const d of DIRS) for (const id in cards[d]) if (cards[d][id].review !== 'verified') notVerified++;
if (notVerified > 0 && !allowPending) {
  die('有 ' + notVerified + ' 条内容未达 verified（人工签核未完成）。开发期过渡数据请加 --allow-pending。');
}

// ---------- 3. 组织层配置 ----------
const orgPath = path.join(SRC, 'source/app_organization.json');
if (!fs.existsSync(orgPath)) die('reliable-data/source/app_organization.json 缺失：组织层配置未固化。');
const ORG = JSON.parse(fs.readFileSync(orgPath, 'utf8'));
for (const k of ['domainModules', 'signalRules', 'lectureShells', 'themeShells', 'cards', 'topicGroups', 'topicItems', 'domainSource', 'r2Checked', 'evidenceLabel', 'reviewLabel']) {
  if (ORG[k] == null) die('组织层配置缺少字段 ' + k);
}

// ---------- 4. 构造 ALL_NODES（字段映射：真源 → 页面契约） ----------
const nodeIds = Object.keys(cards.nodes).sort();
const ALL_NODES = nodeIds.map(id => {
  const o = cards.nodes[id];
  return {
    id: o.nodeId,
    n: o.title,
    p: o.points || [],
    pre: o.prerequisites || [],
    rel: o.relations || [],
    sig: o.signals || [],
    ap: o.approaches || [],
    d: o.description || '',
    domain: o.domain,
    domainName: o.domainName,
    module: o.module
  };
});
const nodeById = {};
ALL_NODES.forEach(n => { nodeById[n.id] = n; });

// ---------- 5. 构造 DOMAINS（外壳取配置，topic 取真源节点，按配置 nodeIds 顺序） ----------
const DOMAINS = ORG.domainModules.map(d => ({
  id: d.id, name: d.name, sub: d.sub, color: d.color,
  modules: d.modules.map(m => ({
    id: m.id, name: m.name,
    topics: m.nodeIds.map(id => nodeById[id] || null).filter(Boolean)
  }))
}));

// ---------- 6. 构造 LECTURES（六段式取自真源 lessons） ----------
const LECTURES = ORG.lectureShells.map(s => ({
  id: s.id, title: s.title, subtitle: s.subtitle, lead: s.lead, goal: s.goal, chain: s.chain,
  points: s.nodeIds.map(id => {
    const l = cards.lessons[id];
    if (!l) return null;
    return {
      nodeId: id,
      title: cards.nodes[id] ? cards.nodes[id].title : (l.title || id),
      essence: l.essence,
      method: l.method || [],
      example: l.example || { q: '', a: '' },
      pitfalls: l.pitfalls || [],
      links: l.links || '',
      check: l.check || []
    };
  }).filter(Boolean)
}));

// ---------- 7. 构造 themes / topic_index / cards / content_meta ----------
const THEMES = ORG.themeShells.map(t => ({ id: t.id, name: t.name, sub: t.sub, tone: t.tone, nodeIds: t.nodeIds.slice() }));
const THEME_OF = {}, THEME_NAME = {}, DOMAIN_SHORT = Object.assign({}, ORG.domainShort);
THEMES.forEach(t => { THEME_NAME[t.id] = t.name; t.nodeIds.forEach(id => { THEME_OF[id] = t.id; }); });

const TOPIC_ITEMS = JSON.parse(JSON.stringify(ORG.topicItems));
const TOPIC_GROUPS = JSON.parse(JSON.stringify(ORG.topicGroups));
const TOPICS_BY_NODE = {};
TOPIC_ITEMS.forEach(it => (it.nodes || []).forEach(id => {
  (TOPICS_BY_NODE[id] = TOPICS_BY_NODE[id] || []).push(it.id);
}));

const CARDS = JSON.parse(JSON.stringify(ORG.cards));

// ---------- 7b. 构造 bridges（跨学段衔接边，取自 bridges.json 唯一声明处） ----------
const bridgesPath = path.join(SRC, 'index/bridges.json');
if (!fs.existsSync(bridgesPath)) die('reliable-data/index/bridges.json 缺失：衔接边声明未发布。');
const BRIDGES_SRC = JSON.parse(fs.readFileSync(bridgesPath, 'utf8'));
if (!Array.isArray(BRIDGES_SRC.edges)) die('bridges.json.edges 非数组：衔接边声明格式错误。');
// 富化每条边：补两端节点名称 / 学段 / 主题，供图谱视图直接渲染；不改写 from/to/kind 原字段。
const BRIDGES = BRIDGES_SRC.edges.map(function (e, i) {
  const from = nodeById[e.from], to = nodeById[e.to];
  return {
    from: e.from, to: e.to, kind: e.kind,
    fromName: from ? from.n : e.from, toName: to ? to.n : e.to,
    fromDomain: from ? from.domainName : '', toDomain: to ? to.domainName : '',
    fromTheme: THEME_OF[e.from] || '', toTheme: THEME_OF[e.to] || ''
  };
});
// 反向索引：节点 → { out:[边序号], in:[边序号] }，零破坏，不改 ALL_NODES。
const BRIDGES_BY_NODE = {};
BRIDGES.forEach(function (b, i) {
  (BRIDGES_BY_NODE[b.from] = BRIDGES_BY_NODE[b.from] || { out: [], in: [] }).out.push(i);
  (BRIDGES_BY_NODE[b.to] = BRIDGES_BY_NODE[b.to] || { out: [], in: [] }).in.push(i);
});
const BRIDGE_KIND_COUNT = {};
BRIDGES.forEach(function (b) { BRIDGE_KIND_COUNT[b.kind] = (BRIDGE_KIND_COUNT[b.kind] || 0) + 1; });
const BRIDGE_STATS = { total: BRIDGES.length, byKind: BRIDGE_KIND_COUNT };

// ---------- 8. 结构一致性闸门 ----------
const structural = [];
if (ALL_NODES.length !== BASE_N) structural.push('ALL_NODES ' + ALL_NODES.length + ' ≠ ' + BASE_N);
const lectureIds = [];
LECTURES.forEach(g => g.points.forEach(p => lectureIds.push(p.nodeId)));
if (lectureIds.length !== BASE_N) structural.push('LECTURES.points ' + lectureIds.length + ' ≠ ' + BASE_N);
const uniqLecture = Array.from(new Set(lectureIds));
if (uniqLecture.length !== lectureIds.length) structural.push('LECTURES.points 有重复 nodeId');
const missingLecture = nodeIds.filter(id => uniqLecture.indexOf(id) < 0);
if (missingLecture.length) structural.push('LECTURES 缺少节点：' + missingLecture.join(','));
const ghostLecture = uniqLecture.filter(id => !nodeById[id]);
if (ghostLecture.length) structural.push('LECTURES 含真源外节点：' + ghostLecture.join(','));
if (LECTURES.length !== THEMES.length) structural.push('LECTURES(' + LECTURES.length + ') 与 THEMES(' + THEMES.length + ') 专题数不一致');
LECTURES.forEach(g => {
  const th = THEMES.find(t => t.id === g.id);
  if (!th) { structural.push('LECTURE ' + g.id + ' 无对应 THEME'); return; }
  const a = g.points.map(p => p.nodeId).sort().join('|');
  const b = th.nodeIds.slice().sort().join('|');
  if (a !== b) structural.push('LECTURE/THEME ' + g.id + ' 节点集不一致');
});
const domainIds = [];
DOMAINS.forEach(d => d.modules.forEach(m => m.topics.forEach(t => domainIds.push(t.id))));
const uniqDomain = Array.from(new Set(domainIds));
if (uniqDomain.length !== BASE_N) structural.push('DOMAINS 覆盖节点 ' + uniqDomain.length + ' ≠ ' + BASE_N);
const missingDomain = nodeIds.filter(id => uniqDomain.indexOf(id) < 0);
if (missingDomain.length) structural.push('DOMAINS 缺少节点：' + missingDomain.join(','));
const dangling = [];
ALL_NODES.forEach(n => [...(n.pre || []), ...(n.rel || [])].forEach(r => { if (!nodeById[r]) dangling.push(n.id + '->' + r); }));
if (dangling.length) structural.push('前置/关联悬空：' + dangling.join(','));
// 三维卡/题型索引引用的节点必须在真源内
Object.keys(CARDS).forEach(id => { if (!nodeById[id]) structural.push('CARDS 含真源外节点：' + id); });
TOPIC_ITEMS.forEach(it => (it.nodes || []).forEach(id => { if (!nodeById[id]) structural.push('TOPIC ' + it.id + ' 含真源外节点：' + id); }));
BRIDGES.forEach((b, i) => {
  if (!nodeById[b.from]) structural.push('BRIDGE[' + i + '].from 含真源外节点：' + b.from);
  if (!nodeById[b.to]) structural.push('BRIDGE[' + i + '].to 含真源外节点：' + b.to);
});
if (structural.length) { console.log(structural.map(s => 'BLOCK ' + s).join('\n')); console.log('VERDICT=BLOCKED'); process.exit(2); }

// ---------- 9. 写出 6 个模块 ----------
function head(lines, warning) {
  return [
    '// GENERATED FILE — 由 tools/build-data.js 从唯一真源生成，请勿手工编辑。',
    '// source=reliable-data version=' + manifest.version + ' generatedAt=' + manifest.generatedAt,
    (warning ? '// ⚠ ' + warning + '\n' : '') + lines
  ].join('\n') + '\n';
}
// 直接导出对象字面量的模块
function wrap(lines, data, warning) {
  return head(lines, warning) + 'module.exports = ' + JSON.stringify(data, null, 2) + ';\n';
}
// 先声明 const 再导出（用于需要附带函数定义的模块）
function wrapConst(constLines, exportsLine, warning) {
  return head('', warning) + constLines + '\n' + exportsLine;
}
const warning = allowPending && notVerified > 0
  ? '过渡数据：' + notVerified + ' 条未人工签核（review=pending），禁止用于交付判断（SPEC-008）' : '';

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'nodes.js'), wrap('// 导出 DOMAINS / ALL_NODES / SIGNAL_RULES，由真源编译。',
  { DOMAINS, ALL_NODES, SIGNAL_RULES: ORG.signalRules }, warning));
fs.writeFileSync(path.join(OUT, 'lectures.js'), wrap('// 导出 LECTURES：专题外壳取组织配置，六段式内容取真源 lessons。',
  { LECTURES }, warning));
fs.writeFileSync(path.join(OUT, 'cards.js'), wrapConst(
  'const CARDS = ' + JSON.stringify(CARDS, null, 2) + ';\n\n' +
  'function cardCount(nodeId) {\n  const c = CARDS[nodeId];\n  if (!c) return 0;\n  return (c.concept ? 1 : 0) + (c.explain ? c.explain.length : 0) + (c.examples ? c.examples.length : 0);\n}\n',
  'module.exports = { CARDS: CARDS, cardCount: cardCount };\n', warning));
fs.writeFileSync(path.join(OUT, 'themes.js'), wrap('// 导出 THEMES / THEME_OF / THEME_NAME / DOMAIN_SHORT：主题外壳取组织配置。',
  { THEMES, THEME_OF, THEME_NAME, DOMAIN_SHORT }, warning));
fs.writeFileSync(path.join(OUT, 'topic_index.js'), wrap('// 导出 TOPIC_ITEMS / TOPIC_GROUPS / TOPICS_BY_NODE：题型索引取组织配置。',
  { TOPIC_GROUPS, TOPIC_ITEMS, TOPICS_BY_NODE }, warning));
fs.writeFileSync(path.join(OUT, 'content_meta.js'), wrapConst(
  '// 导出 DOMAIN_SOURCE / R2_CHECKED / EVIDENCE_LABEL / REVIEW_LABEL / metaFor：证据元数据取组织配置。\n' +
  'const DOMAIN_SOURCE = ' + JSON.stringify(ORG.domainSource, null, 2) + ';\n' +
  'const R2_CHECKED = ' + JSON.stringify(ORG.r2Checked, null, 2) + ';\n' +
  'const EVIDENCE_LABEL = ' + JSON.stringify(ORG.evidenceLabel, null, 2) + ';\n' +
  'const REVIEW_LABEL = ' + JSON.stringify(ORG.reviewLabel, null, 2) + ';\n\n' +
  'function metaFor(nodeId, domain) {\n  const base = DOMAIN_SOURCE[domain] || DOMAIN_SOURCE.junior;\n  const review = R2_CHECKED.indexOf(nodeId) >= 0 ? \'checked\' : \'pending\';\n  return {\n    source: base.source, evidence: base.evidence, review: review, note: base.note,\n    wording: \'C\', wordingNote: \'讲解措辞与自编例题为原创，属方法论建议，需人工判断\'\n  };\n}\n',
  'module.exports = { DOMAIN_SOURCE: DOMAIN_SOURCE, R2_CHECKED: R2_CHECKED, metaFor: metaFor, EVIDENCE_LABEL: EVIDENCE_LABEL, REVIEW_LABEL: REVIEW_LABEL };\n', warning));
fs.writeFileSync(path.join(OUT, 'bridges.js'), wrap('// 导出 BRIDGES / BRIDGES_BY_NODE / BRIDGE_STATS：跨学段衔接边取 bridges.json（零破坏，不回写真源卡）。',
  { BRIDGES, BRIDGES_BY_NODE, BRIDGE_STATS }, warning));

fs.writeFileSync(path.join(OUT, 'manifest.generated.json'), JSON.stringify({
  sourceVersion: manifest.version,
  generatedAt: manifest.generatedAt,
  builtFrom: 'reliable-data + source/app_organization.json + index/bridges.json',
  baseline: BASE_N,
  notVerified, allowPending,
  modules: ['nodes.js', 'lectures.js', 'cards.js', 'themes.js', 'topic_index.js', 'content_meta.js', 'bridges.js']
}, null, 2) + '\n');

console.log('生成：nodes/lectures/cards/themes/topic_index/content_meta/bridges（各模块覆盖 ' + BASE_N + ' 节点）');
console.log('RESULT=7/7 FAILED=0');
console.log('VERDICT=PASSED' + (warning ? '（过渡数据，含未签核条目）' : ''));
