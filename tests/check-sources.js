#!/usr/bin/env node
'use strict';

// 只检查来源登记、定位契约和可获得原件的字节完整性，不核准数学内容。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const PURPOSES = new Set(['scope', 'definition', 'example', 'teaching']);
const VERIFICATIONS = new Set(['section_checked', 'catalog_only', 'pending']);
const ACCESS = new Set(['DOWNLOADED', 'WEB_PAGE_CHECKED', 'NOT_ACQUIRED', 'IN_REPO']);
const ORIGINAL = new Set(['DOWNLOADED', 'MISSING_LOCAL_COPY', 'IN_REPO']);
const LEGACY_IDS = ['EV-A01', 'EV-A02', 'EV-A03', 'EV-A04', 'EV-A05', 'EV-N01', 'EV-B01', 'EV-C01'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function publicUrl(value) {
  if (!text(value)) return false;
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password; }
  catch { return false; }
}
function safeOriginal(value) {
  return typeof value === 'string' && /^resource_data\/official\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(value);
}

function validate(registry, mapping, nodeIds, readOriginal) {
  const errors = [];
  const originals = [];
  const stats = { nodes: 0, references: 0, scopeNodes: 0, nodesWithGaps: 0, gapEntries: 0, definitionChecked: 0, exampleChecked: 0 };
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(object(registry) && registry.schemaVersion === 1, 'SOURCES.schemaVersion 必须为1');
  check(object(mapping) && mapping.schemaVersion === 1, 'NODE_SOURCES.schemaVersion 必须为1');
  check(object(mapping) && date(mapping.updatedAt), 'NODE_SOURCES.updatedAt 必须为有效日期');
  check(object(registry) && date(registry.updatedAt), 'SOURCES.updatedAt 必须为有效日期');
  check(Array.isArray(nodeIds) && nodeIds.length === 67 && nodeIds.every(text) && new Set(nodeIds).size === 67, '真源必须为67个独立nodeId');
  if (!object(registry) || !Array.isArray(registry.sources) || !object(mapping) || !object(mapping.nodes)) {
    errors.push('缺少sources数组或nodes对象');
    return { errors, originals, stats };
  }
  const sources = new Map();
  const originalPaths = new Set();
  let checkedDocuments = 0;

  function downloaded(record, label) {
    check(record.accessStatus === 'DOWNLOADED' && record.originalStatus === 'DOWNLOADED', label + ' 下载与原件状态不一致');
    check(publicUrl(record.url), label + ' 宣称下载但URL为空或无效');
    check(date(record.retrievedAt), label + ' 下载缺少有效retrievedAt');
    check(record.httpStatus === 200 && record.contentType === 'application/pdf', label + ' 下载缺少HTTP200/PDF类型记录');
    if (record.effectiveUrl !== undefined) check(publicUrl(record.effectiveUrl), label + ' effectiveUrl无效');
    check(safeOriginal(record.original), label + ' 原件必须为resource_data/official/下安全PDF路径');
    check(Number.isSafeInteger(record.bytes) && record.bytes > 0, label + ' bytes必须为正整数');
    check(typeof record.sha256 === 'string' && /^[a-f0-9]{64}$/.test(record.sha256), label + ' sha256必须为64位小写十六进制');
    if (!safeOriginal(record.original)) return;
    check(!originalPaths.has(record.original), label + ' 原件路径重复登记');
    originalPaths.add(record.original);
    try {
      const bytes = readOriginal(record.original);
      if (bytes === null) {
        originals.push({ label, path: record.original, status: 'NOT_PRESENT', expectedBytes: record.bytes, expectedSha256: record.sha256 });
        return;
      }
      if (!Buffer.isBuffer(bytes)) throw new Error('原件读取器未返回Buffer');
      const hash = sha256(bytes);
      const matches = bytes.length === record.bytes && hash === record.sha256 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
      check(matches, label + ' 原件字节数、sha256或PDF文件头不匹配');
      originals.push({ label, path: record.original, status: matches ? 'HASH_OK' : 'HASH_MISMATCH', bytes: bytes.length, sha256: hash });
    } catch (error) {
      errors.push(label + ' 原件读取失败（不能当作NOT_PRESENT）：' + error.message);
      originals.push({ label, path: record.original, status: 'READ_ERROR' });
    }
  }

  for (const source of registry.sources) {
    if (!object(source)) { errors.push('source条目必须为对象'); continue; }
    const id = source.anchorId;
    check(text(id) && !sources.has(id), '来源anchorId为空或重复：' + id);
    if (text(id)) sources.set(id, source);
    for (const field of ['title', 'publisher', 'version', 'section', 'rights', 'note']) {
      check(text(source[field]), id + ' 缺少非空' + field);
    }
    check(ACCESS.has(source.accessStatus), id + ' accessStatus非法');
    check(ORIGINAL.has(source.originalStatus), id + ' originalStatus非法');
    check(['A', 'B', 'C'].includes(source.evidence), id + ' evidence非法');
    check(Array.isArray(source.purposes) && source.purposes.length > 0 && source.purposes.every(p => PURPOSES.has(p)), id + ' purposes非法');
    check(Array.isArray(source.checkedSections), id + ' checkedSections必须为数组');
    check(source.url === null || publicUrl(source.url), id + ' url必须为公开URL或明确null');
    check(source.retrievedAt === null || date(source.retrievedAt), id + ' retrievedAt必须为有效日期或null');
    if (source.accessStatus === 'DOWNLOADED' || source.originalStatus === 'DOWNLOADED') downloaded(source, id);
    if (source.accessStatus === 'WEB_PAGE_CHECKED') {
      check(publicUrl(source.url) && date(source.retrievedAt), id + ' 已访问页面缺URL或日期');
      check(source.originalStatus === 'MISSING_LOCAL_COPY' && source.original === null && source.sha256 === null, id + ' 仅页面访问不能宣称本地正文');
    }
    if (source.accessStatus === 'NOT_ACQUIRED') {
      check(source.originalStatus === 'MISSING_LOCAL_COPY' && source.retrievedAt === null && source.sha256 === null, id + ' 未取得来源却宣称有原件或获取日期/哈希');
    }
    if (source.accessStatus === 'IN_REPO') {
      check(source.originalStatus === 'IN_REPO' && text(source.original), id + ' 仓内来源路径或状态缺失');
    }
    const sections = Array.isArray(source.checkedSections) ? source.checkedSections : [];
    const locators = new Set();
    for (const section of sections) {
      if (!object(section)) { errors.push(id + ' 定位记录必须为对象'); continue; }
      check(text(section.locator) && !locators.has(section.locator), id + ' 章节定位为空或重复');
      locators.add(section.locator);
      check(['section_checked', 'catalog_only'].includes(section.verification) && text(section.note), id + ' 章节核实类型或说明缺失');
      check(source.accessStatus === 'DOWNLOADED', id + ' 未取得正文不得登记已读PDF章节');
      check(Number.isInteger(source.pageCount) && source.pageCount > 0 && Array.isArray(section.pdfPages)
        && section.pdfPages.length > 0 && section.pdfPages.every(p => Number.isInteger(p) && p >= 1 && p <= source.pageCount), id + ' PDF页码越界或为空');
    }
    if (source.accessStatus === 'DOWNLOADED' && sections.some(s => object(s) && s.verification === 'section_checked')) checkedDocuments++;
    if (source.alternateCopies !== undefined) {
      check(Array.isArray(source.alternateCopies), id + ' alternateCopies必须为数组');
      for (const [i, copy] of (Array.isArray(source.alternateCopies) ? source.alternateCopies : []).entries()) {
        if (!object(copy)) { errors.push(id + ' 备用本必须为对象'); continue; }
        downloaded(copy, id + '/alternate-' + (i + 1));
        check(VERIFICATIONS.has(copy.verification) && text(copy.note), id + ' 备用本核实状态或说明缺失');
      }
    }
  }
  for (const id of LEGACY_IDS) check(sources.has(id), '丢失existing anchorId：' + id);
  check(checkedDocuments >= 2, '至少需要两份不同来源登记的已取得、已核对数学章节正文（备用副本不重复计数）');
  check(Array.isArray(registry.gaps) && registry.gaps.length > 0 && registry.gaps.every(text), '需保留版本及整体证据缺口');
  const actual = Object.keys(mapping.nodes);
  check(actual.length === 67, '节点映射数量不是67：' + actual.length);
  const ids = new Set(nodeIds);
  for (const id of nodeIds) check(Object.hasOwn(mapping.nodes, id), '漏映射：' + id);
  for (const id of actual) {
    check(ids.has(id), '悬空节点：' + id);
    const entry = mapping.nodes[id];
    if (!object(entry)) { errors.push(id + ' 映射必须为对象'); continue; }
    stats.nodes++;
    check(Object.keys(entry).every(k => ['references', 'gaps'].includes(k)), id + ' 节点契约存在未知字段');
    check(Array.isArray(entry.references) && entry.references.length > 0, id + ' references不能为空');
    check(Array.isArray(entry.gaps) && entry.gaps.every(text), id + ' gaps必须为非空字符串数组或空数组');
    if (Array.isArray(entry.gaps) && entry.gaps.length) { stats.nodesWithGaps++; stats.gapEntries += entry.gaps.length; }
    const refs = Array.isArray(entry.references) ? entry.references : [];
    const unique = new Set();
    let scope = false;
    let definition = false;
    let example = false;
    for (const ref of refs) {
      stats.references++;
      if (!object(ref)) { errors.push(id + ' 引用必须为对象'); continue; }
      const label = id + '/' + ref.anchorId;
      check(Object.keys(ref).length === 5 && ['anchorId', 'purpose', 'locator', 'verification', 'note'].every(k => Object.hasOwn(ref, k)), label + ' 引用字段不符合固定契约');
      check(PURPOSES.has(ref.purpose), label + ' purpose非法');
      check(VERIFICATIONS.has(ref.verification), label + ' verification非法');
      check(text(ref.locator) && text(ref.note), label + ' locator/note不能为空');
      const key = [ref.anchorId, ref.purpose, ref.locator].join('|');
      check(!unique.has(key), label + ' 重复引用'); unique.add(key);
      const source = sources.get(ref.anchorId);
      check(!!source, label + ' 引用未注册来源');
      if (!source) continue;
      check(Array.isArray(source.purposes) && source.purposes.includes(ref.purpose), label + ' 用途超出来源登记（范围依据不能当题解证据）');
      if (ref.anchorId === 'EV-C01') {
        check(ref.verification === 'pending', label + ' 原创内容不得自证权威通过');
        check(ref.locator === 'reliable-data/lessons/' + id + '.json', label + ' 原创教学引用必须独立对应本节点');
      }
      if (ref.verification !== 'pending') {
        const section = Array.isArray(source.checkedSections) && source.checkedSections.find(s => object(s) && s.locator === ref.locator);
        check(!!section && section.verification === ref.verification, label + ' 已核引用没有同级别的实际登记定位（不能将目录升级为正文）');
        check(source.accessStatus === 'DOWNLOADED', label + ' 未取得正文却声称章节已核');
      }
      if (ref.verification === 'section_checked' && source.evidence !== 'C') {
        if (ref.purpose === 'scope') scope = true;
        if (ref.purpose === 'definition') definition = true;
        if (ref.purpose === 'example') example = true;
      }
    }
    if (scope) stats.scopeNodes++;
    if (definition) stats.definitionChecked++;
    if (example) stats.exampleChecked++;
    if (!definition || !example) check(Array.isArray(entry.gaps) && entry.gaps.length > 0, id + ' 定义或例题缺证必须如实列gap');
  }
  return { errors, originals, stats };
}

function load() {
  const json = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
  const nodeIds = fs.readdirSync(path.join(ROOT, 'reliable-data/nodes')).filter(f => f.endsWith('.json')).sort()
    .map(f => json('reliable-data/nodes/' + f).nodeId);
  return { registry: json('reliable-data/evidence/SOURCES.json'), mapping: json('reliable-data/evidence/NODE_SOURCES.json'), nodeIds };
}
function readOriginal(relative) {
  const file = path.join(ROOT, relative);
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!stat.isFile()) throw new Error('不是普通文件');
  const official = fs.realpathSync(path.join(ROOT, 'resource_data/official'));
  const resolved = fs.realpathSync(file);
  const inside = path.relative(official, resolved);
  if (inside.startsWith('..') || path.isAbsolute(inside)) throw new Error('原件链接越出official目录');
  return fs.readFileSync(file);
}

// 变异全部在内存中进行：不重写真源、原件、其他tests或snapshots。
function selfTest(data) {
  const cases = [];
  const clone = () => JSON.parse(JSON.stringify(data));
  const run = (d, reader = () => null) => validate(d.registry, d.mapping, d.nodeIds, reader);
  const first = d => d.mapping.nodes.j_alg.references[0];
  function reject(name, mutate, message) {
    const d = clone(); mutate(d);
    const result = run(d);
    assert(result.errors.some(e => e.includes(message)), name + ' 未拦截：' + result.errors.join('; '));
    cases.push(name);
  }
  const absent = run(clone());
  assert.equal(absent.errors.length, 0, absent.errors.join('\n'));
  const expectedOriginals = data.registry.sources.reduce((n, s) => n +
    [s, ...(s.alternateCopies || [])].filter(o => o.accessStatus === 'DOWNLOADED' || o.originalStatus === 'DOWNLOADED').length, 0);
  assert.equal(absent.originals.filter(o => o.status === 'NOT_PRESENT').length, expectedOriginals);
  assert.equal(absent.originals.filter(o => o.status === 'HASH_OK').length, 0);
  cases.push('换机器缺原件时按当前登记报告NOT_PRESENT，不固定文件数或伪造哈希成功');
  const nextDate = new Date(data.mapping.updatedAt); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  for (const updatedAt of [nextDate.toISOString().slice(0, 10), '2024-02-29', '2027-01-01']) {
    const d = clone(); d.mapping.updatedAt = updatedAt; d.registry.updatedAt = updatedAt;
    assert.equal(run(d).errors.length, 0, '合法更新日期被拒绝：' + updatedAt);
  }
  cases.push('允许后续更新日期、跨年及有效闰日，不锁死创建日期');
  for (const field of ['mapping', 'registry']) {
    for (const value of [null, undefined, '', '2026-11-27T00:00:00Z', '2026-2-3', '2026-02-30', '2026-13-01', '2025-02-29']) {
      reject(field + ' 拒绝无效updatedAt：' + String(value), d => { d[field].updatedAt = value; },
        (field === 'mapping' ? 'NODE_SOURCES' : 'SOURCES') + '.updatedAt 必须为有效日期');
    }
  }
  const extra = clone(), copy = JSON.parse(JSON.stringify(extra.registry.sources[0].alternateCopies[0]));
  copy.original = 'resource_data/official/self-test-extra.pdf';
  extra.registry.sources[0].alternateCopies.push(copy);
  const extraResult = run(extra);
  assert.equal(extraResult.errors.length, 0, extraResult.errors.join('\n'));
  assert.equal(extraResult.originals.filter(o => o.status === 'NOT_PRESENT').length, expectedOriginals + 1);
  cases.push('新增备用原件不被历史原件数量阻塞');
  reject('漏节点', d => { delete d.mapping.nodes.j_alg; }, '漏映射');
  reject('悬空节点', d => { d.mapping.nodes.unknown = d.mapping.nodes.j_alg; }, '悬空节点');
  reject('未注册source', d => { first(d).anchorId = 'EV-UNKNOWN'; }, '未注册来源');
  reject('purpose枚举', d => { first(d).purpose = 'answer'; }, 'purpose非法');
  reject('verification枚举', d => { first(d).verification = 'verified'; }, 'verification非法');
  reject('空获取标题', d => { d.registry.sources[0].title = ''; }, 'title');
  reject('空获取URL', d => { d.registry.sources[0].url = ''; }, 'URL为空');
  reject('空获取日期', d => { d.registry.sources[0].retrievedAt = null; }, 'retrievedAt');
  reject('重复anchor', d => { d.registry.sources.push(d.registry.sources[0]); }, 'anchorId为空或重复');
  reject('正文定位造假', d => { first(d).locator = '未读取的PDF999页'; }, '实际登记定位');
  reject('目录不得升级正文', d => { d.registry.sources[0].checkedSections.find(s => s.locator === first(d).locator).verification = 'catalog_only'; }, '不能将目录升级');
  reject('范围不得当例题依据', d => { first(d).purpose = 'example'; }, '用途超出来源');
  reject('原创不得自证', d => { d.mapping.nodes.j_alg.references[1].verification = 'section_checked'; }, '原创内容不得自证');
  reject('缺口不得抹去', d => { d.mapping.nodes.j_alg.gaps = []; }, '必须如实列gap');
  reject('文件路径逃逸', d => { d.registry.sources[0].original = 'resource_data/official/../../private.pdf'; }, '安全PDF路径');
  reject('PDF页码越界', d => { d.registry.sources[0].checkedSections[0].pdfPages = [999]; }, '页码越界');
  reject('独立节点定位', d => { d.mapping.nodes.j_alg.references[1].locator = 'reliable-data/lessons/j_num.json'; }, '独立对应本节点');
  reject('保留旧anchor', d => { d.registry.sources = d.registry.sources.filter(s => s.anchorId !== 'EV-A04'); }, 'existing anchorId');
  reject('备用原件元数据', d => { d.registry.sources[0].alternateCopies[0].sha256 = 'bad'; }, 'sha256必须');
  const fixture = clone();
  const pdf = Buffer.from('%PDF-1.6\n仅用于内存哈希测试\n');
  const source = fixture.registry.sources[0]; source.bytes = pdf.length; source.sha256 = sha256(pdf);
  const reader = name => name === source.original ? pdf : null;
  assert.equal(run(fixture, reader).errors.length, 0);
  assert.equal(run(fixture, reader).originals.filter(o => o.status === 'HASH_OK').length, 1);
  cases.push('存在原件同时核对bytes和sha256');
  source.sha256 = '0'.repeat(64);
  assert(run(fixture, reader).errors.some(e => e.includes('不匹配')));
  cases.push('哈希篡改必失败');
  source.sha256 = sha256(pdf); source.bytes++;
  assert(run(fixture, reader).errors.some(e => e.includes('不匹配')));
  cases.push('字节数篡改必失败');
  assert(run(clone(), () => { throw new Error('EACCES'); }).errors.some(e => e.includes('不能当作NOT_PRESENT')));
  cases.push('读取错误不能伪装文件不存在');
  for (const name of cases) console.log('OK SELF_TEST ' + name);
  console.log('SELF_TEST=' + cases.length + '/' + cases.length);
  return cases.length;
}

function main() {
  try {
    const data = load();
    const result = validate(data.registry, data.mapping, data.nodeIds, readOriginal);
    for (const item of result.originals) console.log(item.status + ' ' + JSON.stringify(item));
    for (const error of result.errors) console.error('FAIL ' + error);
    const s = result.stats;
    console.log('COVERAGE=' + s.nodes + '/67 REFERENCES=' + s.references + ' SCOPE_SECTION_CHECKED=' + s.scopeNodes + '/67');
    console.log('GAP_NODES=' + s.nodesWithGaps + '/67 GAP_ENTRIES=' + s.gapEntries + ' DEFINITION_CHECKED=' + s.definitionChecked + ' EXAMPLE_CHECKED=' + s.exampleChecked);
    console.log('ORIGINALS_EXPECTED=' + result.originals.length + ' HASH_CHECKED=' + result.originals.filter(o => o.status === 'HASH_OK').length
      + ' NOT_PRESENT=' + result.originals.filter(o => o.status === 'NOT_PRESENT').length);
    let tested = 0;
    if (process.argv.includes('--self-test') && result.errors.length === 0) tested = selfTest(data);
    console.log('RESULT=' + (result.errors.length ? '0/1' : '1/1') + ' FAILED=' + result.errors.length + (tested ? ' SELF_TEST_PASSED=' + tested : ''));
    console.log('VERDICT=' + (result.errors.length ? 'FAILED' : 'PASSED'));
    console.log('边界：PASSED仅指追溯结构与已存在原件的哈希；NOT_PRESENT不是哈希成功。范围定位、目录核对、数学正确性、多模型复核和人工签核彼此不同。');
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) {
    console.error('FAIL ' + error.message);
    console.log('RESULT=0/1 FAILED=1\nVERDICT=FAILED');
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { validate };
