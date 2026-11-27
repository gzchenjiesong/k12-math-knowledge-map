#!/usr/bin/env node
'use strict';
// 全部变异仅发生于 VM 的 fs 覆盖层，执行磁盘上的真实脚本；不改真源、快照或应用文件。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createRequire } = require('module');
const contract = require('../tools/lib/content-contract');
const ROOT = path.resolve(__dirname, '..');
const absolute = rel => path.resolve(ROOT, rel);
const keyOf = p => path.resolve(p).replace(/\\/g, '/');
const clone = v => JSON.parse(JSON.stringify(v));
const SRC = absolute('reliable-data');
const OUT = keyOf(absolute('apps/miniprogram/data')) + '/';
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('OK   ' + name); }
  catch (e) { fail++; console.error('FAIL ' + name + ': ' + e.message); }
}
function jsonAt(rel, overlay) {
  const key = keyOf(absolute(rel));
  return JSON.parse(overlay && overlay.has(key) ? overlay.get(key) : fs.readFileSync(key, 'utf8'));
}
function put(overlay, rel, value) { overlay.set(keyOf(absolute(rel)), JSON.stringify(value, null, 2) + '\n'); }
const originals = contract.loadContent(fs, SRC);
const sourceRel = 'reliable-data/evidence/NODE_SOURCES.json';
// 来源任务未完成时，只用明确标识的内存夹具测试编译器；绝不把它写为真实来源或交付生成物。
const baseline = new Map();
if (!fs.existsSync(absolute(sourceRel))) {
  const anchor = jsonAt('reliable-data/evidence/SOURCES.json').sources[0].anchorId;
  const nodes = {};
  originals.ids.forEach(id => { nodes[id] = { references: [{ anchorId: anchor, purpose: 'scope', locator: '',
    verification: 'pending', note: '仅内存结构测试，不是来源核验记录' }], gaps: ['仅测试夹具，未提供真实来源映射'] }; });
  put(baseline, sourceRel, { schemaVersion: 1, updatedAt: '2026-11-26', nodes });
  console.log('SOURCE_DEPENDENCY=缺真实 NODE_SOURCES；成功构建用例仅在内存夹具中执行，不生成交付文件。');
}
function run(rel, input = baseline, args = []) {
  const files = new Map(input), writes = new Map(), mutations = [], reads = [], logs = [];
  const exit = { exitCode: 0, argv: [process.execPath, absolute(rel), ...args], env: {},
    exit(code) { this.exitCode = code; throw stop; } };
  const stop = {};
  const io = {
    readFileSync(p, encoding) {
      const key = keyOf(p); reads.push(key);
      if (!files.has(key)) return fs.readFileSync(key, encoding);
      if (files.get(key) === null) throw new Error('ENOENT: ' + key);
      return encoding ? String(files.get(key)) : Buffer.from(files.get(key));
    },
    existsSync(p) { const key = keyOf(p); return files.has(key) ? files.get(key) !== null : fs.existsSync(key); },
    readdirSync(p) {
      const dir = keyOf(p) + '/', names = new Set(fs.readdirSync(p));
      files.forEach((value, key) => {
        if (!key.startsWith(dir) || key.slice(dir.length).includes('/')) return;
        if (value === null) names.delete(key.slice(dir.length)); else names.add(key.slice(dir.length));
      });
      return [...names];
    },
    mkdirSync(p) { mutations.push('mkdir ' + keyOf(p)); },
    writeFileSync(p, value) {
      const key = keyOf(p); mutations.push('write ' + key); writes.set(key, String(value)); files.set(key, String(value));
    }
  };
  const safeFs = new Proxy(io, { get(target, prop) {
    if (prop in target) return target[prop];
    throw new Error('测试沙箱禁止未声明的 fs 操作：' + String(prop));
  } });
  const localRequire = createRequire(absolute(rel));
  const sandbox = { require: name => name === 'fs' ? safeFs : localRequire(name),
    __dirname: path.dirname(absolute(rel)), __filename: absolute(rel), process: exit,
    module: { exports: {} }, exports: {}, Buffer,
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) } };
  try { vm.runInNewContext(fs.readFileSync(absolute(rel), 'utf8'), sandbox, { filename: absolute(rel), timeout: 20000 }); }
  catch (e) { if (e !== stop) { exit.exitCode = 1; logs.push('UNCAUGHT ' + e.message); } }
  return { code: exit.exitCode, log: logs.join('\n'), files, writes, mutations, reads };
}
function build(input = baseline, args = ['--allow-pending']) { return run('tools/build-data.js', input, args); }
function loadGenerated(result, name) {
  const module = { exports: {} };
  vm.runInNewContext(result.writes.get(OUT + name + '.js'), { module });
  return module.exports;
}
function changeCard(overlay, kind, id, mutate, refresh = true) {
  const rel = 'reliable-data/' + kind + '/' + id + '.json';
  const card = jsonAt(rel, overlay); mutate(card);
  if (refresh) card.content_hash = contract.contentHash(card);
  put(overlay, rel, card);
  if (refresh) {
    const mf = jsonAt('reliable-data/manifest.json', overlay), entry = mf.entries[kind + '/' + id + '.json'];
    for (const f of ['nodeId', 'review', 'evidence', 'source_ref', 'content_hash']) entry[f] = card[f];
    const stats = { pending: 0, checked: 0, verified: 0, disputed: 0 };
    const ev = { A: 0, B: 0, C: 0 };
    Object.values(mf.entries).forEach(e => { if (e.review in stats) stats[e.review]++; if (e.evidence in ev) ev[e.evidence]++; });
    mf.reviewStats = stats; mf.evidenceStats = ev; mf.humanSignOff.verifiedCount = stats.verified;
    put(overlay, 'reliable-data/manifest.json', mf);
  }
}
function rejects(overlay, pattern, code = 1) {
  const result = build(overlay);
  assert.strictEqual(result.code, code, result.log);
  assert.match(result.log, pattern);
  assert.strictEqual(result.mutations.length, 0, '失败前发生写入/建目录');
  return result;
}
let compiled;
test('真实构建器接受当前真源，生成八文件，状态与来源绑定', () => {
  compiled = build(); assert.strictEqual(compiled.code, 0, compiled.log);
  assert.strictEqual(compiled.writes.size, 8);
  for (const file of compiled.writes.keys()) assert.ok(file.startsWith(OUT), '越界输出 ' + file);
  const meta = loadGenerated(compiled, 'content_meta');
  assert.strictEqual(meta.CONTENT_REVIEW.pending, originals.reviewStats.pending);
  for (const id of originals.ids) {
    const m = meta.metaFor(id, originals.cards.nodes[id].domain), l = originals.cards.lessons[id];
    assert.strictEqual(m.review, l.review); assert.strictEqual(m.evidence, l.evidence);
    assert.strictEqual(m.legacySourceRef, l.source_ref); assert.strictEqual(m.contentHash, l.content_hash);
    for (const k of contract.KINDS) assert.strictEqual(m.cards[k].legacySourceRef, originals.cards[k][id].source_ref);
    assert.strictEqual(m.sourceVersion, originals.manifest.version); assert.ok(m.sources.length || m.gaps.length);
  }
  assert.throws(() => meta.metaFor('unknown', 'junior'), /未知节点/);
});
test('来源展示独立断言：已核定位纠正学段，历史原文单独保留', () => {
  const meta = loadGenerated(compiled, 'content_meta');
  const m = meta.metaFor('j_alg');
  assert.ok(m.source.includes('第四学段·数与式；印刷54—55页 / PDF61—62页'));
  assert.ok(m.source.includes('2022年版') && m.source.includes('已核范围定位，非卡片签核'));
  assert.ok(!m.source.includes('第三学段（7—9年级）') && !m.source.includes('原件待补'));
  assert.strictEqual(m.legacySourceRef, originals.cards.lessons.j_alg.source_ref);
  const mapping = jsonAt(sourceRel, baseline);
  for (const id of originals.ids) {
    const refs = mapping.nodes[id].references.filter(r => r.verification === 'section_checked');
    const source = meta.metaFor(id).source;
    if (refs.length) refs.forEach(r => assert.ok(source.includes(r.locator), id + ' 遗漏已核定位'));
    else assert.match(source, /^暂无已核正文章节定位/);
  }
});
test('只有待核或目录引用时不伪装为已核正文，不回退旧教案来源', () => {
  for (const verification of ['pending', 'catalog_only']) {
    const overlay = new Map(baseline), sidecar = jsonAt(sourceRel, overlay), registry = jsonAt('reliable-data/evidence/SOURCES.json');
    const ref = sidecar.nodes.j_alg.references[0]; ref.verification = verification;
    if (verification === 'catalog_only') {
      registry.sources.find(s => s.anchorId === ref.anchorId).checkedSections.find(s => s.locator === ref.locator).verification = verification;
      for (const node of Object.values(sidecar.nodes)) for (const r of node.references) {
        if (r.anchorId === ref.anchorId && r.locator === ref.locator) r.verification = verification;
      }
    }
    put(overlay, sourceRel, sidecar); put(overlay, 'reliable-data/evidence/SOURCES.json', registry);
    const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
    const m = loadGenerated(result, 'content_meta').metaFor('j_alg');
    assert.match(m.source, /^暂无已核正文章节定位/);
    assert.strictEqual(m.legacySourceRef, originals.cards.lessons.j_alg.source_ref);
    assert.strictEqual(m.review, originals.cards.lessons.j_alg.review);
  }
});
test('日期更新和有效闰日可编译，无效日历日期在写入前拒绝', () => {
  for (const rel of [sourceRel, 'reliable-data/evidence/SOURCES.json']) {
    for (const updatedAt of ['2026-11-27', '2027-01-01', '2024-02-29']) {
      const overlay = new Map(baseline), value = jsonAt(rel, overlay); value.updatedAt = updatedAt; put(overlay, rel, value);
      const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
    }
    for (const updatedAt of [null, undefined, '', '2026-2-3', '2026-02-30', '2025-02-29', '2026-11-27T00:00:00Z']) {
      const overlay = new Map(baseline), value = jsonAt(rel, overlay); value.updatedAt = updatedAt; put(overlay, rel, value);
      rejects(overlay, /updatedAt/);
    }
  }
});
test('已核来源必须取得正文且匹配登记级别，目录不得升级', () => {
  for (const variant of ['catalog', 'not-acquired']) {
    const overlay = new Map(baseline), registry = jsonAt('reliable-data/evidence/SOURCES.json'), sidecar = jsonAt(sourceRel, overlay);
    const ref = sidecar.nodes.j_alg.references[0], anchor = registry.sources.find(s => s.anchorId === ref.anchorId);
    if (variant === 'catalog') anchor.checkedSections.find(s => s.locator === ref.locator).verification = 'catalog_only';
    else anchor.accessStatus = 'NOT_ACQUIRED';
    put(overlay, 'reliable-data/evidence/SOURCES.json', registry);
    rejects(overlay, /登记定位|未取得正文/);
  }
});
test('生成体积按 UTF-8 字节如实报告，不含外部原件或历史快照', () => {
  const report = JSON.parse(compiled.log.split('\n').find(line => line.startsWith('OUTPUT_BYTES=')).slice('OUTPUT_BYTES='.length));
  const files = {};
  for (const [file, text] of compiled.writes) {
    files[path.basename(file)] = Buffer.byteLength(text, 'utf8');
    assert.ok(!text.includes('%PDF-') && !text.includes('reliable-data/snapshots/'));
  }
  assert.deepStrictEqual(report.files, files);
  assert.strictEqual(report.total, Object.values(files).reduce((a, b) => a + b, 0));
  console.log('OUTPUT_BYTES=' + JSON.stringify(report));
});
test('字节级复现：内存重建两次且生成物不作为种子', () => {
  const again = build(compiled.files); assert.strictEqual(again.code, 0, again.log);
  assert.deepStrictEqual([...again.writes], [...compiled.writes]);
  assert.ok(!again.reads.some(p => p.startsWith(OUT)));
});
if (!baseline.has(keyOf(absolute(sourceRel)))) test('工作区八个生成文件逐字节等于真实输入的内存重建', () => {
  for (const [file, expected] of compiled.writes) assert.strictEqual(fs.readFileSync(file, 'utf8'), expected, '需运行 build-data 重建：' + file);
});
else console.log('BLOCK 工作区生成物字节比对：来源依赖未就绪，只验证内存构建。');
test('check-app-build 实际脚本验证内存生成物忠实呈现', () => {
  const result = run('tests/check-app-build.js', compiled.files);
  assert.strictEqual(result.code, 0, result.log); assert.strictEqual(result.mutations.length, 0);
});
test('缺来源 sidecar 时 exit2 且零写入', () => {
  const overlay = new Map(baseline); overlay.set(keyOf(absolute(sourceRel)), null);
  rejects(overlay, /NODE_SOURCES/, 2);
});
test('默认保守策略不把未签核判为内容错误，也不写文件', () => {
  const result = build(baseline, []);
  assert.strictEqual(result.code, 2, result.log); assert.match(result.log, /CONTENT_REVIEW=/);
  assert.match(result.log, /不是产品交付禁令/); assert.strictEqual(result.mutations.length, 0);
});
for (const [name, mutate, pattern] of [
  ['未知来源', s => { s.nodes.s_complex.references[0].anchorId = 'MISSING'; }, /未知 anchorId/],
  ['错误来源用途', s => { s.nodes.s_complex.references[0].purpose = 'answer_verified'; }, /purpose/],
  ['错误来源状态', s => { s.nodes.s_complex.references[0].verification = 'verified'; }, /verification/],
  ['缺少节点', s => { delete s.nodes.s_complex; }, /节点集/],
  ['悬空节点', s => { s.nodes.ghost = clone(s.nodes.s_complex); }, /节点集/],
  ['空来源与缺口', s => { s.nodes.s_complex = { references: [], gaps: [] }; }, /明示缺口/],
  ['已定位却无位置', s => { Object.assign(s.nodes.s_complex.references[0], { verification: 'section_checked', locator: '' }); }, /locator/],
  ['伪造已核位置', s => { Object.assign(s.nodes.s_complex.references[0], { verification: 'section_checked', locator: '未登记的正文位置' }); }, /登记定位/]
]) test('错误来源 fail-fast：' + name, () => {
  const overlay = new Map(baseline), sidecar = jsonAt(sourceRel, overlay);
  mutate(sidecar); put(overlay, sourceRel, sidecar); rejects(overlay, pattern);
});
test('来源重复 anchorId 与畸形状态 fail-fast', () => {
  for (const duplicate of [true, false]) {
    const overlay = new Map(baseline), ev = jsonAt('reliable-data/evidence/SOURCES.json');
    if (duplicate) ev.sources.push(clone(ev.sources[0])); else ev.sources[0].originalStatus = 12;
    put(overlay, 'reliable-data/evidence/SOURCES.json', ev); rejects(overlay, /anchorId|originalStatus/);
  }
});
test('范围来源不能被错误引用为题目答案依据', () => {
  const overlay = new Map(baseline), ev = jsonAt('reliable-data/evidence/SOURCES.json'), sidecar = jsonAt(sourceRel, overlay);
  ev.sources[0].purposes = ['scope'];
  sidecar.nodes.s_complex.references = [{ anchorId: ev.sources[0].anchorId, purpose: 'example',
    locator: '仅内存夹具', verification: 'pending', note: '测试错误引用' }];
  put(overlay, 'reliable-data/evidence/SOURCES.json', ev); put(overlay, sourceRel, sidecar);
  rejects(overlay, /purpose 超出/);
});
test('新增来源与获取状态变化不受历史 8/7 固定计数限制', () => {
  const overlay = new Map(baseline), ev = jsonAt('reliable-data/evidence/SOURCES.json');
  ev.sources.push({ ...ev.sources[0], anchorId: 'TEST-ONLY', originalStatus: 'IN_REPO' });
  ev.sources[0].originalStatus = 'IN_REPO'; put(overlay, 'reliable-data/evidence/SOURCES.json', ev);
  const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
  const extra = run('tests/check-reliable-extra.js', overlay); assert.match(extra.log, /OK\s+E7e/);
});
for (const [name, kind, mutate, pattern] of [
  ['单改示范题目', 'examples', c => { c.items[0].question = '不同题设'; }, /DUPLICATE/],
  ['单改示范答案', 'examples', c => { c.items[0].answer = '99'; }, /DUPLICATE/],
  ['单改易错镜像', 'pitfalls', c => { c.items[0].mistake = '独立改错未同步'; }, /DUPLICATE/],
  ['非法审核状态', 'lessons', c => { c.review = 'approved'; }, /review/],
  ['伪 verified 缺签核', 'lessons', c => { c.review = 'verified'; }, /verified/],
  ['错误结构', 'lessons', c => { c.method = [99, null]; }, /method/],
  ['重复条目', 'pitfalls', c => { c.items[1].id = c.items[0].id; }, /重复条目/],
  ['错误 nodeId', 'lessons', c => { c.nodeId = 'wrong'; }, /nodeId/]
]) test('更新 hash 仍须通过内容契约：' + name, () => {
  const overlay = new Map(baseline); changeCard(overlay, kind, 's_complex', mutate); rejects(overlay, pattern);
});
test('组织层悬空引用 fail-fast，不能被 filter 静默丢弃', () => {
  for (const field of ['domainModules', 'lectureShells']) {
    const overlay = new Map(baseline), org = jsonAt('reliable-data/source/app_organization.json');
    if (field === 'domainModules') org.domainModules[0].modules[0].nodeIds.push('ghost');
    else org.lectureShells[0].nodeIds.push('ghost');
    put(overlay, 'reliable-data/source/app_organization.json', org); rejects(overlay, /真源外节点/, 2);
  }
});
test('未知构建参数和无效JSON均零写入', () => {
  const badArgs = build(baseline, ['--force']); assert.strictEqual(badArgs.code, 2); assert.strictEqual(badArgs.mutations.length, 0);
  const overlay = new Map(baseline); overlay.set(keyOf(absolute(sourceRel)), '{invalid');
  const badJson = build(overlay); assert.strictEqual(badJson.code, 1); assert.strictEqual(badJson.mutations.length, 0);
});
test('旧 hash 与 manifest 错配分别阻止写入', () => {
  const stale = new Map(baseline); changeCard(stale, 'lessons', 's_complex', c => { c.essence += '修改'; }, false);
  rejects(stale, /content_hash/);
  const overlay = new Map(baseline); changeCard(overlay, 'lessons', 's_complex', c => { c.essence += '修改'; });
  put(overlay, 'reliable-data/manifest.json', originals.manifest); rejects(overlay, /manifest.entries/);
});
test('独立教学扩展不是镜像：修改纠正字段可进入 CARDS', () => {
  const overlay = new Map(baseline); changeCard(overlay, 'pitfalls', 's_complex', c => { c.items[0].correction = '仅内存：新的纠正说明'; });
  const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
  const c = loadGenerated(result, 'cards').CARDS.s_complex;
  assert.ok(c.explain.some(e => e.points.includes('仅内存：新的纠正说明')));
});
test('同步修改镜像后独立卡输出进入讲解与 CARDS，元数据重新绑定', () => {
  const overlay = new Map(baseline);
  changeCard(overlay, 'lessons', 's_complex', c => { c.example.a += ' 内存变异'; });
  changeCard(overlay, 'examples', 's_complex', c => { c.items[0].answer += ' 内存变异'; });
  const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
  const lesson = loadGenerated(result, 'lectures').LECTURES.flatMap(g => g.points).find(p => p.nodeId === 's_complex');
  assert.match(lesson.example.a, /内存变异$/);
  assert.strictEqual(loadGenerated(result, 'cards').CARDS.s_complex.examples[0].solution, lesson.example.a);
  assert.notStrictEqual(loadGenerated(result, 'content_meta').metaFor('s_complex').bindingHash,
    loadGenerated(compiled, 'content_meta').metaFor('s_complex').bindingHash);
});
test('六节点补充内容全部保留，9 道不同例题不被误判或覆盖', () => {
  const org = jsonAt('reliable-data/source/app_organization.json').cards, output = loadGenerated(compiled, 'cards');
  assert.ok(contract.equal(output.SUPPLEMENTAL_CARDS, org));
  assert.strictEqual(Object.keys(output.CARDS).length, originals.ids.length);
  for (const [id, c] of Object.entries(org)) {
    const extra = output.CARDS[id].examples.slice(originals.cards.examples[id].items.length);
    extra.forEach((it, i) => { const { origin, ...body } = it;
      assert.ok(contract.equal(body, c.examples[i])); assert.match(origin.path, /app_organization.json#cards/);
      assert.strictEqual(origin.review, 'pending'); });
  }
});
test('当前 checked 与带签核字段的 verified 不被 E7 永久 pending 假设阻塞', () => {
  for (const review of ['checked', 'verified', 'disputed']) {
    const overlay = new Map(baseline);
    changeCard(overlay, 'lessons', 's_complex', c => {
      c.review = review;
      if (review === 'verified') { c.reviewer = '仅内存测试签核字段，不是真实人工验收'; c.date = '2026-11-26'; }
    });
    const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
    assert.strictEqual(loadGenerated(result, 'content_meta').metaFor('s_complex').review, review);
    const extra = run('tests/check-reliable-extra.js', overlay);
    assert.match(extra.log, /OK\s+E7a/); assert.match(extra.log, /OK\s+E7b/);
  }
});
test('来源升级不提升 card review，已登记定位改动使展示与绑定变化', () => {
  const overlay = new Map(baseline), s = jsonAt(sourceRel, overlay);
  const anchor = jsonAt('reliable-data/evidence/SOURCES.json').sources.find(a => a.anchorId === s.nodes.s_complex.references[0].anchorId);
  const locator = anchor.checkedSections.find(section => section.verification === 'section_checked').locator;
  Object.assign(s.nodes.s_complex.references[0], { verification: 'pending', locator });
  put(overlay, sourceRel, s);
  const before = build(overlay); assert.strictEqual(before.code, 0, before.log);
  s.nodes.s_complex.references[0].verification = 'section_checked'; put(overlay, sourceRel, s);
  const result = build(overlay); assert.strictEqual(result.code, 0, result.log);
  const m = loadGenerated(result, 'content_meta').metaFor('s_complex');
  assert.strictEqual(m.review, originals.cards.lessons.s_complex.review);
  assert.ok(m.source.includes(locator));
  assert.notStrictEqual(m.source, loadGenerated(before, 'content_meta').metaFor('s_complex').source);
  assert.notStrictEqual(m.bindingHash, loadGenerated(before, 'content_meta').metaFor('s_complex').bindingHash);
});
test('真实 E6 基线读取当前发布内容且通过', () => {
  const result = run('tests/check-reliable-extra.js');
  assert.strictEqual(result.code, 0, result.log); assert.match(result.log, /OK\s+E6/);
  assert.strictEqual(result.mutations.length, 0);
});
test('E6 所有17个 expectation 均读取发布答案，不只验证脚本内常数', () => {
  const ids = ['j_quad', 's_ineq', 's_exp', 's_vec', 'o_numfun', 'j_prob', 'o_cong', 'o_fermat', 'j_alg',
    'o_geo_trans', 's_seq', 'o_recur', 's_count', 'o_comb_adv', 'j_simi', 's_prob', 's_complex'];
  for (const id of ids) {
    const overlay = new Map(baseline);
    changeCard(overlay, 'lessons', id, c => { c.example.a = '99'; });
    changeCard(overlay, 'examples', id, c => { c.items[0].answer = c.items[0].conclusion = '99'; });
    const result = run('tests/check-reliable-extra.js', overlay);
    assert.strictEqual(result.code, 1, id + ': ' + result.log);
    assert.match(result.log, /FAIL E6/); assert.ok(result.log.includes('CROSS ' + id));
    assert.match(result.log, /OK\s+E1a/); assert.match(result.log, /OK\s+E1b/);
  }
});
for (const variant of ['all99', 'lesson99', 'example99', 'conclusion99', 'question']) test('真实 E6 抓到更新 hash 的发布内容变异：' + variant, () => {
  const overlay = new Map(baseline);
  if (variant === 'all99' || variant === 'lesson99') changeCard(overlay, 'lessons', 's_complex', c => { c.example.a = '99'; });
  if (variant === 'all99' || variant === 'example99' || variant === 'conclusion99') {
    changeCard(overlay, 'examples', 's_complex', c => {
      if (variant !== 'conclusion99') c.items[0].answer = '99';
      if (variant !== 'example99') c.items[0].conclusion = '99';
    });
  }
  if (variant === 'question') {
    changeCard(overlay, 'lessons', 's_complex', c => { c.example.q = c.example.q.replace('=2', '=4'); });
    changeCard(overlay, 'examples', 's_complex', c => { c.items[0].question = c.items[0].question.replace('=2', '=4'); });
  }
  const result = run('tests/check-reliable-extra.js', overlay);
  assert.strictEqual(result.code, 1, result.log); assert.match(result.log, /FAIL E6/); assert.match(result.log, /CROSS s_complex/);
  assert.match(result.log, /OK\s+E1a/); assert.match(result.log, /OK\s+E1b/);
  assert.strictEqual(result.mutations.length, 0);
});
test('合理公式规范化：ASCII 减号与空白不误报', () => {
  const overlay = new Map(baseline);
  changeCard(overlay, 'lessons', 's_complex', c => { c.example.a = c.example.a.replace(/−/g, '-'); c.example.q = '已知（1 + i）z = 2，求 z'; });
  changeCard(overlay, 'examples', 's_complex', c => { c.items[0].answer = c.items[0].answer.replace(/−/g, '-'); c.items[0].question = '已知（1 + i）z = 2，求 z'; c.items[0].conclusion = 'z = 1 - i'; });
  const result = run('tests/check-reliable-extra.js', overlay);
  assert.strictEqual(result.code, 0, result.log); assert.match(result.log, /OK\s+E6/);
});
test('verify_content 实际脚本只读可靠真源并阻止错误99', () => {
  const good = run('tests/verify_content.js'); assert.strictEqual(good.code, 0, good.log);
  assert.ok(!good.reads.some(p => p.startsWith(OUT)));
  const overlay = new Map(baseline);
  changeCard(overlay, 'lessons', 's_complex', c => { c.example.a = '99'; });
  changeCard(overlay, 'examples', 's_complex', c => { c.items[0].answer = c.items[0].conclusion = '99'; });
  const bad = run('tests/verify_content.js', overlay); assert.strictEqual(bad.code, 1, bad.log);
  assert.match(bad.log, /FAIL C1 s_complex/); assert.strictEqual(bad.mutations.length, 0);
});
test('E8 检查历史快照内容哈希，不只是文件存在', () => {
  for (const version of ['v1.0.0', 'v2.0.0']) {
    const overlay = new Map(baseline), rel = 'reliable-data/snapshots/' + version + '/lessons/s_complex.json';
    const old = jsonAt(rel); old.example.a = '99'; put(overlay, rel, old);
    const result = run('tests/check-reliable-extra.js', overlay);
    assert.strictEqual(result.code, 1); assert.match(result.log, /FAIL E8/);
    assert.strictEqual(result.mutations.length, 0);
    old.content_hash = contract.contentHash(old); put(overlay, rel, old);
    const mfRel = 'reliable-data/snapshots/' + version + '/manifest.json', mf = jsonAt(mfRel);
    mf.entries['lessons/s_complex.json'].content_hash = old.content_hash; put(overlay, mfRel, mf);
    const rehashed = run('tests/check-reliable-extra.js', overlay);
    assert.strictEqual(rehashed.code, 1); assert.match(rehashed.log, /FAIL E8/);
  }
});
test('退役旧 seed：无参数、force、旧 seed 参数均 exit2，零读取零写入', () => {
  for (const args of [[], ['--force'], ['--seed', 'apps/miniprogram/data']]) {
    const result = run('tools/build-reliable-data.js', baseline, args);
    assert.strictEqual(result.code, 2, result.log); assert.match(result.log, /RETIRED_REVERSE_SEED/);
    assert.strictEqual(result.reads.length, 0); assert.strictEqual(result.mutations.length, 0);
  }
});
console.log('RESULT=' + pass + '/' + (pass + fail) + ' FAILED=' + fail);
console.log('VERDICT=' + (fail ? 'FAILED' : 'PASSED'));
console.log('CONTENT_REVIEW=未作人工或多模型验收；所有合成来源与签核字段只存在于内存测试夹具。');
process.exitCode = fail ? 1 : 0;
