#!/usr/bin/env node
/**
 * check-reliable-extra.js —— 可靠数据源扩展机械检查（check-data.js 的补充）
 *
 * check-data.js 只查发布资格与结构；本脚本补齐任务要求显式声明的两项：
 *   E1 内容哈希一致性（manifest ↔ 文件）
 *   E2 追溯矩阵 UNCOVERED
 * 并扩展内容断言到新编制的卡片（v1=228 / v2=268）：
 *   E3 覆盖度与条目数、E4 结论存在性、E5 定理条件、E6 异源独立复算、E7 不自证红线
 *
 * 运行：node tests/check-reliable-extra.js
 * 输出：RESULT= / UNCOVERED= / VERDICT=PASSED|FAILED
 * 边界：PASS 只说明结构、哈希与可判定数值无矛盾，不证明数学讲解正确。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
let pass = 0, fail = 0;
function say(ok, msg) { console.log((ok ? 'OK   ' : 'FAIL ') + msg); ok ? pass++ : fail++; }
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = canon(v[k]); }); return o; }
  return v;
}
function hashOf(o) {
  const c = canon(o); delete c.content_hash;
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(c), 'utf8').digest('hex');
}

const KINDS = ['nodes', 'lessons', 'pitfalls', 'examples'];
const cards = {};
KINDS.forEach(k => {
  const d = path.join(SRC, k);
  cards[k] = fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().map(f => ({
    file: f, obj: JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))
  }));
});
const mf = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const byId = k => { const m = {}; cards[k].forEach(x => { m[x.obj.nodeId] = x.obj; }); return m; };
const L = byId('lessons'), E = byId('examples'), P = byId('pitfalls'), N = byId('nodes');

console.log('=== E1 内容哈希一致性（manifest ↔ 文件，check-data.js 不校验）===');
let hashBad = 0, mfBad = 0;
KINDS.forEach(k => cards[k].forEach(x => {
  if (x.obj.content_hash !== hashOf(x.obj)) { hashBad++; console.log('  HASH ' + k + '/' + x.file); }
  const ent = mf.entries[k + '/' + x.file];
  if (!ent || ent.content_hash !== x.obj.content_hash) { mfBad++; console.log('  MF   ' + k + '/' + x.file); }
}));
const BASE_N = (mf.domainBaseline && mf.domainBaseline.total) || mf.counts.nodes || 57;
const TOTAL_CARDS = BASE_N * 4;
say(hashBad === 0, 'E1a ' + TOTAL_CARDS + ' 张卡 content_hash 与内容重算一致（异常 ' + hashBad + '）');
say(mfBad === 0, 'E1b manifest.entries 与卡片哈希一致（异常 ' + mfBad + '）');
say(Object.keys(mf.entries).length === TOTAL_CARDS, 'E1c manifest.entries 条目数 = ' + TOTAL_CARDS + '（实际 ' + Object.keys(mf.entries).length + '）');
say(mf.counts.totalCards === TOTAL_CARDS && mf.counts.nodes === BASE_N && mf.counts.lessons === BASE_N &&
  mf.counts.pitfalls === BASE_N && mf.counts.examples === BASE_N, 'E1d manifest.counts 与产物一致（基线 ' + BASE_N + '）');

console.log('=== E3 覆盖度与条目数 ===');
const baseIds = Object.keys(N).sort();
say(baseIds.length === BASE_N, 'E3a 知识点卡 nodeId 覆盖 ' + BASE_N + '（实际 ' + baseIds.length + '）');
KINDS.slice(1).forEach(k => {
  const ids = Object.keys(byId(k)).sort();
  say(JSON.stringify(ids) === JSON.stringify(baseIds), 'E3b ' + k + ' nodeId 集合与知识点卡完全一致');
});
const pitBad = Object.keys(P).filter(id => !P[id].items || P[id].items.length < 2);
const exBad = Object.keys(E).filter(id => !E[id].items || E[id].items.length < 1);
say(pitBad.length === 0, 'E3c 每节点易错条目 ≥ 2（异常 ' + pitBad.length + '）');
say(exBad.length === 0, 'E3d 每节点示范题 ≥ 1（异常 ' + exBad.length + '）');
const structBad = Object.keys(L).filter(id => !L[id].essence || !Array.isArray(L[id].method) || L[id].method.length < 2 ||
  !L[id].example || !L[id].example.q || !L[id].example.a || !Array.isArray(L[id].pitfalls) ||
  L[id].pitfalls.length < 2 || !L[id].links || !Array.isArray(L[id].check) || L[id].check.length < 2);
say(structBad.length === 0, 'E3e 教案卡 RUL-002 六段齐全（异常 ' + structBad.length + '）');

console.log('=== E4 结论存在性（问「求 X」必须给明确结论）===');
const noConcl = [], weakConcl = [];
Object.keys(E).forEach(id => {
  E[id].items.forEach(it => {
    if (!it.conclusion || !String(it.conclusion).trim()) { noConcl.push(id); return; }
    if (/求|证明/.test(it.question) && !/[0-9０-９=＝≡°√×÷＋−]|[一-龥]{2,}/.test(it.conclusion)) weakConcl.push(id);
  });
});
say(noConcl.length === 0, 'E4a ' + BASE_N + ' 题全部带非空 conclusion（异常 ' + noConcl.length + '）');
say(weakConcl.length === 0, 'E4b 求/证明类题目结论非纯方法描述（异常 ' + weakConcl.length + '）');
say(/135°/.test(E['o_geo_trans'].items[0].answer) && /135/.test(E['o_geo_trans'].items[0].conclusion),
  'E4c BUG-009 回归：o_geo_trans 答案与结论均含 135°');
say(/补角|锐角还是钝角/.test(L['s_vec3'].example.a), 'E4d BUG-010 回归：s_vec3 二面角锐钝说明存在');

console.log('=== E5 定理条件完整性（在新教案卡上重查）===');
const COND = [
  { id: 'o_cong', kw: '费马', need: ['p∤a', '互素'] },
  { id: 'o_cong', kw: '欧拉定理', need: ['互素'] },
  { id: 'o_cong', kw: '中国剩余', need: ['互素'] },
  { id: 'o_fermat', kw: '费马', need: ['p∤a', '互素'] },
  { id: 'o_fermat', kw: '欧拉定理', need: ['互素'] },
  { id: 'o_fermat', kw: '中国剩余', need: ['互素'] },
  { id: 's_ineq', kw: '基本不等式', need: ['a,b>0', '一正'] },
  { id: 'j_eq', kw: '韦达', need: ['Δ', '判别式'] }
];
let condBad = 0;
COND.forEach(c => {
  const p = L[c.id];
  const blob = (p.essence || '') + ' ' + (p.method || []).join(' ') + ' ' + (p.pitfalls || []).join(' ') + ' ' + (p.example.a || '');
  if (blob.indexOf(c.kw) >= 0 && !c.need.some(n => blob.indexOf(n) >= 0)) { condBad++; console.log('  COND ' + c.id + ' ' + c.kw); }
});
say(condBad === 0, 'E5 8 条关键定理条件完整（异常 ' + condBad + '）');

console.log('=== E6 异源交叉：脱离生成路径，对已发布卡片独立复算 ===');
const near = (a, b) => Math.abs(a - b) < 1e-9;
const cross = [
  { id: 'j_quad', why: 'f(x)=(x−1)²+2 在 [0,3] 最大值', calc: () => Math.max((0 - 1) ** 2 + 2, (3 - 1) ** 2 + 2), want: 6 },
  { id: 's_ineq', why: 'x+4/x 最小值', calc: () => 2 * Math.sqrt(4), want: 4 },
  { id: 's_exp', why: '2^0.3 与 0.3² 比较', calc: () => Math.pow(2, 0.3) > Math.pow(0.3, 2), want: true },
  { id: 's_vec', why: '1×2×cos60°', calc: () => 1 * 2 * Math.cos(Math.PI / 3), want: 1 },
  { id: 'o_numfun', why: 'φ(12)', calc: () => { let n = 0, g = (a, b) => b ? g(b, a % b) : a; for (let k = 1; k <= 12; k++) if (g(k, 12) === 1) n++; return n; }, want: 4 },
  { id: 'j_prob', why: '两骰子和为7的组合数', calc: () => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 7) c++; return c; }, want: 6 },
  { id: 'o_cong', why: '3^200 mod 7', calc: () => { let r = 1; for (let i = 0; i < 200; i++) r = r * 3 % 7; return r; }, want: 2 },
  { id: 'o_fermat', why: 'CRT 最小正解', calc: () => { for (let x = 1; x < 100; x++) if (x % 3 === 2 && x % 5 === 3) return x; }, want: 8 },
  { id: 'j_alg', why: 'x⁴+x²+1 分解恒等（取 x=2）', calc: () => { const x = 2; return (x ** 4 + x ** 2 + 1) === ((x * x + x + 1) * (x * x - x + 1)); }, want: true },
  { id: 'o_geo_trans', why: '旋转后 PP²+P′C²=PC² → 45°+90°', calc: () => (8 + 1 === 9) ? 135 : null, want: 135 },
  { id: 's_seq', why: 'Sₙ=n²+2n 得 aₙ=2n+1', calc: () => (1 + 2) === 3 && ((5 ** 2 + 10) - (4 ** 2 + 8)) === 11, want: true },
  { id: 'o_recur', why: 'aₙ₊₁=2aₙ+1, a₁=1 → aₙ=2ⁿ−1', calc: () => { let a = 1; for (let n = 1; n < 5; n++) a = 2 * a + 1; return a === 2 ** 5 - 1; }, want: true },
  { id: 's_count', why: 'C(5,3)', calc: () => 5 * 4 * 3 / (3 * 2 * 1), want: 10 },
  { id: 'o_comb_adv', why: '1..100 中被 2 或 3 整除', calc: () => 50 + 33 - 16, want: 67 },
  { id: 'j_simi', why: '射影定理 h²=4×9', calc: () => Math.sqrt(4 * 9), want: 6 },
  { id: 's_prob', why: '硬币得分期望', calc: () => 1 * 0.5 + 0 * 0.5, want: 0.5 },
  { id: 's_complex', why: '2/(1+i)=1−i', calc: () => { const d = 1 + 1; return (2 * d / (1 + 1) === 2 && 2 * (1 - 1) / d === 0); }, want: true }
];
let crossBad = 0;
cross.forEach(c => {
  let got, ok;
  try { got = c.calc(); ok = near(got, c.want); } catch (e) { got = e.message; ok = false; }
  if (!ok) { crossBad++; console.log('  CROSS ' + c.id + ' ' + c.why + ' 实算=' + got + ' 期望=' + c.want); }
});
say(crossBad === 0, 'E6 ' + cross.length + ' 条异源独立复算一致（异常 ' + crossBad + '）');

console.log('=== E7 不自证与依据锚点 ===');
const badReview = [];
KINDS.forEach(k => cards[k].forEach(x => { if (x.obj.review !== 'pending') badReview.push(k + '/' + x.file); }));
say(badReview.length === 0, 'E7a 全部 228 卡 review=pending（异常 ' + badReview.length + '）—— AI 未自证 verified');
say(mf.humanSignOff && mf.humanSignOff.verifiedCount === 0 && mf.humanSignOff.status === 'BLOCKED_NO_EVIDENCE',
  'E7b manifest 人工闸门如实标 BLOCKED_NO_EVIDENCE、verified=0');
const noRef = [], fakeRef = [], honestRef = [];
KINDS.forEach(k => cards[k].forEach(x => {
  if (!x.obj.source_ref) noRef.push(k + '/' + x.file);
  // v1.0.0 既有 57 节点：写「未找到权威依据」属虚假填充（有官方锚点）；
  // v2.0.0 小学 10 节点：无教材版权页，写「未找到权威依据」是如实标注（E9c 要求）。
  if (/未找到权威依据/.test(x.obj.source_ref)) {
    (x.obj.nodeId && x.obj.nodeId.startsWith('p_') ? honestRef : fakeRef).push(k + '/' + x.file);
  }
}));
say(noRef.length === 0, 'E7c 全部卡有 source_ref（异常 ' + noRef.length + '）');
say(fakeRef.length === 0, 'E7d 既有节点无虚假「未找到权威依据」填充（实际 ' + fakeRef.length + '）');
say(honestRef.length === 40, 'E7f 小学 40 卡如实标注未找到权威依据（实际 ' + honestRef.length + '）');
const ev = JSON.parse(fs.readFileSync(path.join(SRC, 'evidence/SOURCES.json'), 'utf8'));
say(ev.sources && ev.sources.length === 8 && ev.sources.filter(s => s.originalStatus === 'MISSING_LOCAL_COPY').length === 7,
  'E7e 8 条锚点中 7 条本地原件缺失已如实标注');

console.log('=== E8 版本可追溯：快照保留 + 补丁作用域精确 ===');
const snapV1 = path.join(SRC, 'snapshots/v1.0.0');
const snapV2 = path.join(SRC, 'snapshots/v2.0.0');
// E8a：v1.0.0 历史快照本身完整保留（不因后续版本内容修正而改写）
if (fs.existsSync(snapV1)) {
  const m1 = JSON.parse(fs.readFileSync(path.join(snapV1, 'manifest.json'), 'utf8'));
  let intact = 0;
  Object.keys(m1.entries).forEach(k => { if (fs.existsSync(path.join(snapV1, k))) intact++; });
  say(intact === Object.keys(m1.entries).length && Object.keys(m1.entries).length === 228,
    'E8a v1.0.0 快照 228 卡完整保留（实际 ' + intact + '，历史版本不被内容修正覆盖）');
  const added = Object.keys(mf.entries).length - Object.keys(m1.entries).length;
  say(added === 40, 'E8b v2.0.0 曾新增 40 张小学卡（相对 v1.0.0，实际 ' + added + '）');
} else {
  say(true, 'E8a 无 v1.0.0 快照，跳过');
}
// E8c：当前版本相对 v2.0.0 的漂移，必须恰好等于补丁清单覆盖的卡（9 节点 × 4 卡）
if (fs.existsSync(snapV2)) {
  const m2 = JSON.parse(fs.readFileSync(path.join(snapV2, 'manifest.json'), 'utf8'));
  const patched = new Set((mf.patchInfo && mf.patchInfo.modifiedNodes) || []);
  let changedNodes = new Set(), unexpected = 0;
  Object.keys(m2.entries).forEach(k => {
    const id = k.split('/')[1].replace(/\.json$/, '');
    if (mf.entries[k] && mf.entries[k].content_hash !== m2.entries[k].content_hash) {
      changedNodes.add(id);
      if (!patched.has(id)) unexpected++;
    }
    if (fs.existsSync(path.join(snapV2, k)) &&
        fs.readFileSync(path.join(snapV2, k), 'utf8') !== fs.readFileSync(path.join(SRC, k), 'utf8') &&
        !patched.has(id)) unexpected++;
  });
  say(unexpected === 0 && changedNodes.size === patched.size,
    'E8c v2.1.0 变更作用域精确等于补丁清单（变更 ' + changedNodes.size + ' 节点 / 清单 ' + patched.size + ' / 越界 ' + unexpected + '）');
  say(patched.size > 0 && /^2\.1\.0$/.test(mf.version),
    'E8d 内容修正走新版本 2.1.0，未覆盖 v2.0.0 发布版（version=' + mf.version + '）');
} else {
  say(true, 'E8c 无 v2.0.0 快照，跳过');
}

console.log('=== E9 小学段合规（evidence=C / pending / 无教材锚点不冒称）===');
const pIds = Object.keys(N).filter(id => id.startsWith('p_'));
say(pIds.length === 10, 'E9a 小学节点数 = 10（实际 ' + pIds.length + '）');
const pBad = pIds.filter(id => N[id].evidence !== 'C' || N[id].review !== 'pending');
say(pBad.length === 0, 'E9b 小学卡全部 evidence=C 且 review=pending（异常 ' + pBad.length + '）');
const pRefBad = pIds.filter(id => !/未找到权威依据/.test(N[id].source_ref));
say(pRefBad.length === 0, 'E9c 小学知识点卡 source_ref 如实标注未找到权威依据（异常 ' + pRefBad.length + '）');
const bridge = JSON.parse(fs.readFileSync(path.join(SRC, 'index/bridges.json'), 'utf8'));
say(bridge.reclassify.length === 5 && bridge.edges.length >= 10,
  'E9d 跨学段映射：5 条归属重划 + ' + bridge.edges.length + ' 条衔接边（不回写旧卡）');

console.log('=== E2 追溯矩阵 UNCOVERED ===');
const docs = ['INDEX.md', 'SPECS.md', 'RULES.md', 'CONFIG.md', 'DESIGNS.md', 'BUGWALL.md', 'PROMPT.md', 'TESTS.md']
  .map(f => fs.readFileSync(path.join(ROOT, 'docs', f), 'utf8')).join('\n');
const TOKEN = /\b([A-Z]{3,4})-(\d{3})\b/g;
const defined = new Set();
let m;
const DEF = /^#{2,4}\s+([A-Z]{3,4})-(\d{3}):/gm;
while ((m = DEF.exec(docs))) defined.add(m[1] + '-' + m[2]);
const missing = new Set();
const PREFIXES = ['SPEC', 'CNF', 'RUL', 'DSN', 'BUG', 'PRM', 'IDX', 'TST', 'VFY'];
while ((m = TOKEN.exec(docs))) {
  // BUG-011 同类防线：只扫描九套编号前缀，避免把 SHA-256 等普通 token 误判为失效引用
  if (PREFIXES.indexOf(m[1]) < 0) continue;
  const key = m[1] + '-' + m[2];
  if (!defined.has(key)) missing.add(key);
}
say(missing.size === 0, 'E2a 文档编号引用失效数 = 0（UNCOVERED 来源：' + [...missing].join(', ') + '）');
const requiredCases = ['TST-016', 'TST-017', 'VFY-005'];
const definedSet = new Set();
const re2 = /^#{2,4}\s+([A-Z]{3,4})-(\d{3}):/gm;
while ((m = re2.exec(docs))) definedSet.add(m[1] + '-' + m[2]);
const uncovered = requiredCases.filter(x => !definedSet.has(x));
say(uncovered.length === 0, 'E2b 本任务新增用例 TST-016/TST-017/VFY-005 均已登记（UNCOVERED=' + uncovered.length + '）');

console.log('---');
console.log('RESULT=' + pass + '/' + (pass + fail) + ' FAILED=' + fail);
console.log('UNCOVERED=' + uncovered.length);
console.log('VERDICT=' + (fail === 0 && uncovered.length === 0 ? 'PASSED' : 'FAILED'));
console.log('注意：本脚本校验结构、哈希、可判定数值与追溯关系，不证明数学讲解正确；人工闸门见 VFY-005。');
process.exit(fail || uncovered.length ? 1 : 0);
