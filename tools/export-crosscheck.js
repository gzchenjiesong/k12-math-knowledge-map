#!/usr/bin/env node
/**
 * export-crosscheck.js — 多路径交叉校验的素材导出器（只读，不改真源）
 *
 * 从 reliable-data 四类卡导出三份中间包，落到 tests/evidence/crosscheck/：
 *   blind_questions.md  — 盲题包：只有题目原文，剥离答案/结论，供独立反向解题
 *   answer_key.json     — 答案包：conclusion/answer，供比对（独立解题方不得看）
 *   condition_audit.md  — 条件审查包：theoremConditions + 高风险定理条件清单
 *
 * 目的：实现「与生成路径不同的表述路径」——独立解题方只看题不看既有解答，
 *       重新推导后再与答案包比对。AI 交叉校验不构成人工签核，不解锁 verified。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RD = path.join(ROOT, 'reliable-data');
const OUT = path.join(ROOT, 'tests/evidence/crosscheck');
fs.mkdirSync(OUT, { recursive: true });

const NODES = fs.readdirSync(path.join(RD, 'nodes')).filter(f => f.endsWith('.json'))
  .map(f => f.replace(/\.json$/, '')).sort();

const read = (kind, id) => JSON.parse(fs.readFileSync(path.join(RD, kind, id + '.json'), 'utf8'));

// 高风险定理条件：任务与 BUGWALL 明确点名的红线
const RISK_RULES = [
  { id: 'R-FERMAT', pattern: /费马/, rule: '费马小定理需 p 为素数且 p∤a（a 与 p 互素）' },
  { id: 'R-EULER', pattern: /欧拉/, rule: '欧拉定理需 gcd(a,n)=1；a^φ(n)≡1(mod n)' },
  { id: 'R-CRT', pattern: /中国剩余|孙子定理|同余方程/, rule: '中国剩余定理需模数两两互素' },
  { id: 'R-AMGM', pattern: /基本不等式|均值不等式|a\+b.*≥/, rule: '基本不等式需各项为正（正数条件）' },
  { id: 'R-VIETA', pattern: /韦达/, rule: '韦达定理求实根需先验 Δ≥0 及实根存在' },
  { id: 'R-DIHEDRAL', pattern: /二面角/, rule: '二面角锐钝需按法向量夹角与平面角定义判定，勿凭图形直觉' },
  { id: 'R-ANGLE135', pattern: /135|补角|钝角三角/, rule: '135° 相关：注意诱导公式符号与角度所在象限' },
  { id: 'R-DIV0', pattern: /除以|约分|分母/, rule: '除以零 / 约分丢解需检查分母非零' }
];

// ---- 1) 盲题包 + 答案包 ----
const blind = {};
const answerKey = {};
const condAudit = {};

for (const id of NODES) {
  const ex = read('examples', id);
  const lesson = read('lessons', id);
  const pit = read('pitfalls', id);

  const blindQs = [];
  const answers = [];

  (ex.items || []).forEach((it, i) => {
    blindQs.push({ src: 'example#' + (i + 1), q: it.question });
    answers.push({
      src: 'example#' + (i + 1), q: it.question,
      conclusion: it.conclusion || null,
      answer: it.answer || null,
      theoremConditions: it.theoremConditions || []
    });
  });
  if (lesson.example && lesson.example.q) {
    blindQs.push({ src: 'lesson.example', q: lesson.example.q });
    answers.push({
      src: 'lesson.example', q: lesson.example.q,
      conclusion: null, answer: lesson.example.a || null,
      theoremConditions: []
    });
  }

  // 盲题去重：示范题与教案例题常为同一道题，合并来源标记，避免重复求解
  const seen = new Map();
  blindQs.forEach(q => {
    const key = q.q.trim();
    if (seen.has(key)) seen.get(key).srcs.push(q.src);
    else seen.set(key, { srcs: [q.src], q: q.q });
  });
  const deduped = Array.from(seen.values()).map((x, i) => ({ src: x.srcs.join('+'), tag: 'Q' + (i + 1), q: x.q }));

  blind[id] = { domain: ex.domain, module: ex.module, questions: deduped };
  answerKey[id] = { domain: ex.domain, module: ex.module, answers };

  // 条件审查：收集方法段里的定理声明 + 示范题声明的条件 + 高风险命中
  const methodClaims = [].concat(lesson.method || []);
  const declaredConditions = [].concat(...answers.map(a => a.theoremConditions || []));
  const corpus = [lesson.essence || '', methodClaims.join(' '), (lesson.example && lesson.example.a) || '',
    (pit.items || []).map(x => (x.mistake || '') + (x.correction || '')).join(' ')].join(' ');
  const risks = RISK_RULES.filter(r => r.pattern.test(corpus)).map(r => ({ id: r.id, rule: r.rule }));
  condAudit[id] = {
    domain: ex.domain, module: ex.module,
    methodClaims, declaredConditions, risks,
    checkItems: lesson.check || []
  };
}

// 写盲题包（Markdown，按 domain 分组，绝不含答案）
const DOMAIN_ORDER = ['primary', 'junior', 'senior', 'olympiad'];
const DOMAIN_LABEL = {
  primary: '小学思维铺垫 p_', junior: '初中课标 j_', senior: '高中课标 s_', olympiad: '奥赛 o_'
};
let md = [
  '# 盲题包 · 独立反向解题输入',
  '',
  '> 本文件只含题目原文，已剥离所有答案、结论、解析。独立解题方不得查阅 answer_key.json 或真源卡。',
  '> 题目编号 `EX-n` 为示范题，`LE` 为教案讲解例题。请对每题重新推导，给出明确结论。',
  ''
];
for (const dom of DOMAIN_ORDER) {
  const ids = NODES.filter(id => blind[id].domain === dom);
  if (!ids.length) continue;
  md.push('## ' + (DOMAIN_LABEL[dom] || dom) + '（' + ids.length + ' 节点）', '');
  for (const id of ids) {
    md.push('### ' + id + ' · ' + (read('nodes', id).title || ''));
    blind[id].questions.forEach(q => {
      md.push('- [' + q.tag + '] ' + q.q);
    });
    md.push('');
  }
}
fs.writeFileSync(path.join(OUT, 'blind_questions.md'), md.join('\n'), 'utf8');

// 拆成四个分域盲题文件，供不同推理档位的独立解题方使用（互相隔离，不共享答案）
for (const dom of DOMAIN_ORDER) {
  const ids = NODES.filter(id => blind[id].domain === dom);
  if (!ids.length) continue;
  const lines = [
    '# 盲题包 · ' + (DOMAIN_LABEL[dom] || dom),
    '',
    '> 只含题目原文，已剥离答案/结论/解析。请逐题独立推导，给出明确数值或结论。',
    '> 格式要求：对每节点每题，输出 `节点ID|题号|你的结论|关键推导（≤2句）`。',
    ''
  ];
  for (const id of ids) {
    lines.push('### ' + id + ' · ' + (read('nodes', id).title || ''));
    blind[id].questions.forEach(q => lines.push('- [' + q.tag + '] ' + q.q));
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'blind_' + dom + '.md'), lines.join('\n'), 'utf8');
}

fs.writeFileSync(path.join(OUT, 'answer_key.json'), JSON.stringify(answerKey, null, 2), 'utf8');

// 写条件审查包（Markdown）
let cm = [
  '# 条件审查包 · 定理适用条件专项',
  '',
  '> 高风险规则来自任务禁止清单与 BUGWALL（BUG-009/010/011 回归点）。',
  '> 逐节点检查：方法段/例题/易错纠正中出现的定理，适用条件是否齐全、结论是否落定。',
  ''
];
for (const dom of DOMAIN_ORDER) {
  const ids = NODES.filter(id => condAudit[id].domain === dom);
  if (!ids.length) continue;
  cm.push('## ' + (DOMAIN_LABEL[dom] || dom), '');
  for (const id of ids) {
    const a = condAudit[id];
    cm.push('### ' + id + ' · ' + (read('nodes', id).title || ''));
    if (a.methodClaims.length) cm.push('- 方法段：' + a.methodClaims.join(' ｜ '));
    if (a.declaredConditions.length) cm.push('- 已声明条件：' + a.declaredConditions.join(' ｜ '));
    if (a.risks.length) cm.push('- ⚠ 高风险命中：' + a.risks.map(r => r.id + '(' + r.rule + ')').join('；'));
    cm.push('');
  }
}
fs.writeFileSync(path.join(OUT, 'condition_audit.md'), cm.join('\n'), 'utf8');

const qCount = NODES.reduce((s, id) => s + blind[id].questions.length, 0);
const riskCount = NODES.reduce((s, id) => s + condAudit[id].risks.length, 0);
console.log('导出完成：节点 ' + NODES.length + '，盲题 ' + qCount + ' 道，条件命中 ' + riskCount + ' 处');
console.log('域分布：' + DOMAIN_ORDER.map(d => d + '=' + NODES.filter(id => blind[id].domain === d).length).join(' '));
console.log('输出目录：tests/evidence/crosscheck/');
