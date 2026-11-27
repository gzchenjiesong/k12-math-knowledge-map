#!/usr/bin/env node
/**
 * verify_content.js —— 内容正确性校验（独立于 validate.js 的结构校验）
 *
 * 定位：validate.js 只回答"结构在不在"；本脚本回答"能机械判定的内容对不对"。
 * 边界：数学讲解的"讲得是否严谨、是否恰当"无法靠代码证明，必须人工复核。
 *      本脚本只覆盖四类可机械判定的子集，不宣称"内容已全部正确"。
 *
 * 四类检查：
 *   C1 数值例题复算 —— 对已知答案的数值题，用独立计算核对答案中的关键数值
 *   C2 定理条件完整性 —— 关键定理必须带适用条件（关键词断言）
 *   C3 结论存在性 —— 题目问"求 X"的，解答必须给出明确结论，不能只讲方法
 *   C4 真源历史缺陷回归 —— 不读取应用生成物，不把独立组织层补充例题当作镜像
 *
 * 运行：node tests/verify_content.js
 * 输出：RESULT=<通过>/<总数> FAILED=<失败> 与 VERDICT=PASSED|FAILED
 */
const fs = require('fs');
const path = require('path');
const contract = require('../tools/lib/content-contract');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
let pass = 0, fail = 0, warn = 0;
function say(ok, msg) { console.log((ok ? 'OK   ' : 'FAIL ') + msg); ok ? pass++ : fail++; }
function warning(msg) { console.log('WARN ' + msg); warn++; }

// 可靠性任务只读 reliable-data；应用数据忠实性由 check-app-build.js 检查，不在应用层复算。
let data;
try { data = contract.loadContent(fs, SRC); }
catch (e) { console.error('FAIL ' + e.message); console.log('VERDICT=FAILED'); process.exit(1); }
const byId = data.cards.lessons;
const examples = data.cards.examples;

console.log('=== C1 数值例题复算（独立计算 vs 讲解答案）===');
// 每条：nodeId、期望的数值、在答案文本中应出现的模式、独立计算函数
const CALC_CASES = [
  { id: 'j_quad',   expect: '最大值6',            re: /最大值\s*6/,        calc: () => Math.max((0 - 1) ** 2 + 2, (3 - 1) ** 2 + 2), want: 6, why: 'f(x)=(x−1)²+2 在[0,3]端点x=3取最大=6' },
  { id: 's_ineq',   expect: '最小值4',            re: /=\s*4([，。]|$)/,   calc: () => 2 * Math.sqrt(4),        want: 4, why: 'x+4/x 在x=2取最小=2√4=4' },
  { id: 's_exp',    expect: '2^0.3>0.3²',        re: /2\^0\.3>0\.3/,      calc: () => Math.pow(2, 0.3) > Math.pow(0.3, 2), want: true, why: '2^0.3≈1.23>1>0.09' },
  { id: 's_vec',    expect: '点积=1',            re: /=\s*1([，。]|$)/,    calc: () => 1 * 2 * Math.cos(Math.PI / 3), want: 1, why: '|a||b|cos60°=1×2×0.5=1' },
  { id: 'o_numfun', expect: 'φ(12)=4',           re: /=\s*4([，。]|$)/,    calc: () => { let n = 0; for (let k = 1; k <= 12; k++) { let g = (a, b) => b ? g(b, a % b) : a; if (g(k, 12) === 1) n++; } return n; }, want: 4, why: 'φ(12)=12×(1−1/2)×(1−1/3)=4' },
  { id: 'j_prob',   expect: '概率1/6',           re: /1\/6/,               calc: () => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 7) c++; return c; }, want: 6, why: '两骰子和为7共6种，6/36=1/6' },
  { id: 'o_div0',   expect: '末位6',             re: /末位是\s*6|≡\s*6/,   calc: () => { let r = 1; for (let n = 0; n < 100; n++) r = r * 2 % 10; return r; }, want: 6, why: '逐次整数取模避免浮点大数误差' },
  { id: 's_complex', expect: 'z=1−i', re: /=\s*1\s*[-−]\s*i(?:[。,.，]|$)/, calc: () => { const d = 1 + 1; return 2 / d === 1 && -2 / d === -1; }, want: true, why: '复数除法实部=1、虚部=-1；实际题目与结论另受 E6 绑定' },
  { id: 'o_fermat', expect: 'CRT最小正解8',      re: /最小正整数是\s*8/,   calc: () => { for (let x = 1; x < 100; x++) if (x % 3 === 2 && x % 5 === 3) return x; }, want: 8, why: 'x≡2(mod3),x≡3(mod5)最小正解8' },
  { id: 'j_alg',    expect: 'x⁴+x²+1分解',       re: /\(x²\+x\+1\)\(x²−x\+1\)/, calc: () => { const x = 2; return (x*x*x*x + x*x + 1) === ((x*x+x+1)*(x*x-x+1)); }, want: true, why: '取x=2验证分解恒等:21=(7)(3)' },
  { id: 'o_geo_trans', expect: '∠APB=135°',     re: /135°/,               calc: () => { const PP2 = 8, PPC2 = 1, PC2 = 9; return PP2 + PPC2 === PC2 ? 45 + 90 : null; }, want: 135, why: '旋转后PP²=8,P′C²=1,PC²=9 → 直角,45+90=135' }
];
CALC_CASES.forEach(c => {
  const p = byId[c.id];
  if (!p) { say(false, 'C1 ' + c.id + ' 节点不存在'); return; }
  let calcOk = true, detail = '';
  if ('want' in c) {
    // 浮点容差比较（BUG-011）：1×2×cos60°=1.0000000000000002，精确相等会误报
    const near = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b;
    try { const got = c.calc(); calcOk = near(got, c.want); detail = '实算=' + got; }
    catch (e) { calcOk = false; detail = '计算异常:' + e.message; }
  } else {
    detail = c.why + '（见下方人工复核项）';
  }
  const textOk = c.re.test(p.example.a) && c.re.test(examples[c.id].items[0].answer);
  // 计算对、且两份当前答案均含该数值，才算这条通过；不等于全题证明。
  say(calcOk && textOk, 'C1 ' + c.id + ' 复算=' + calcOk + ' 当前答案匹配=' + textOk + ' | ' + c.expect + ' | ' + detail);
});

console.log('=== C2 定理条件完整性（关键定理必须带适用条件）===');
// 每条：nodeId、定理关键词、必须具备的条件关键词（任一命中即可）
const COND_CASES = [
  { id: 'o_cong',   kw: '费马',        need: ['p∤a', '互素'], why: '费马小定理需 p∤a' },
  { id: 'o_cong',   kw: '欧拉定理',    need: ['互素'],        why: '欧拉定理需 gcd(a,n)=1' },
  { id: 'o_cong',   kw: '中国剩余',    need: ['互素'],        why: 'CRT 需模数两两互素' },
  { id: 'o_fermat', kw: '费马',        need: ['p∤a', '互素'], why: '费马小定理需 p∤a' },
  { id: 'o_fermat', kw: '欧拉定理',    need: ['互素'],        why: '欧拉定理需互素' },
  { id: 'o_fermat', kw: '中国剩余',    need: ['互素'],        why: 'CRT 需互素' },
  { id: 's_ineq',   kw: '基本不等式',  need: ['a,b>0', '一正'], why: '基本不等式需各项为正' },
  { id: 'j_eq',     kw: '韦达',        need: ['Δ', '判别式'],  why: '韦达求实根需验Δ' }
];
COND_CASES.forEach(c => {
  const p = byId[c.id];
  if (!p) { say(false, 'C2 ' + c.id + ' 节点不存在'); return; }
  const blob = (p.essence || '') + ' ' + (p.method || []).join(' ') + ' ' + (p.pitfalls || []).join(' ');
  const hasKw = blob.indexOf(c.kw) >= 0;
  const hasCond = c.need.some(n => blob.indexOf(n) >= 0);
  say(!hasKw || hasCond, 'C2 ' + c.id + ' 「' + c.kw + '」条件' + (hasCond ? '完整' : '缺失') + ' | ' + c.why);
});

console.log('=== C3 结论存在性（问"求X"必须给结论，不能只讲方法）===');
Object.keys(byId).forEach(id => {
  const p = byId[id];
  const q = p.example.q, a = p.example.a;
  // 题目问"求..."且答案是纯方法描述、无任何数字/等号/结论标记 → 可疑
  const asksResult = /求|证明/.test(q);
  const hasNumeric = /[0-9０-９]|[=＝]|[°度]|成立|故|即|是/.test(a);
  if (asksResult && !hasNumeric) warning('C3 ' + id + ' 题目求结论但解答未见明确结论词，建议人工看一眼');
});
say(true, 'C3 结论存在性扫描完成（' + warn + ' 条待人工确认，非自动失败）');

console.log('=== C4 跨文件一致性（同一知识点不同载体不得矛盾）===');
// o_geo_trans 的结论应同时出现在讲解中；修正后 135° 必须存在
const trans = byId['o_geo_trans'];
say(!!trans && /135°/.test(trans.example.a), 'C4 o_geo_trans 讲解已补 135° 结论（BUG-009 回归）');
const iv = byId['s_vec3'];
say(!!iv && /补角|不能把 cosθ 直接写成/.test(iv.example.a), 'C4 s_vec3 二面角锐钝说明已补（BUG-010 回归）');
// 卡片与讲解都提到塞瓦的节点，不应出现矛盾的定理形式
const congr = byId['o_cong'];
say(!!congr && !/素数 p 时 a\^\(p−1\)≡1 \(mod p\)'/.test(congr.method.join(' ')), 'C4 o_cong 费马条件已补全（不再是无条件表述）');

console.log('---');
console.log('内容校验统计：断言 ' + pass + ' 通过 / ' + fail + ' 失败；人工提示 ' + warn + ' 条');
console.log('RESULT=' + pass + '/' + (pass + fail) + ' FAILED=' + fail);
console.log('VERDICT=' + (fail === 0 ? 'PASSED' : 'FAILED'));
console.log('注意：本脚本只覆盖可机械判定的子集，PASS 不等于"内容全部正确"；资料、多模型与人工复核分开记录，现行边界见 SPEC-009 / RUL-010。');
process.exit(fail ? 1 : 0);
