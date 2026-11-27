'use strict';
// 定向结构契约，不是通用 JSON Schema 引擎，也不核验数学或签名人的真实身份。
// 扩展字段允许保留；已消费的字段、四态、签核必填项、哈希、来源与镜像必须通过。
const path = require('path');
const crypto = require('crypto');
const KINDS = ['nodes', 'lessons', 'pitfalls', 'examples'];
const REVIEW_STATES = ['pending', 'checked', 'verified', 'disputed'];
const KIND = { nodes: 'node', lessons: 'lesson', pitfalls: 'pitfall', examples: 'example' };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const equal = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (!object(v)) return v;
  const out = {};
  Object.keys(v).sort().forEach(k => { Object.defineProperty(out, k, { value: canon(v[k]), enumerable: true }); });
  return out;
}
function hashValue(v) { return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(canon(v)), 'utf8').digest('hex'); }
function contentHash(v) { const c = { ...v }; delete c.content_hash; return hashValue(c); }
function demand(ok, location, message) {
  if (!ok) throw new Error(location + ': ' + message);
}
function strings(v, min, location) {
  demand(Array.isArray(v) && v.length >= min && v.every(text), location, '应为非空字符串数组，至少 ' + min + ' 项');
}
function reviewErrors(card) {
  const errors = [];
  if (!REVIEW_STATES.includes(card.review)) errors.push('review 非法');
  if (card.reviewer != null && !text(card.reviewer)) errors.push('reviewer 类型非法');
  if (card.date != null && !text(card.date)) errors.push('date 类型非法');
  if (card.review === 'verified' && (!text(card.reviewer) || !text(card.date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(card.date) || Number.isNaN(Date.parse(card.date)))) {
    errors.push('verified 缺有效 reviewer/date 签核记录');
  }
  return errors;
}
function validateCard(o, kind, file) {
  const at = kind + '/' + file;
  demand(object(o), at, '卡片必须是对象');
  demand(text(o.nodeId) && /^[a-z][a-z0-9_]*$/.test(o.nodeId) && file === o.nodeId + '.json', at, '文件名与 nodeId 不一致或非法');
  demand(o.kind === KIND[kind] && o.id === KIND[kind] + '-' + o.nodeId, at, 'kind/id 不一致');
  for (const f of ['title', 'domainName', 'module', 'source_ref', 'version']) demand(text(o[f]), at + '.' + f, '缺非空字符串');
  demand(['primary', 'junior', 'senior', 'olympiad'].includes(o.domain), at, 'domain 非法');
  demand(['A', 'B', 'C'].includes(o.evidence), at, 'evidence 非法');
  demand(reviewErrors(o).length === 0, at, reviewErrors(o).join('；'));
  demand(/^sha256:[0-9a-f]{64}$/.test(o.content_hash) && contentHash(o) === o.content_hash, at, 'content_hash 与当前内容不符');
  if (kind === 'nodes') {
    for (const f of ['points', 'prerequisites', 'relations', 'signals', 'approaches']) strings(o[f], 0, at + '.' + f);
    demand(typeof o.description === 'string', at, 'description 应为字符串');
  } else if (kind === 'lessons') {
    for (const f of ['essence', 'links']) demand(text(o[f]), at + '.' + f, '缺非空字符串');
    for (const f of ['method', 'pitfalls', 'check']) strings(o[f], 2, at + '.' + f);
    demand(object(o.example) && text(o.example.q) && text(o.example.a), at + '.example', '题目/答案缺失');
  } else {
    const min = kind === 'pitfalls' ? 2 : 1;
    demand(Array.isArray(o.items) && o.items.length >= min, at + '.items', '条目数量不足或非数组');
    const seen = new Set();
    o.items.forEach((it, i) => {
      demand(object(it), at + '.items[' + i + ']', '条目应为对象');
      const fields = kind === 'pitfalls' ? ['id', 'mistake', 'trigger', 'rootCause', 'correction'] : ['id', 'question', 'answer', 'conclusion'];
      fields.forEach(f => demand(text(it[f]), at + '.items[' + i + '].' + f, '缺非空字符串'));
      demand(!seen.has(it.id), at, '重复条目 id ' + it.id); seen.add(it.id);
      for (const f of kind === 'pitfalls' ? ['selfCheck'] : ['category', 'provenance', 'reasoningAnchor']) {
        if (it[f] !== undefined) demand(typeof it[f] === 'string', at + '.' + f, '应为字符串');
      }
      if (it.theoremConditions !== undefined) strings(it.theoremConditions, 0, at + '.theoremConditions');
    });
  }
}
function validateMirrors(cards) {
  // 仅这三项是既有镜像；conclusion 是摘要，trigger/correction/selfCheck 等是独立教学扩展。
  // 不把扩展字段或 ORG.cards 的不同例题强制等同于教案内容。
  for (const id of Object.keys(cards.nodes)) {
    const l = cards.lessons[id], e = cards.examples[id].items[0], p = cards.pitfalls[id];
    demand(l.example.q === e.question, id, 'DUPLICATE lessons.example.q ≠ examples.items[0].question');
    demand(l.example.a === e.answer, id, 'DUPLICATE lessons.example.a ≠ examples.items[0].answer');
    demand(equal(l.pitfalls, p.items.map(it => it.mistake)), id, 'DUPLICATE lessons.pitfalls ≠ pitfalls.items[].mistake');
  }
}
function validateSources(registry, sidecar, ids) {
  demand(object(registry) && Array.isArray(registry.sources) && registry.sources.length > 0, 'SOURCES', '缺非空 sources 数组');
  const anchors = Object.create(null);
  for (const s of registry.sources) {
    demand(object(s), 'SOURCES', '来源应为对象');
    for (const f of ['anchorId', 'title', 'version', 'originalStatus']) demand(text(s[f]), 'SOURCES.' + f, '缺非空字符串');
    demand(/^[A-Z][A-Z0-9_]*$/.test(s.originalStatus), 'SOURCES.' + s.anchorId, 'originalStatus 应为明确状态代码');
    // 获取状态可扩展；不推断 DOWNLOADED 等于正文核验。只消费明确声明的可选用途约束。
    if (s.accessStatus !== undefined) demand(typeof s.accessStatus === 'string' && /^[A-Z][A-Z0-9_]*$/.test(s.accessStatus), 'SOURCES.' + s.anchorId, 'accessStatus 非法');
    if (s.purposes !== undefined) demand(Array.isArray(s.purposes) && s.purposes.length > 0 &&
      s.purposes.every(p => ['scope', 'definition', 'example', 'teaching'].includes(p)), 'SOURCES.' + s.anchorId, 'purposes 非法');
    demand(!anchors[s.anchorId], 'SOURCES', '重复 anchorId ' + s.anchorId);
    anchors[s.anchorId] = s;
  }
  if (sidecar === undefined) return anchors;
  demand(date(registry.updatedAt), 'SOURCES.updatedAt', '必须为有效日期');
  demand(object(sidecar) && sidecar.schemaVersion === 1 && date(sidecar.updatedAt) &&
    object(sidecar.nodes), 'NODE_SOURCES', 'schemaVersion/updatedAt/nodes 非法');
  demand(equal(Object.keys(sidecar.nodes).sort(), ids.slice().sort()), 'NODE_SOURCES', '节点集必须与当前真源完全相等');
  for (const id of ids) {
    const node = sidecar.nodes[id];
    demand(object(node) && Array.isArray(node.references) && Array.isArray(node.gaps), 'NODE_SOURCES.' + id, '缺 references/gaps 数组');
    strings(node.gaps, 0, 'NODE_SOURCES.' + id + '.gaps');
    demand(node.references.length > 0 || node.gaps.length > 0, 'NODE_SOURCES.' + id, '无引用时必须明示缺口');
    const seen = new Set();
    for (const r of node.references) {
      demand(object(r) && text(r.anchorId) && !!anchors[r.anchorId], 'NODE_SOURCES.' + id, '未知 anchorId');
      demand(['scope', 'definition', 'example', 'teaching'].includes(r.purpose), 'NODE_SOURCES.' + id, 'purpose 非法');
      const allowed = anchors[r.anchorId].purposes;
      demand(allowed === undefined || allowed.includes(r.purpose), 'NODE_SOURCES.' + id, 'purpose 超出来源声明用途，范围依据不能为例题答案背书');
      demand(['section_checked', 'catalog_only', 'pending'].includes(r.verification), 'NODE_SOURCES.' + id, 'verification 非法');
      demand(typeof r.locator === 'string' && typeof r.note === 'string', 'NODE_SOURCES.' + id, 'locator/note 必须是字符串');
      demand(r.verification === 'pending' || text(r.locator), 'NODE_SOURCES.' + id, '已定位引用必须有 locator');
      if (r.verification !== 'pending') {
        const anchor = anchors[r.anchorId];
        const section = Array.isArray(anchor.checkedSections) && anchor.checkedSections.find(s => object(s) && s.locator === r.locator);
        demand(section && section.verification === r.verification, 'NODE_SOURCES.' + id, '已核引用必须匹配登记定位及核对级别，目录不能升级为正文');
        demand(anchor.accessStatus === 'DOWNLOADED', 'NODE_SOURCES.' + id, '未取得正文不能声明已核引用');
        demand(r.anchorId !== 'EV-C01', 'NODE_SOURCES.' + id, '原创内容不得自证已核');
      }
      const key = [r.anchorId, r.purpose, r.locator].join('\0');
      demand(!seen.has(key), 'NODE_SOURCES.' + id, '重复来源引用'); seen.add(key);
    }
  }
  return anchors;
}
function loadContent(fs, src) {
  const read = rel => JSON.parse(fs.readFileSync(path.join(src, rel), 'utf8'));
  const manifest = read('manifest.json');
  const total = manifest.domainBaseline && manifest.domainBaseline.total;
  demand(text(manifest.version) && text(manifest.generatedAt) && Number.isInteger(total) && total > 0, 'manifest', '版本/时间/节点基线非法');
  demand(object(manifest.entries) && object(manifest.counts), 'manifest', '缺 entries/counts');
  const cards = {}, reviewStats = { pending: 0, checked: 0, verified: 0, disputed: 0 }, evidenceStats = { A: 0, B: 0, C: 0 };
  const entries = [];
  for (const k of KINDS) {
    cards[k] = Object.create(null);
    const files = fs.readdirSync(path.join(src, k)).filter(f => f.endsWith('.json')).sort();
    demand(files.length === total && manifest.counts[k] === total, k, '卡片数量与基线不一致');
    for (const file of files) {
      const o = read(k + '/' + file); validateCard(o, k, file);
      demand(!cards[k][o.nodeId], k, '重复 nodeId ' + o.nodeId); cards[k][o.nodeId] = o;
      const key = k + '/' + file, entry = manifest.entries[key]; entries.push(key);
      for (const f of ['nodeId', 'review', 'evidence', 'source_ref', 'content_hash']) {
        demand(entry && entry[f] === o[f], 'manifest.entries.' + key + '.' + f, '未绑定当前卡片');
      }
      reviewStats[o.review]++; evidenceStats[o.evidence]++;
    }
  }
  const ids = Object.keys(cards.nodes).sort();
  for (const k of KINDS) {
    demand(equal(Object.keys(cards[k]).sort(), ids), k, '节点集不一致');
    ids.forEach(id => demand(cards[k][id].domain === cards.nodes[id].domain, k + '/' + id, '学段不一致'));
  }
  const domainCounts = {};
  ids.forEach(id => { const d = cards.nodes[id].domain; domainCounts[d] = (domainCounts[d] || 0) + 1; });
  demand(equal({ ...domainCounts, total }, manifest.domainBaseline), 'manifest.domainBaseline', '分层数量不一致');
  demand(equal(Object.keys(manifest.entries).sort(), entries.sort()), 'manifest.entries', '文件集合不一致');
  demand(manifest.counts.totalCards === entries.length, 'manifest.counts', 'totalCards 不一致');
  for (const [k, f] of [['pitfalls', 'pitfallItems'], ['examples', 'exampleItems']]) {
    demand(manifest.counts[f] === ids.reduce((n, id) => n + cards[k][id].items.length, 0), 'manifest.counts.' + f, '条目数不一致');
  }
  demand(equal(reviewStats, manifest.reviewStats) && equal(evidenceStats, manifest.evidenceStats), 'manifest', 'reviewStats/evidenceStats 与当前卡片不一致');
  demand(object(manifest.humanSignOff) && manifest.humanSignOff.verifiedCount === reviewStats.verified, 'manifest.humanSignOff', 'verifiedCount 与当前卡片不一致');
  validateMirrors(cards);
  return { manifest, cards, ids, reviewStats };
}
function loadSourceMapping(fs, src, ids) {
  const file = path.join(src, 'evidence/NODE_SOURCES.json');
  if (!fs.existsSync(file)) {
    const error = new Error('缺 reliable-data/evidence/NODE_SOURCES.json；请等待来源任务提供真实映射，未生成任何文件。');
    error.code = 'SOURCE_DEPENDENCY'; throw error;
  }
  const registry = JSON.parse(fs.readFileSync(path.join(src, 'evidence/SOURCES.json'), 'utf8'));
  const sidecar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const anchors = validateSources(registry, sidecar, ids);
  return { registry, sidecar, anchors };
}
function buildMetadata(data, mapping) {
  const { cards, ids, manifest, reviewStats } = data;
  const { registry, sidecar, anchors } = mapping;
  const sourceRegistryHash = hashValue(registry), sourceMapHash = hashValue(sidecar);
  const nodes = {};
  for (const id of ids) {
    const l = cards.lessons[id], refs = sidecar.nodes[id];
    const cardMeta = {};
    for (const k of KINDS) {
      const c = cards[k][id];
      cardMeta[k] = { review: c.review, evidence: c.evidence, legacySourceRef: c.source_ref, version: c.version,
        contentHash: c.content_hash, reviewer: c.reviewer || null, date: c.date || null };
    }
    const sources = refs.references.map(r => {
      const anchor = anchors[r.anchorId];
      const source = { ...r, title: anchor.title, version: anchor.version, originalStatus: anchor.originalStatus };
      // 仅附带已经登记的可回查字段；旧登记无这些字段时不猜造值。
      for (const f of ['url', 'publisher', 'accessStatus', 'rights']) if (anchor[f] !== undefined) source[f] = anchor[f];
      return source;
    });
    const purposeLabels = { scope: '范围', definition: '定义', example: '例题', teaching: '教学' };
    const checked = sources.filter(s => s.verification === 'section_checked');
    const source = checked.length ? checked.map(s => s.title + '｜版本：' + s.version + '｜' + s.locator +
      '（已核' + purposeLabels[s.purpose] + '定位，非卡片签核）').join('\n')
      : '暂无已核正文章节定位；详见来源缺口，待核或目录引用不作为已核正文依据。';
    // 展示取已登记定位；旧 source_ref 单独留痕，不回写卡片，也不升级当前审核状态。
    nodes[id] = { source, legacySourceRef: l.source_ref, evidence: l.evidence, review: l.review, note: l.reviewNote || '',
      wording: l.evidence, wordingNote: '讲解状态取自当前教案卡；资料定位与机械检查不等于人工核准。',
      sourceVersion: manifest.version, contentHash: l.content_hash, cards: cardMeta, sources, gaps: refs.gaps,
      sourceMappingVersion: { schemaVersion: sidecar.schemaVersion, updatedAt: sidecar.updatedAt },
      sourceRegistryHash, sourceMapHash,
      bindingHash: hashValue({ sourceVersion: manifest.version, cards: cardMeta, sources, gaps: refs.gaps, sourceRegistryHash, sourceMapHash }) };
  }
  return { nodes, contentReview: { ...reviewStats, scope: '四类真源卡，不含组织层补充内容',
    status: reviewStats.verified === ids.length * KINDS.length ? 'RECORDED_VERIFIED' : 'NOT_FULLY_VERIFIED',
    note: '构建成功仅表示结构与来源绑定通过，不证明内容正确，也不代替人工或多模型核验。' } };
}
module.exports = { KINDS, REVIEW_STATES, canon, equal, contentHash, hashValue, reviewErrors,
  validateCard, validateMirrors, validateSources, loadContent, loadSourceMapping, buildMetadata };
