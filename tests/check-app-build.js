#!/usr/bin/env node
/**
 * check-app-build.js —— 生成物一致性闸门（app 数据 ↔ 真源 ↔ 组织配置）
 *
 * 定位：validate.js 校验 app 数据结构与页面契约；本脚本回答「入库的 app 数据是否
 *       忠实编译自唯一真源 + 组织配置」，保证 clone 后 build-data.js 可无损重建。
 *
 * 检查项：
 *   G1 七个模块可加载且导出名齐全
 *   G2 ALL_NODES 字段逐项等于真源 nodes/*.json 的映射结果（含 v2.1.0 补丁）
 *   G3 LECTURES 六段式逐字段等于真源 lessons/*.json（含补丁节点）
 *   G4 DOMAINS / THEMES / LECTURES 三视图覆盖同一 67 节点集
 *   G5 cards / topic_index / content_meta 等于组织配置
 *   G6 生成物头部含版本与来源标记，过渡态含未签核警告
 *   G7 BRIDGES 的 from/to/kind 逐条等于 bridges.json，富化字段与反向索引正确
 *
 * 运行：node tests/check-app-build.js
 * 输出：RESULT= / VERDICT=PASSED|FAILED|BLOCKED
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'apps/miniprogram/data');
let pass = 0, fail = 0;
function say(ok, msg) { console.log((ok ? 'OK   ' : 'FAIL ') + msg); ok ? pass++ : fail++; }
function blocked(msg) { console.log('BLOCK ' + msg); console.log('VERDICT=BLOCKED'); process.exit(2); }
function loadMod(p) {
  const a = path.resolve(p);
  const m = new Module(a);
  m.filename = a;
  m.paths = Module._nodeModulePaths(path.dirname(a));
  m._compile(fs.readFileSync(a, 'utf8'), a);
  return m.exports;
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const manifestPath = path.join(SRC, 'manifest.json');
const orgPath = path.join(SRC, 'source/app_organization.json');
if (!fs.existsSync(manifestPath)) blocked('真源 manifest 缺失');
if (!fs.existsSync(orgPath)) blocked('组织配置缺失');
const manifest = readJson(manifestPath);
const ORG = readJson(orgPath);
const BASE_N = (manifest.domainBaseline && manifest.domainBaseline.total) || manifest.counts.nodes || 57;

// G1 模块加载
const MODS = {};
const EXPECT_KEYS = {
  nodes: ['DOMAINS', 'ALL_NODES', 'SIGNAL_RULES'],
  lectures: ['LECTURES'],
  cards: ['CARDS', 'cardCount'],
  themes: ['THEMES', 'THEME_OF', 'THEME_NAME', 'DOMAIN_SHORT'],
  topic_index: ['TOPIC_GROUPS', 'TOPIC_ITEMS', 'TOPICS_BY_NODE'],
  content_meta: ['DOMAIN_SOURCE', 'R2_CHECKED', 'metaFor', 'EVIDENCE_LABEL', 'REVIEW_LABEL'],
  bridges: ['BRIDGES', 'BRIDGES_BY_NODE', 'BRIDGE_STATS']
};
for (const name of Object.keys(EXPECT_KEYS)) {
  const p = path.join(OUT, name + '.js');
  if (!fs.existsSync(p)) { say(false, 'G1 ' + name + '.js 缺失'); continue; }
  try { MODS[name] = loadMod(p); }
  catch (e) { say(false, 'G1 ' + name + '.js 加载失败：' + e.message); continue; }
  const missing = EXPECT_KEYS[name].filter(k => MODS[name][k] === undefined);
  say(missing.length === 0, 'G1 ' + name + '.js 导出齐全（缺 ' + missing.join(',') + '）');
}

// 真源四类卡
function loadCards(dir) {
  const d = path.join(SRC, dir), out = {};
  fs.readdirSync(d).filter(f => f.endsWith('.json')).forEach(f => {
    const o = readJson(path.join(d, f)); out[o.nodeId] = o;
  });
  return out;
}
const NODES = loadCards('nodes'), LESSONS = loadCards('lessons');
const ids = Object.keys(NODES).sort();

// G2 ALL_NODES 逐字段等于真源映射
if (MODS.nodes) {
  const byId = {}; MODS.nodes.ALL_NODES.forEach(n => { byId[n.id] = n; });
  let bad = [];
  ids.forEach(id => {
    const o = NODES[id], a = byId[id];
    const expect = {
      id: o.nodeId, n: o.title, p: o.points || [], pre: o.prerequisites || [],
      rel: o.relations || [], sig: o.signals || [], ap: o.approaches || [],
      d: o.description || '', domain: o.domain, domainName: o.domainName, module: o.module
    };
    if (!a || !eq(a, expect)) bad.push(id);
  });
  say(MODS.nodes.ALL_NODES.length === BASE_N && bad.length === 0,
    'G2 ALL_NODES ' + BASE_N + ' 节点逐字段等于真源（不符 ' + bad.length + (bad.length ? ':' + bad.join(',') : '') + '）');
  // SIGNAL_RULES 等于组织配置
  say(eq(MODS.nodes.SIGNAL_RULES, ORG.signalRules), 'G2 SIGNAL_RULES 等于组织配置');
}

// G3 LECTURES 六段式逐字段等于真源 lessons
if (MODS.lectures) {
  let bad = [], total = 0;
  MODS.lectures.LECTURES.forEach(g => g.points.forEach(p => {
    total++;
    const l = LESSONS[p.nodeId];
    const n = NODES[p.nodeId];
    if (!l || !n) { bad.push(p.nodeId + ':NO_SOURCE'); return; }
    const expect = {
      nodeId: p.nodeId, title: n.title, essence: l.essence, method: l.method || [],
      example: l.example || { q: '', a: '' }, pitfalls: l.pitfalls || [],
      links: l.links || '', check: l.check || []
    };
    if (!eq(p, expect)) bad.push(p.nodeId);
  }));
  say(total === BASE_N && bad.length === 0,
    'G3 LECTURES 六段式 ' + BASE_N + ' 点等于真源 lessons（不符 ' + bad.length + (bad.length ? ':' + bad.join(',') : '') + '）');
  const shells = MODS.lectures.LECTURES.map(t => ({ id: t.id, title: t.title, nodeIds: t.points.map(p => p.nodeId) }));
  const expShells = ORG.lectureShells.map(s => ({ id: s.id, title: s.title, nodeIds: s.nodeIds }));
  say(eq(shells, expShells), 'G3 LECTURES 专题外壳等于组织配置');
}

// G4 三视图覆盖同一节点集
if (MODS.nodes && MODS.lectures && MODS.themes) {
  const setOf = a => a.slice().sort().join('|');
  const allIds = setOf(ids);
  const allNodesIds = setOf(MODS.nodes.ALL_NODES.map(n => n.id));
  const lecIds = setOf(MODS.lectures.LECTURES.flatMap(g => g.points.map(p => p.nodeId)));
  const domIds = setOf(MODS.nodes.DOMAINS.flatMap(d => d.modules.flatMap(m => m.topics.map(t => t.id))));
  const thmIds = setOf(MODS.themes.THEMES.flatMap(t => t.nodeIds));
  say(allNodesIds === allIds && lecIds === allIds && domIds === allIds && thmIds === allIds,
    'G4 ALL_NODES / LECTURES / DOMAINS / THEMES 四视图覆盖同一 ' + BASE_N + ' 节点集');
  say(eq(MODS.themes.THEMES, ORG.themeShells.map(t => ({ id: t.id, name: t.name, sub: t.sub, tone: t.tone, nodeIds: t.nodeIds }))),
    'G4 THEMES 等于组织配置');
}

// G5 组织层内容等于配置
if (MODS.cards) say(eq(MODS.cards.CARDS, ORG.cards), 'G5 CARDS 等于组织配置');
if (MODS.topic_index) {
  say(eq(MODS.topic_index.TOPIC_ITEMS, ORG.topicItems) && eq(MODS.topic_index.TOPIC_GROUPS, ORG.topicGroups),
    'G5 题型索引 items/groups 等于组织配置');
  const tbn = {}; ORG.topicItems.forEach(it => (it.nodes || []).forEach(id => { (tbn[id] = tbn[id] || []).push(it.id); }));
  say(eq(MODS.topic_index.TOPICS_BY_NODE, tbn), 'G5 TOPICS_BY_NODE 由 items 正确派生');
}
if (MODS.content_meta) {
  say(eq(MODS.content_meta.DOMAIN_SOURCE, ORG.domainSource) && eq(MODS.content_meta.R2_CHECKED, ORG.r2Checked),
    'G5 证据元数据等于组织配置');
}

// G7 BRIDGES 忠实编译自 bridges.json + 富化字段/反向索引正确
if (MODS.bridges) {
  const bs = path.join(SRC, 'index/bridges.json');
  const bridgeSrc = fs.existsSync(bs) ? readJson(bs) : null;
  const srcEdges = bridgeSrc && Array.isArray(bridgeSrc.edges) ? bridgeSrc.edges : [];
  const b = MODS.bridges.BRIDGES;
  const coreOk = b.length === srcEdges.length && b.every((e, i) => e.from === srcEdges[i].from && e.to === srcEdges[i].to && e.kind === srcEdges[i].kind);
  say(coreOk, 'G7 BRIDGES ' + b.length + ' 条 from/to/kind 逐条等于 bridges.json');
  // 富化字段：fromName/toName/fromTheme/toTheme 与 ALL_NODES / THEME_OF 一致
  const byId = {}; (MODS.nodes ? MODS.nodes.ALL_NODES : []).forEach(n => { byId[n.id] = n; });
  const themeOf = MODS.themes ? MODS.themes.THEME_OF : {};
  const richOk = b.every(e =>
    e.fromName === (byId[e.from] ? byId[e.from].n : e.from) &&
    e.toName === (byId[e.to] ? byId[e.to].n : e.to) &&
    e.fromTheme === (themeOf[e.from] || '') && e.toTheme === (themeOf[e.to] || ''));
  say(richOk, 'G7 BRIDGES 富化字段（名称/主题）与 ALL_NODES、THEME_OF 一致');
  // 反向索引：按边重建后与 BRIDGES_BY_NODE 一致
  const idx = {};
  b.forEach((e, i) => {
    (idx[e.from] = idx[e.from] || { out: [], in: [] }).out.push(i);
    (idx[e.to] = idx[e.to] || { out: [], in: [] }).in.push(i);
  });
  say(eq(MODS.bridges.BRIDGES_BY_NODE, idx), 'G7 BRIDGES_BY_NODE 反向索引由边正确派生');
  // 端点必须在真源内
  const ghost = b.filter(e => !byId[e.from] || !byId[e.to]).map(e => e.from + '->' + e.to);
  say(ghost.length === 0, 'G7 BRIDGES 两端节点均在真源内（悬空 ' + ghost.length + '）');
}

// G6 头部标记
const MODULE_NAMES = ['nodes', 'lectures', 'cards', 'themes', 'topic_index', 'content_meta', 'bridges'];
const headOk = MODULE_NAMES.every(name => {
  const txt = fs.readFileSync(path.join(OUT, name + '.js'), 'utf8').split('\n').slice(0, 6).join('\n');
  return txt.indexOf('GENERATED FILE') >= 0 && txt.indexOf('version=' + manifest.version) >= 0;
});
say(headOk, 'G6 六个模块头部含 GENERATED FILE 与版本 ' + manifest.version);
const pending = manifest.reviewStats && manifest.reviewStats.pending;
const warnOk = pending > 0 ? MODULE_NAMES.every(name => {
  const txt = fs.readFileSync(path.join(OUT, name + '.js'), 'utf8').split('\n').slice(0, 6).join('\n');
  return txt.indexOf('未人工签核') >= 0;
}) : true;
say(warnOk, 'G6 过渡态警告头存在（pending=' + pending + '）');
say(MODULE_NAMES.every(name => fs.existsSync(path.join(OUT, name + '.js'))), 'G6 七个模块全部入库');

console.log('---');
console.log('RESULT=' + pass + '/' + (pass + fail) + ' FAILED=' + fail);
console.log('VERDICT=' + (fail === 0 ? 'PASSED' : 'FAILED'));
process.exit(fail ? 1 : 0);
