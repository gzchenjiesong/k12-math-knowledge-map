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
const contract = require('../tools/lib/content-contract');

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
  { id: 's_complex', why: '2/(1+i)=1−i', calc: () => { const d = 1 * 1 + 1 * 1; return 2 / d === 1 && -2 / d === -1; }, want: true }
];
// 明确绑定已知题目、实际教案答案、独立示范答案与结论；不是只计算脚本内的 calc/want。
// 这是有限题型回归，不是公式求值器。题设/结论变化须独立复核并更新 expectation，不能自动跟随真源。
function formula(s) {
  const powers = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, a => '^' + Array.from(a, c => c === 'ⁿ' ? 'n' : powers.indexOf(c)).join(''))
    .normalize('NFKC').replace(/[−–]/g, '-').replace(/\s+/g, '')
    .replace(/\^\{([^{}]+)\}/g, '^$1').replace(/\^\((\d+|n)\)/g, '^$1');
}
const expectations = {
  j_quad: ['f(x)=x²−2x+3 在 [0,3] 上的最值', /最大值(?:为|是)?6(?:[。,(]|$)/, '最小值 2（x=1），最大值 6（x=3）'],
  s_ineq: ['x>0，求 x+4/x 的最小值', /=4[,。]/, '最小值为 4，x=2 时取等'],
  s_exp: ['比较 2^0.3 与 0.3² 的大小', /2\^0\.3>0\.3\^2(?:[。,]|$)/, '2^0.3 > 0.3²'],
  s_vec: ['已知 |a|=1，|b|=2，夹角 60°，求 a·b', /=1[。,]/, 'a·b=1'],
  o_numfun: ['求 φ(12)', /=4[。,]/, 'φ(12)=4'],
  j_prob: ['掷两枚骰子，点数和为 7 的概率', /=1\/6[。,]/, 'P=1/6'],
  o_cong: ['求 3²⁰⁰ mod 7', /≡2\(mod7\)/, '3²⁰⁰≡2 (mod 7)'],
  o_fermat: ['求满足 x≡2(mod 3)、x≡3(mod 5) 的最小正整数', /最小正整数(?:是|为)8[。,]/, '最小正整数解 x=8'],
  j_alg: ['分解 x⁴+x²+1', /\(x\^2\+x\+1\)\(x\^2-x\+1\)/, '(x²+x+1)(x²−x+1)'],
  o_geo_trans: ['正方形 ABCD 内一点 P，PA=1,PB=2,PC=3，求 ∠APB', /=135°[。,;]/, '∠APB=135°'],
  s_seq: ['已知 Sₙ=n²+2n，求 aₙ', /an=2n\+1[。,]/, 'aₙ=2n+1（n≥1）'],
  o_recur: ['a₁=1，aₙ₊₁=2aₙ+1，求通项', /an=2\^n-1[。,]/, 'aₙ=2ⁿ−1'],
  s_count: ['从 5 人中选 3 人组成委员会，有多少种选法？', /C\(5,3\)=10[。,]/, 'C(5,3)=10 种选法'],
  o_comb_adv: ['1…100 中能被 2 或 3 整除的数有多少？', /=67[。,]/, '能被 2 或 3 整除的数共 67 个'],
  j_simi: ['直角三角形斜边上的高把斜边分成 4 和 9，求高', /h=6[。,]/, '斜边上的高 h=6'],
  s_prob: ['掷一枚公平硬币，正面得 1 分反面得 0 分，求期望', /=1\/2[。,]/, 'E=1/2'],
  s_complex: ['已知 (1+i)z=2，求 z', /=1-i(?:[。,]|$)/, 'z=1−i']
};
let crossBad = 0;
cross.forEach(c => {
  let got, ok, textOk = false;
  try {
    got = c.calc(); ok = near(got, c.want);
    const [question, answer, conclusion] = expectations[c.id];
    const lesson = L[c.id], example = E[c.id].items[0];
    textOk = formula(lesson.example.q) === formula(question) && formula(example.question) === formula(question) &&
      answer.test(formula(lesson.example.a)) && answer.test(formula(example.answer)) && formula(example.conclusion) === formula(conclusion);
  } catch (e) { got = e.message; ok = false; }
  if (!ok || !textOk) { crossBad++; console.log('  CROSS ' + c.id + ' ' + c.why + ' 实算=' + got + ' 期望=' + c.want + ' 发布题目/答案/结论=' + textOk); }
});
say(crossBad === 0, 'E6 ' + cross.length + ' 条明确题设的复算与当前发布文本一致（异常 ' + crossBad + '）');

console.log('=== E7 不自证与依据锚点 ===');
const badReview = [], noRef = [], reviewStats = { pending: 0, checked: 0, verified: 0, disputed: 0 };
KINDS.forEach(k => cards[k].forEach(x => {
  if (contract.reviewErrors(x.obj).length) badReview.push(k + '/' + x.file);
  if (Object.prototype.hasOwnProperty.call(reviewStats, x.obj.review)) reviewStats[x.obj.review]++;
  if (typeof x.obj.source_ref !== 'string' || !x.obj.source_ref.trim()) noRef.push(k + '/' + x.file);
}));
say(badReview.length === 0, 'E7a 当前卡片状态合法，verified 必须有签核字段（异常 ' + badReview.length + '；不强制永久 pending）');
say(contract.equal(reviewStats, mf.reviewStats) && mf.humanSignOff && mf.humanSignOff.verifiedCount === reviewStats.verified,
  'E7b manifest 审核统计与当前卡一致（签核字段存在不等于机器证明其真实性）');
say(noRef.length === 0, 'E7c 全部卡有 source_ref（异常 ' + noRef.length + '）');
try {
  contract.loadContent(fs, SRC);
  say(true, 'E7d 定向结构、哈希与镜像契约通过（无数学正确性自证）');
} catch (e) { say(false, 'E7d ' + e.message); }
const ev = JSON.parse(fs.readFileSync(path.join(SRC, 'evidence/SOURCES.json'), 'utf8'));
try {
  contract.validateSources(ev);
  say(true, 'E7e 来源登记结构合法、anchorId 唯一、获取状态明确（不固定历史 8/7 计数）');
} catch (e) { say(false, 'E7e ' + e.message); }
try {
  contract.loadSourceMapping(fs, SRC, baseIds);
  say(true, 'E7f 全节点来源引用与缺口结构有效；不自动升级 review');
} catch (e) { say(false, 'E7f ' + e.message); }

console.log('=== E8 版本可追溯：快照保留 + 补丁作用域精确 ===');
const snapV1 = path.join(SRC, 'snapshots/v1.0.0');
const snapV2 = path.join(SRC, 'snapshots/v2.0.0');
// E8a：v1.0.0 历史快照本身完整保留（不因后续版本内容修正而改写）
if (fs.existsSync(snapV1)) {
  const m1 = JSON.parse(fs.readFileSync(path.join(snapV1, 'manifest.json'), 'utf8'));
  let intact = 0;
  Object.keys(m1.entries).forEach(k => {
    if (!fs.existsSync(path.join(snapV1, k))) return;
    const card = JSON.parse(fs.readFileSync(path.join(snapV1, k), 'utf8'));
    if (hashOf(card) === card.content_hash && card.content_hash === m1.entries[k].content_hash) intact++;
  });
  // 固定历史清单的规范化指纹，防止改完历史卡后连同历史 manifest 一起重算掩盖覆盖。
  const originalManifest = contract.hashValue(m1) === 'sha256:cf7495ea770f449b61764ad249d33dfae46d98d951be810a3c0993fe5eb5927f';
  say(originalManifest && intact === Object.keys(m1.entries).length && Object.keys(m1.entries).length === 228,
    'E8a v1.0.0 快照 228 卡完整保留（实际 ' + intact + '，历史版本不被内容修正覆盖）');
  const added = Object.keys(mf.entries).length - Object.keys(m1.entries).length;
  say(added === 40, 'E8b v2.0.0 曾新增 40 张小学卡（相对 v1.0.0，实际 ' + added + '）');
} else {
  say(false, 'E8a 缺 v1.0.0 历史快照，不得跳过');
}
// E8c：当前版本相对 v2.0.0 的漂移，必须恰好等于补丁清单覆盖的卡（9 节点 × 4 卡）
if (fs.existsSync(snapV2)) {
  const m2 = JSON.parse(fs.readFileSync(path.join(snapV2, 'manifest.json'), 'utf8'));
  const patched = new Set((mf.patchInfo && mf.patchInfo.modifiedNodes) || []);
  let changedNodes = new Set(), changedCards = 0, unexpected = 0;
  let damaged = contract.hashValue(m2) === 'sha256:f098c112b7f91cfd4704865da33515f3e1be5d5f38355d1412499b7c8b650480' ? 0 : 1;
  Object.keys(m2.entries).forEach(k => {
    if (!fs.existsSync(path.join(snapV2, k))) { damaged++; return; }
    const old = JSON.parse(fs.readFileSync(path.join(snapV2, k), 'utf8'));
    if (hashOf(old) !== old.content_hash || old.content_hash !== m2.entries[k].content_hash) damaged++;
    const id = k.split('/')[1].replace(/\.json$/, '');
    if (mf.entries[k] && mf.entries[k].content_hash !== m2.entries[k].content_hash) {
      changedNodes.add(id); changedCards++;
      if (!patched.has(id)) unexpected++;
    }
    if (fs.existsSync(path.join(snapV2, k)) &&
        fs.readFileSync(path.join(snapV2, k), 'utf8') !== fs.readFileSync(path.join(SRC, k), 'utf8') &&
        !patched.has(id)) unexpected++;
  });
  say(unexpected === 0 && damaged === 0 && changedNodes.size === patched.size && changedCards === patched.size * 4,
    'E8c v2.0.0 快照哈希完整，当前变更作用域等于补丁清单（变更 ' + changedCards + ' 卡 / ' + changedNodes.size + ' 节点 / 越界 ' + unexpected + ' / 损坏 ' + damaged + '）');
  say(patched.size > 0 && /^2\.1\.0$/.test(mf.version),
    'E8d 内容修正走新版本 2.1.0，未覆盖 v2.0.0 发布版（version=' + mf.version + '）');
} else {
  say(false, 'E8c 缺 v2.0.0 历史快照，不得跳过');
}

console.log('=== E9 小学段结构与当前状态（历史缺依据状态不锁死后续复核）===');
const pIds = Object.keys(N).filter(id => id.startsWith('p_'));
say(pIds.length === mf.domainBaseline.primary, 'E9a 小学节点数与 manifest 基线一致（实际 ' + pIds.length + '）');
const pBad = pIds.filter(id => !['A', 'B', 'C'].includes(N[id].evidence) || contract.reviewErrors(N[id]).length);
say(pBad.length === 0, 'E9b 小学 evidence/review 合法、verified 有签核字段（异常 ' + pBad.length + '）');
const pRefBad = pIds.filter(id => typeof N[id].source_ref !== 'string' || !N[id].source_ref.trim());
say(pRefBad.length === 0, 'E9c 小学来源说明非空；详细缺口由 NODE_SOURCES 声明（异常 ' + pRefBad.length + '）');
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
console.log('注意：本脚本校验结构、哈希、可判定数值与追溯关系，不证明数学讲解正确；现行边界见 SPEC-009，VFY-005 缺人工证据状态不变。');
process.exit(fail || uncovered.length ? 1 : 0);
