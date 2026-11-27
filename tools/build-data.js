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
 *   reliable-data/evidence/{SOURCES,NODE_SOURCES}.json          —— 来源登记与逐节点用途/定位/缺口
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
 *   3) 默认保留全 verified 的显式保守构建策略；--allow-pending 允许带真实状态的开发构建。
 *      这不是产品交付必须全人工核准的要求（SPEC-009），构建结果与 CONTENT_REVIEW 分开输出。
 *   4) 校验当前卡片哈希、manifest 绑定、来源 sidecar 和指定重复字段，全部通过才写出。
 *      此处不作数学复算，可靠性检查独立运行 tests/check-reliable-extra.js / verify_content.js。
 *   5) 组织配置齐全（domain/lecture/theme shell、领域/模块映射）—— 否则 BLOCKED。
 *   6) 结构一致性：节点集 = ALL_NODES = LECTURES.points 并集；theme shell 与 lecture shell 一一对应且节点集相同。
 *   7) 衔接边两端节点必须在真源内（bridges.json 为唯一声明处，不回写卡片字段）。
 *
 * 运行：node tools/build-data.js [--allow-pending]
 * 输出：RESULT= / VERDICT=PASSED|BLOCKED|FAILED
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'apps/miniprogram/data');
const contract = require('./lib/content-contract');
function die(msg) { const e = new Error(msg); e.exitCode = 2; throw e; }

function main() {
const args = process.argv.slice(2);
if (args.some(a => a !== '--allow-pending')) die('未知参数；仅支持 --allow-pending。');
const allowPending = args.includes('--allow-pending');
// 先全量只读校验；任何输入错误或缺少真实来源映射均不得改写现有生成物。
const data = contract.loadContent(fs, SRC);
const { manifest, cards } = data;
const BASE_N = manifest.domainBaseline.total;
const DIRS = contract.KINDS;
const mapping = contract.loadSourceMapping(fs, SRC, data.ids);
const metadata = contract.buildMetadata(data, mapping);
const NODE_META = metadata.nodes, CONTENT_REVIEW = metadata.contentReview;
const notVerified = BASE_N * DIRS.length - data.reviewStats.verified;
console.log('CONTENT_REVIEW=' + JSON.stringify(CONTENT_REVIEW));
if (notVerified > 0 && !allowPending) {
  die('当前保守构建策略要求全 verified；有 ' + notVerified + ' 条未满足。带明确状态的开发构建请加 --allow-pending；这不是产品交付禁令。');
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
const nodeById = Object.create(null);
ALL_NODES.forEach(n => { nodeById[n.id] = n; });

// ---------- 5. 构造 DOMAINS（外壳取配置，topic 取真源节点，按配置 nodeIds 顺序） ----------
const DOMAINS = ORG.domainModules.map(d => ({
  id: d.id, name: d.name, sub: d.sub, color: d.color,
  modules: d.modules.map(m => ({
    id: m.id, name: m.name,
    topics: m.nodeIds.map(id => {
      if (!nodeById[id]) die('DOMAINS 含真源外节点：' + id);
      if (nodeById[id].domain !== d.id) die('DOMAINS 学段与真源不符：' + id);
      return nodeById[id];
    })
  }))
}));

// ---------- 6. 构造 LECTURES（例题/易错以独立卡为单一输出入口；lessons 镜像已校验相等） ----------
const LECTURES = ORG.lectureShells.map(s => ({
  id: s.id, title: s.title, subtitle: s.subtitle, lead: s.lead, goal: s.goal, chain: s.chain,
  points: s.nodeIds.map(id => {
    const l = cards.lessons[id];
    if (!l) die('LECTURES 含真源外节点：' + id);
    return {
      nodeId: id,
      title: cards.nodes[id] ? cards.nodes[id].title : (l.title || id),
      essence: l.essence,
      method: l.method || [],
      example: { q: cards.examples[id].items[0].question, a: cards.examples[id].items[0].answer },
      pitfalls: cards.pitfalls[id].items.map(it => it.mistake),
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

// 67 节点四类卡统一派生。组织层原 6 节点不是这些卡的镜像：全部原样保留，追加呈现。
const SUPPLEMENTAL_CARDS = JSON.parse(JSON.stringify(ORG.cards));
const CARDS = {};
function origin(kind, id) {
  const c = cards[kind][id];
  return { path: 'reliable-data/' + kind + '/' + id + '.json', source_ref: c.source_ref,
    review: c.review, evidence: c.evidence, contentHash: c.content_hash };
}
nodeIds.forEach(id => {
  const n = cards.nodes[id], l = cards.lessons[id];
  CARDS[id] = {
    concept: { title: n.title, body: l.essence, points: n.points, origins: [origin('nodes', id), origin('lessons', id)] },
    explain: [
      { title: '核心方法', body: l.essence, points: l.method, origin: origin('lessons', id) },
      ...cards.pitfalls[id].items.map(it => ({ title: '易错 · ' + it.id, body: it.mistake,
        points: [it.trigger, it.rootCause, it.correction].concat(it.selfCheck ? [it.selfCheck] : []), origin: origin('pitfalls', id) })),
      { title: '知识连接与自检', body: l.links, points: l.check, origin: origin('lessons', id) }
    ],
    examples: cards.examples[id].items.map(it => ({ title: '示范 · ' + it.id, level: ORG.reviewLabel[cards.examples[id].review],
      question: it.question, hint: it.reasoningAnchor || '', solution: it.answer, answer: it.conclusion,
      provenance: it.provenance || '', origin: origin('examples', id) }))
  };
  const extra = SUPPLEMENTAL_CARDS[id];
  if (extra) {
    const supplementalOrigin = { path: 'reliable-data/source/app_organization.json#cards.' + id,
      role: '独立组织层补充，不是四类卡镜像', review: 'pending', contentHash: contract.hashValue(extra) };
    const withOrigin = item => Object.assign({}, item, { origin: supplementalOrigin });
    CARDS[id].explain.push(withOrigin(extra.concept), ...extra.explain.map(withOrigin));
    CARDS[id].examples.push(...extra.examples.map(withOrigin));
  }
});

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
Object.keys(SUPPLEMENTAL_CARDS).forEach(id => { if (!nodeById[id]) structural.push('组织层补充含真源外节点：' + id); });
if (domainIds.length !== BASE_N) structural.push('DOMAINS 重复或遗漏节点');
if (structural.length) die(structural.join('\n'));

// ---------- 9. 写出七个模块与生成清单（此前所有检查均只读） ----------
function head(lines, warning) {
  return [
    '// GENERATED FILE — 由 tools/build-data.js 从唯一真源生成，请勿手工编辑。',
    '// source=reliable-data version=' + manifest.version + ' generatedAt=' + manifest.generatedAt,
    (warning ? '// 注意：' + warning + '\n' : '') + lines
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
  ? '带状态开发数据：' + notVerified + ' 条未人工签核为 verified；详见 CONTENT_REVIEW，构建成功不代表内容正确（SPEC-009）。' : '';

const outputBytes = {};
function write(name, content) {
  outputBytes[name] = Buffer.byteLength(content, 'utf8');
  fs.writeFileSync(path.join(OUT, name), content);
}
fs.mkdirSync(OUT, { recursive: true });
write('nodes.js', wrap('// 导出 DOMAINS / ALL_NODES / SIGNAL_RULES，由真源编译。',
  { DOMAINS, ALL_NODES, SIGNAL_RULES: ORG.signalRules }, warning));
write('lectures.js', wrap('// 导出 LECTURES：主体取 lessons，例题/易错取 examples/pitfalls；重复字段不一致则拒绝构建。',
  { LECTURES }, warning));
write('cards.js', wrapConst(
  '// CARDS 从四类真源派生；SUPPLEMENTAL_CARDS 独立补充，非 268 卡镜像，无签核升级。\n' +
  'const SUPPLEMENTAL_CARDS = ' + JSON.stringify(SUPPLEMENTAL_CARDS, null, 2) + ';\n' +
  'const CARDS = ' + JSON.stringify(CARDS, null, 2) + ';\n\n' +
  'function cardCount(nodeId) {\n  const c = CARDS[nodeId];\n  if (!c) return 0;\n  return (c.concept ? 1 : 0) + (c.explain ? c.explain.length : 0) + (c.examples ? c.examples.length : 0);\n}\n',
  'module.exports = { CARDS: CARDS, cardCount: cardCount, SUPPLEMENTAL_CARDS: SUPPLEMENTAL_CARDS };\n', warning));
write('themes.js', wrap('// 导出 THEMES / THEME_OF / THEME_NAME / DOMAIN_SHORT：主题外壳取组织配置。',
  { THEMES, THEME_OF, THEME_NAME, DOMAIN_SHORT }, warning));
write('topic_index.js', wrap('// 导出 TOPIC_ITEMS / TOPIC_GROUPS / TOPICS_BY_NODE：题型索引取组织配置。',
  { TOPIC_GROUPS, TOPIC_ITEMS, TOPICS_BY_NODE }, warning));
write('content_meta.js', wrapConst(
  '// metaFor 展示已核来源定位，legacySourceRef 保留旧卡原文；当前审核状态不随来源升级。\n' +
  '// DOMAIN_SOURCE / R2_CHECKED 仅供历史追溯，不参与当前审核状态计算。\n' +
  'const NODE_META = ' + JSON.stringify(NODE_META, null, 2) + ';\n' +
  'const CONTENT_REVIEW = ' + JSON.stringify(CONTENT_REVIEW, null, 2) + ';\n' +
  'const DOMAIN_SOURCE = ' + JSON.stringify(ORG.domainSource, null, 2) + ';\n' +
  'const R2_CHECKED = ' + JSON.stringify(ORG.r2Checked, null, 2) + ';\n' +
  'const EVIDENCE_LABEL = ' + JSON.stringify(ORG.evidenceLabel, null, 2) + ';\n' +
  'const REVIEW_LABEL = ' + JSON.stringify(ORG.reviewLabel, null, 2) + ';\n\n' +
  'function metaFor(nodeId, domain) {\n  if (!Object.prototype.hasOwnProperty.call(NODE_META, nodeId)) throw new Error(\'未知节点元数据：\' + nodeId);\n  return NODE_META[nodeId];\n}\n',
  'module.exports = { DOMAIN_SOURCE: DOMAIN_SOURCE, R2_CHECKED: R2_CHECKED, metaFor: metaFor, EVIDENCE_LABEL: EVIDENCE_LABEL, REVIEW_LABEL: REVIEW_LABEL, NODE_META: NODE_META, CONTENT_REVIEW: CONTENT_REVIEW };\n', warning));
write('bridges.js', wrap('// 导出 BRIDGES / BRIDGES_BY_NODE / BRIDGE_STATS：跨学段衔接边取 bridges.json（零破坏，不回写真源卡）。',
  { BRIDGES, BRIDGES_BY_NODE, BRIDGE_STATS }, warning));

write('manifest.generated.json', JSON.stringify({
  sourceVersion: manifest.version,
  generatedAt: manifest.generatedAt,
  builtFrom: 'reliable-data + source/app_organization.json + index/bridges.json + evidence/SOURCES.json + evidence/NODE_SOURCES.json',
  contentReview: CONTENT_REVIEW,
  sourceRegistryHash: contract.hashValue(mapping.registry),
  sourceMapHash: contract.hashValue(mapping.sidecar),
  organizationHash: contract.hashValue(ORG),
  baseline: BASE_N,
  notVerified, allowPending,
  modules: ['nodes.js', 'lectures.js', 'cards.js', 'themes.js', 'topic_index.js', 'content_meta.js', 'bridges.js']
}, null, 2) + '\n');

console.log('生成：nodes/lectures/cards/themes/topic_index/content_meta/bridges（节点基线 ' + BASE_N + '；题型覆盖取组织配置）');
console.log('OUTPUT_BYTES=' + JSON.stringify({ files: outputBytes, total: Object.values(outputBytes).reduce((a, b) => a + b, 0) }));
console.log('RESULT=7/7 FAILED=0');
console.log('VERDICT=PASSED');
}
try { main(); }
catch (e) {
  const blocked = e.exitCode === 2 || e.code === 'SOURCE_DEPENDENCY';
  console.error((blocked ? 'BLOCK ' : 'FAIL ') + e.message);
  console.log('VERDICT=' + (blocked ? 'BLOCKED' : 'FAILED'));
  process.exitCode = blocked ? 2 : 1;
}
