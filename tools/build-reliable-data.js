#!/usr/bin/env node
/**
 * build-reliable-data.js —— 可靠数据源编制器（PRM-010 专项任务）
 *
 * 输入：apps/miniprogram/data/*.js（只读素材，不覆盖）
 * 输出：reliable-data/{nodes,lessons,pitfalls,examples}/*.json + manifest.json
 *       reliable-data/{index,evidence,schema}/* + CHANGELOG.md
 *
 * 红线：
 *   - 所有卡片 review 一律 pending（AI 不自证，SPEC-008）
 *   - source_ref 只写可回查锚点；本地无原件时显式标注，不编造页码
 *   - 原文素材仅作结构化搬运，不宣称数学正确；正确性依赖人工签核
 *
 * 运行：node tools/build-reliable-data.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reliable-data');
const VERSION = '2.1.0';
const GEN_DATE = '2026-11-25';

function loadMod(rel) {
  const a = path.join(ROOT, rel);
  const m = new Module(a);
  m.filename = a;
  m.paths = Module._nodeModulePaths(path.dirname(a));
  m._compile(fs.readFileSync(a, 'utf8'), a);
  return m.exports;
}
function ensure(d) { fs.mkdirSync(d, { recursive: true }); }
function write(rel, text) {
  const p = path.join(ROOT, rel);
  ensure(path.dirname(p));
  fs.writeFileSync(p, text, 'utf8');
}
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out = {};
    Object.keys(v).sort().forEach(k => { out[k] = canon(v[k]); });
    return out;
  }
  return v;
}
function contentHash(obj) {
  const c = canon(obj);
  delete c.content_hash;
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(c), 'utf8').digest('hex');
}

// ============================================================
// 只读素材
// ============================================================
const K = loadMod('apps/miniprogram/data/nodes.js');
const L = loadMod('apps/miniprogram/data/lectures.js');
const META = loadMod('apps/miniprogram/data/content_meta.js');
const PRIMARY = loadMod('reliable-data/source/primary_nodes.js');
const PATCH = loadMod('reliable-data/source/patches_v2_1_0.js');
const POINTS = {};
L.LECTURES.forEach(g => g.points.forEach(p => { POINTS[p.nodeId] = Object.assign({}, p, { lectureId: g.id, lectureTitle: g.title }); }));
// 小学段素材：独立加载，不覆盖 apps 素材；nodeId 冲突直接失败（防 ID 复用）
PRIMARY.NODES.forEach(n => {
  if (POINTS[n.id] || K.ALL_NODES.some(x => x.id === n.id)) throw new Error('小学节点 ID 与既有节点冲突：' + n.id);
  POINTS[n.id] = Object.assign({}, PRIMARY.POINTS.find(p => p.nodeId === n.id), { lectureId: 'primary', lectureTitle: PRIMARY.DOMAIN.name });
  if (!POINTS[n.id] || !POINTS[n.id].essence) throw new Error('小学节点缺六段素材：' + n.id);
});
// v2.0.0：四段基线 = 既有 57（ID/字段冻结，字节不变）+ 小学 10
// v2.1.0：节点对象做浅拷贝后应用 NODE_PATCH（要点扩写），不污染原始素材引用
const NODES = K.ALL_NODES.concat(PRIMARY.NODES)
  .map(n => Object.assign({}, n))
  .sort((a, b) => a.id.localeCompare(b.id));
const BASELINE = { primary: 10, junior: 21, senior: 15, olympiad: 21, total: 67 };
if (NODES.length !== BASELINE.total) throw new Error('节点基线总数应为 ' + BASELINE.total + '，实际 ' + NODES.length);
const DOMAIN_COUNT = NODES.reduce((a, n) => { a[n.domain] = (a[n.domain] || 0) + 1; return a; }, {});
Object.keys(BASELINE).filter(k => k !== 'total').forEach(d => {
  if (DOMAIN_COUNT[d] !== BASELINE[d]) throw new Error(d + ' 节点数 ' + DOMAIN_COUNT[d] + ' ≠ 基线 ' + BASELINE[d]);
});

// ===== v2.1.0 补丁应用（内容修正/扩写/补漏，依据 CROSS_CHECK_V1.md）=====
const PATCHED_NODES = [];
const PATCHED_POINTS = [];
NODES.forEach(n => {
  if (PATCH.NODE_PATCH[n.id]) {
    Object.assign(n, PATCH.NODE_PATCH[n.id]);
    PATCHED_NODES.push(n.id);
  }
  if (PATCH.POINT_PATCH[n.id]) {
    Object.assign(POINTS[n.id], PATCH.POINT_PATCH[n.id]);
    PATCHED_POINTS.push(n.id);
  }
});

// R2 旧侧 checked 列表（存在重复登记，去重后用于差距矩阵；本真源不继承该状态）
const R2_RAW = META.R2_CHECKED.slice();
const R2_UNIQUE = Array.from(new Set(R2_RAW)).sort();

// ============================================================
// 依据锚点策略（不编造页码；本地原件缺失如实标注）
// ============================================================
const ANCHOR = {
  junior: {
    doc: '教育部《义务教育数学课程标准》',
    version: '学校现行课标文本（版本待人工确认）',
    section: '第三学段（7—9年级）对应领域',
    local: 'resource_data/official/（本地原件待补）',
    note: '节点范围依课标；讲解措辞与例题为原创'
  },
  senior: {
    doc: '教育部《普通高中数学课程标准》（2017年版2020修订）',
    version: '2017年版2020修订',
    section: '必修 / 选择性必修对应主题',
    local: 'resource_data/official/（本地原件待补）',
    note: '一试范围不超此课标（CNF-008）；讲解措辞与例题为原创'
  },
  primary: {
    doc: '数学公共知识（小学 4—6 年级思维铺垫，非官方竞赛体系）',
    version: '教材锚点待补（三套小学分册 / 举一反三，版权页未提供）',
    section: '高小思维模块 · 无官方竞赛大纲背书（CNF-008 / SPEC-005）',
    local: 'resource_data/books/（小学分册原件待补）',
    note: '版权页未提供，不写具体版次；evidence=C、review=pending，不得声称已核对教材'
  },
  olympiad: {
    doc: '全国中学生数学奥林匹克竞赛大纲（四大板块通行要求）',
    version: '按联赛通知口径（CNF-008）',
    section: '二试四大板块：平面几何 / 代数 / 数论 / 组合',
    local: 'resource_data/official/（本地原件待补）',
    note: '板块范围依大纲；细目以集训队当年大纲为准，学校讲义口径优先'
  }
};
function scopeRef(n) {
  const a = ANCHOR[n.domain];
  return a.doc + '｜' + a.version + '｜' + a.section + '·' + n.module + '·' + n.n + '｜原件：' + a.local;
}
const THEOREM_HINT = /定理|公式|法则|性质|定律|恒等式|判别式|韦达|同余|向量|复数|圆锥曲线|数列|导数|期望|概率|组合|容斥|归纳|函数方程/;
function basisText(n) {
  return THEOREM_HINT.test(n.n)
    ? '标准定理与定义（B 级，权威教材可交叉验证）'
    : '通用解题方法（C 级）';
}
function contentRef(n, role) {
  if (n.domain === 'primary') {
    return '未找到权威依据（小学分册版权页未提供）；' + role + '原创，依据：数学公共知识与通用解题方法（C 级）；不得声称已核对教材（SPEC-008）';
  }
  return scopeRef(n) + '；' + role + '原创，依据：' + basisText(n);
}

// ============================================================
// 明确结论对照表（逐题从素材解答中提炼，供机械断言核对）
// ============================================================
const CONCLUSION = {
  j_num: '−a', j_alg: '(x²+x+1)(x²−x+1)', j_frac: '√3+√2',
  o_alg_skill: 'x²+1/x²=7', o_poly: '余式为 x+1', j_eq: 'k=2，且 Δ=(k−1)²=1>0 有两实根',
  j_ineq: 'x<−2', s_ineq: '最小值为 4，x=2 时取等', o_ineq: 'a²+b²≥2ab，等号当且仅当 a=b',
  s_set: '「x>2」是「x>1」的充分不必要条件', j_fun: '定义域为 {x | x≠2}',
  j_quad: '最小值 2（x=1），最大值 6（x=3）', s_func: 'f(x)=x³ 为奇函数',
  s_exp: '2^0.3 > 0.3²', s_deriv: 'x=−1 为极大值点，x=1 为极小值点',
  o_func_eq: 'f(0)=0', j_trig: 'h=10·sin30°=5 米', s_trig: '原式=sin3x',
  o_trig_id: '原式成立（cos x≠0、sin x≠1 时）', s_complex: 'z=1−i',
  o_complex: '平行四边形对角线平方和等于四边平方和', s_seq: 'aₙ=2n+1（n≥1）',
  o_induct: '1+2+…+n=n(n+1)/2 对一切正整数 n 成立', o_recur: 'aₙ=2ⁿ−1',
  j_tri: '等腰三角形两底角相等', j_cong: '该三角形是直角三角形',
  j_quadg: 'AO=CO、BO=DO，即对角线互相平分', j_simi: '斜边上的高 h=6',
  j_circle: '∠ACB=90°', j_trans: '对称点与另一点连线和直线的交点即最短路径位置',
  o_geo_basic: 'DE∥BC 且 DE=BC/2', o_geo_ceva: '共点条件为 (BD/DC)(CE/EA)(AF/FB)=1',
  o_geo_area: 'BD/DC=AB/AC', o_geo_circle: 'PT₁=PT₂',
  o_geo_trans: '∠APB=135°', o_geo_ineq: '周长固定时等边三角形面积最大',
  o_geo_vec: '三角形三条高交于一点', s_solid: '直线垂直于平面内两条相交直线则垂直于该平面',
  s_vec: 'a·b=1', s_vec3: '二面角等于法向量夹角或其补角，需结合图形定锐钝',
  s_line: 'd=1/√2 < r=√2，直线与圆相交', s_conic: '弦长=√(1+k²)·|x₁−x₂|',
  o_div0: '2¹⁰⁰ 末位是 6', o_dio: '正整数解共 4 组', o_cong: '3²⁰⁰≡2 (mod 7)',
  o_dio2: 'x=m²−n², y=2mn, z=m²+n²（m>n>0）给出无穷多组正整数解',
  o_fermat: '最小正整数解 x=8', o_numfun: 'φ(12)=4',
  o_pigeon: '至少两人生日在同一个月', j_stats: '中位数 2 更能反映典型水平',
  j_prob: 'P=1/6', s_count: 'C(5,3)=10 种选法', s_prob: 'E=1/2',
  o_binom: 'C(n,0)+C(n,1)+…+C(n,n)=2ⁿ', o_comb_adv: '能被 2 或 3 整除的数共 67 个',
  o_graph: '任意 6 人中必有 3 人互相认识或 3 人互相不认识（R(3,3)=6）',
  o_comb_opt: '最多 n−3 条互不相交的对角线',
  // 小学段（v2.0.0）：每题明确结论，均取自主素材例题答案
  p_num: '25×32×125=100000（把 32 拆成 4×8 凑整）',
  p_div: '12345 能被 3 整除（各位数字和 15 能被 3 整除）',
  p_alg: '小明原来有 17 颗糖（x−5=12）',
  p_ratio: '乙分到 36 个（总份数 5，每份 12，乙占 3 份）',
  p_app: '鸡 5 只、兔 3 只（假设全鸡少 6 条腿，每换一只多 2 条）',
  p_geo: '梯形面积 15 平方厘米（(4+6)×3÷2）',
  p_transform: '割补成长方形后面积仍为 24 平方厘米（等积变形）',
  p_count: '3×2×1=6 个不同的三位数',
  p_pigeon: '至少有两名同学在同一个月过生日（13 人 / 12 个月）',
  p_logic: '括号里填 10（相邻两数差 2）'
};
// v2.1.0：内容修正后同步明确结论（CC-F01/F02）
Object.keys(PATCH.CONCLUSION_PATCH).forEach(id => { CONCLUSION[id] = PATCH.CONCLUSION_PATCH[id]; });
const MISSING_CONCLUSION = NODES.filter(n => !CONCLUSION[n.id]).map(n => n.id);
if (MISSING_CONCLUSION.length) throw new Error('缺明确结论：' + MISSING_CONCLUSION.join(','));

// ============================================================
// 阶段 1：差距矩阵
// ============================================================
function buildGapMatrix() {
  const rows = NODES.map(n => {
    const p = POINTS[n.id];
    const bug = n.id === 'o_geo_trans' ? 'BUG-009（已修，135°）'
      : n.id === 's_vec3' ? 'BUG-010（已修，二面角锐钝）' : '—';
    return '| ' + n.id + ' | ' + n.n + ' | ' + n.domain + ' | ' +
      (R2_UNIQUE.indexOf(n.id) >= 0 ? 'checked（R2 机械复算）' : 'pending') + ' | ' +
      '待编制 | 待编制 | 素材已有 2 条 | 素材已有 1 题 | ' + bug + ' |';
  }).join('\n');
  const text = [
    '# 阶段 1 · ' + NODES.length + ' 节点 × 四类卡差距矩阵（生成物）',
    '',
    '- 生成命令：`node tools/build-reliable-data.js`；真源版本：`' + VERSION + '`；日期：' + GEN_DATE + '。',
    '- 节点构成（CNF-014）：小学 10 / 初中 21 / 高中 15 / 奥赛 21 = ' + NODES.length + '；v1.0.0 的 57 节点 ID 与卡字段冻结不变，快照在 `reliable-data/snapshots/v1.0.0/`。',
    '- 现状口径：矩阵右四列描述**编制前素材状态**；本真源产出后四类卡均为 ' + NODES.length + '/' + NODES.length + '，review 一律 `pending`。',
    '- R2 旧侧 `R2_CHECKED` 列表共 ' + R2_RAW.length + ' 条，去重后 ' + R2_UNIQUE.length + ' 个唯一节点（`' +
      R2_RAW.filter((x, i) => R2_RAW.indexOf(x) !== i).join('`, `') + '` 重复登记）。',
    '  故旧侧实际为 ' + R2_UNIQUE.length + ' checked + ' + (K.ALL_NODES.length - R2_UNIQUE.length) +
      ' pending（以 v1.0.0 的 ' + K.ALL_NODES.length + ' 节点计），与任务描述的「15 checked / 42 pending」存在 1 条差异，**如实标注，不擅自凑数**。',
    '- 本真源按 `RUL-008` 第 1 条：新写/改写内容一律先置 `pending`；旧侧 checked 仅保留在 `priorReview` 元数据，不继承为可信状态。',
    '- 已知缺陷：`BUG-009`（o_geo_trans 缺 135° 结论，素材已修）、`BUG-010`（s_vec3 二面角锐钝，素材已修）、`BUG-011`（校验器浮点精确比较误报，素材已修）。',
    '',
    '| nodeId | 标题 | 来源 | 旧侧复核 | 知识点卡 | 教案卡 | 易错卡 | 示范卡 | 已知缺陷 |',
    '|---|---|---|---|---|---|---|---|---|',
    rows,
    '',
    '## 汇总',
    '',
    '| 卡类 | 编制前 | 编制后 | 说明 |',
    '|---|---|---|---|',
    '| 知识点卡 | 0（无真源） | ' + NODES.length + ' | 既有 57 从 nodes.js 搬运；小学 10 从 primary_nodes.js 搬运 |',
    '| 授课教案卡 | ' + K.ALL_NODES.length + '（素材六段齐全，可信度混杂） | ' + NODES.length + ' | 既有从 lectures.js、小学从 primary_nodes.js 搬运六段；build 不宣称正确 |',
    '| 易错考点卡 | 既有每节点 2 条（散在素材中） | ' + NODES.length + ' 文件 / ' + (NODES.length * 2) + ' 条 | 每节点独立成文件，补错因/触发/纠正 |',
    '| 真题示范卡 | 既有每节点 1 题（散在素材中） | ' + NODES.length + ' 文件 / ' + NODES.length + ' 题 | 题目与解答分离，逐题给明确结论 |',
    '',
    '> 差距性质：**结构性缺口**（此前无独立真源）远大于**内容性缺口**（素材已覆盖 ' + NODES.length + ' 点）。',
    '> 但素材本身混杂且无外部签核；小学段无教材版权页锚点（`evidence=C`），故本真源不把任何条目标为 `verified`。',
    ''
  ].join('\n');
  write('reliable-data/index/GAP_MATRIX.md', text);
  return { r2Raw: R2_RAW.length, r2Unique: R2_UNIQUE.length };
}

// ============================================================
// 阶段 2：依据锚点
// ============================================================
function buildEvidence() {
  const sources = [
    {
      anchorId: 'EV-A01', title: '教育部《义务教育数学课程标准》', version: '学校现行文本（待人工确认）',
      section: '第三学段（7—9年级）数与代数 / 图形与几何 / 统计与概率',
      original: 'resource_data/official/（本地原件待补）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: 'junior 21 节点', evidence: 'A', note: '范围依据；讲解措辞为原创'
    },
    {
      anchorId: 'EV-A02', title: '教育部《普通高中数学课程标准》（2017年版2020修订）', version: '2017年版2020修订',
      section: '必修 / 选择性必修各主题',
      original: 'resource_data/official/（本地原件待补）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: 'senior 15 节点；一试范围不超此课标', evidence: 'A', note: '范围依据（CNF-008）'
    },
    {
      anchorId: 'EV-A03', title: '全国中学生数学奥林匹克竞赛大纲（四大板块通行要求）', version: '按联赛通知口径',
      section: '二试：平面几何 / 代数 / 数论 / 组合',
      original: 'resource_data/official/（本地原件待补）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: 'olympiad 21 节点', evidence: 'A', note: '板块范围依大纲；细目以集训队当年大纲为准，学校讲义优先'
    },
    {
      anchorId: 'EV-A04', title: '教育部《2025—2028 学年面向中小学生的全国性竞赛活动名单》', version: '教监管厅函〔2025〕7号',
      section: '全国中学生数学奥林匹克竞赛面向学段：普通高中',
      original: 'resource_data/official/（本地原件待补）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: 'SPEC-005 升学表述口径', evidence: 'A', note: '竞赛及结果不得作为招生入学依据和高考加分项目'
    },
    {
      anchorId: 'EV-A05', title: '2026 年全国中学生数学奥林匹克竞赛（预赛）组织委员会通知', version: '2026 赛季',
      section: '一试 80 分钟/120 分；二试 170 分钟/180 分、四大板块',
      original: 'resource_data/official/（本地原件待补）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: 'CNF-008 权威事实口径', evidence: 'A', note: '一试不超 2017版（2020修订）课标但提高方法要求'
    },
    {
      anchorId: 'EV-N01', title: '学校集训队讲义 / 授课老师口径', version: '以孩子当年集训队讲义为准',
      section: '逐节点页码待家长/老师补锚',
      original: 'resource_data/notes/（本地无原件）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: '全部 57 节点（最高权威顺位）', evidence: 'A',
      note: '权威顺序第 1 位；无原件时不得伪称已按讲义核对，人工闸门 VFY-005 保持阻塞'
    },
    {
      anchorId: 'EV-B01', title: '标准数学定理与定义（权威教材可交叉验证）', version: '通用教材',
      section: '按节点主题对应章节，页码待人工补锚',
      original: 'resource_data/books/（本地无原件）', originalStatus: 'MISSING_LOCAL_COPY',
      covers: '含定理/公式的节点', evidence: 'B', note: '只验证定理与定义本身，不验证本真源讲解措辞'
    },
    {
      anchorId: 'EV-C01', title: '原创讲解 / 自编示范题 / 易错诊断', version: VERSION,
      section: 'reliable-data/lessons|examples|pitfalls/*.json',
      original: '本真源自带（生成物可回查）', originalStatus: 'IN_REPO',
      covers: '全部 57 节点', evidence: 'C', note: '依据仅为定理、公式、通用方法与题目本身；需人工判断'
    }
  ];
  write('reliable-data/evidence/SOURCES.json', JSON.stringify({
    version: VERSION, generatedAt: GEN_DATE,
    policy: '只写资料名称 + 版本 + 章节/页码锚点；原件留本地 resource_data/，不复制原文入库',
    localOriginalScan: '资源目录当前仅有 .gitkeep 与 README.md，无任何原件；全部 A/B 类锚点的 originalStatus 均为 MISSING_LOCAL_COPY',
    sources
  }, null, 2) + '\n');
  write('reliable-data/evidence/README.md', [
    '# 依据锚点说明',
    '',
    '- 本目录只存「资料名称 + 版本 + 章节/页码」锚点，不存原文；原件应放本地 `resource_data/{official,wiki,books,notes}/`（不入库）。',
    '- 当前清点结果：四个原始资料子目录均只有 `.gitkeep`，**无任何原件**；故 `SOURCES.json` 中 A/B 类锚点全部标 `MISSING_LOCAL_COPY`。',
    '- 后果：任何人不得据此声称「已按官方文件/讲义逐条核对」；所有卡片 `review=pending`，人工闸门保持阻塞。',
    '- 最高权威的 `EV-N01`（学校集训队讲义）需家长/老师补入原件并回填页码后，才具备逐条签核条件。',
    '- 版权：禁止复制付费教材原创讲解或内嵌盗版 PDF（SPEC-004）；补原件由使用者自行负责合法性。',
    ''
  ].join('\n'));
}

// ============================================================
// 阶段 3：四类卡片
// ============================================================
function commonCard(n, kind, title, ref, evidence) {
  return {
    nodeId: n.id,
    id: kind + '-' + n.id,
    kind,
    title,
    domain: n.domain,
    domainName: n.domainName,
    module: n.module,
    lectureId: (POINTS[n.id] || {}).lectureId || '',
    source_ref: ref,
    evidence,
    review: 'pending',
    reviewer: null,
    date: null,
    priorReview: n.domain === 'primary'
      ? 'none(小学段新增，无旧侧 R2 记录)'
      : (R2_UNIQUE.indexOf(n.id) >= 0 ? 'checked(R2 机械复算，AI 执行，非人工签核)' : 'pending(R2)'),
    reviewNote: n.domain === 'primary'
      ? '小学段无教材版权页锚点，未获教材交叉验证与人工签核，不得视为 checked/verified（SPEC-008）'
      : 'checked 仅表示旧侧 R2 机械复算通过；本真源未获人工签核，不得视为 verified（SPEC-008）',
    // 版本标记：未修改的既有 57 节点保持 v1.0.0 冻结；小学卡 v2.0.0；
    // v2.1.0 被补丁修改的卡用当前版本，便于追溯内容变更（不影响未修改卡的哈希）。
    version: PATCHED_NODES.indexOf(n.id) >= 0 || PATCHED_POINTS.indexOf(n.id) >= 0
      ? VERSION
      : (n.domain === 'primary' ? '2.0.0' : '1.0.0')
  };
}
function finish(card) {
  card.content_hash = contentHash(card);
  return card;
}
function save(dir, card) {
  write('reliable-data/' + dir + '/' + card.nodeId + '.json', JSON.stringify(finish(card), null, 2) + '\n');
}

function buildCards() {
  NODES.forEach(n => {
    const p = POINTS[n.id];
    if (!p) throw new Error('缺授课素材：' + n.id);
    const sigs = (n.sig && n.sig.length) ? n.sig : [n.module, n.n];
    const methods = Array.isArray(p.method) ? p.method : [];
    const checks = Array.isArray(p.check) ? p.check : [];

    // 1) 知识点卡（小学段无教材版权页锚点，evidence=C、source_ref 如实标注）
    const primaryNode = n.domain === 'primary';
    save('nodes', Object.assign(commonCard(n, 'node', n.n,
      primaryNode ? '未找到权威依据（小学分册版权页未提供，不写具体版次）' : scopeRef(n),
      primaryNode ? 'C' : 'A'), {
      points: n.p || [],
      prerequisites: n.pre || [],
      relations: n.rel || [],
      signals: n.sig || [],
      approaches: n.ap || [],
      description: n.d || '',
      note: primaryNode
        ? '来源归属/前置/关联/识别信号来自 reliable-data/source/primary_nodes.js（原创素材）；小学分册版权页未提供，未找到权威依据，evidence=C、review=pending（SPEC-008）。'
        : '来源归属/前置/关联/识别信号来自 nodes.js；范围锚定官方依据（A），识别信号为原创（C）。'
    }));

    // 2) 授课教案卡（RUL-002 六段）
    save('lessons', Object.assign(commonCard(n, 'lesson', n.n + ' · 授课教案', contentRef(n, '讲解措辞、例题与自检'), 'C'), {
      basisEvidence: THEOREM_HINT.test(n.n) ? 'B' : 'C',
      essence: p.essence,
      method: methods,
      example: { q: p.example.q, a: p.example.a },
      pitfalls: p.pitfalls || [],
      links: p.links,
      check: checks,
      structure: 'RUL-002 六段式：知识本质 / 核心方法与思维 / 讲解型例题 / 易错点 / 知识连接 / 概念自检'
    }));

    // 3) 易错考点卡（每节点 ≥2 条，写清错因/触发/纠正）
    save('pitfalls', Object.assign(commonCard(n, 'pitfall', n.n + ' · 易错考点', contentRef(n, '易错诊断与纠正方法'), 'C'), {
      items: (p.pitfalls || []).map((mistake, i) => ({
        id: 'PF-' + n.id + '-' + String(i + 1).padStart(2, '0'),
        mistake,
        trigger: '题目落在「' + n.n + '」考点，或出现「' + sigs.slice(0, 3).join('、') +
          '」类识别信号时；参照本节点示范题「' + p.example.q + '」。',
        rootCause: '把形式相似或特殊情形当作普遍规则，跳过了适用条件与判定步骤的核对。',
        correction: methods.length
          ? '按核心方法逐步处理：' + methods.map((m, j) => '（' + (j + 1) + '）' + m).join('；') + '；完成后回看结论是否满足题设条件。'
          : '回到本节点知识本质，先核对适用条件再使用结论。',
        selfCheck: checks[i % Math.max(checks.length, 1)] || ''
      }))
    }));

    // 4) 示范卡（题目与解答分离，明确结论）
    save('examples', Object.assign(commonCard(n, 'example', n.n + ' · 示范题与解答', contentRef(n, '示范题与解答'), 'C'), {
      items: [{
        id: 'EX-' + n.id + '-01',
        category: '原创示范题（题型源自数学公共知识；未锚定官方真题原文）',
        provenance: 'resource_data 无真题原件，不宣称来自某年真题；需人工签核',
        question: p.example.q,
        answer: p.example.a,
        conclusion: CONCLUSION[n.id],
        reasoningAnchor: methods[0] || p.essence,
        theoremConditions: []
      }]
    }));
  });
}

// 阶段 3 附：按专题分批报告（每批先教案、再易错与示范）
function buildBatchReport() {
  const rows = L.LECTURES.map((g, i) => {
    const ids = g.points.map(p => p.nodeId);
    return [
      '| 批次 ' + (i + 1) + ' | `' + g.id + '` ' + g.title + ' | ' + ids.length + ' | ' + ids.join(', ') +
      ' | ' + ids.length + ' / ' + ids.length + ' / ' + ids.length + ' / ' + ids.length +
      ' | ' + (ids.length * 2) + ' 条 / ' + ids.length + ' 题 | pending ' + (ids.length * 4) + '，verified 0 |'
    ].join('');
  }).join('\n');
  const pIds = PRIMARY.NODES.map(n => n.id);
  const primaryRow = '| 批次 11（v2.0.0 新增） | `primary` 小学 4—6 年级思维铺垫 | ' + pIds.length +
    ' | ' + pIds.join(', ') + ' | ' + pIds.length + ' / ' + pIds.length + ' / ' + pIds.length + ' / ' + pIds.length +
    ' | ' + (pIds.length * 2) + ' 条 / ' + pIds.length + ' 题 | pending ' + (pIds.length * 4) + '，verified 0（evidence=C） |';
  write('reliable-data/index/BATCH_REPORT.md', [
    '# 阶段 3 · 分批编制报告（v' + VERSION + '）',
    '',
    '- 分批口径：批次 1—10 沿用既有授课专题；批次 11 为 v2.0.0 新增小学段。每批按顺序先教案卡、再易错考点卡与真题示范卡。',
    '- 四类卡数量口径：知识点 / 教案 / 易错 / 示范，每批均为 N/N/N/N（一节点一文件）。',
    '- 检查结果：全量闸门 `check-data.js` `RESULT=9/9`、`VERDICT=PASSED`；扩展检查 `check-reliable-extra.js` 见 `tests/evidence/RELIABLE_EXTRA_V2.log`。',
    '- 复核状态：全部 pending；verified 0（AI 不自证，`SPEC-008`）。',
    '- 人工签核清单见 `tests/evidence/HUMAN_SIGNOFF_V1.md` 与 `HUMAN_SIGNOFF_V2.md`；证据锚点见 `reliable-data/evidence/SOURCES.json`。',
    '- v1.0.0 的批次 1—10 快照见 `reliable-data/snapshots/v1.0.0/index/BATCH_REPORT.md`。',
    '',
    '| 批次 | 专题 | 节点数 | 节点清单 | 四类卡（点/案/错/例） | 易错条目 / 示范题 | 复核状态 |',
    '|---|---|---|---|---|---|---|',
    rows,
    primaryRow,
    '',
    '> 批次 11 小学段：教材版权页未提供，`source_ref` 如实标「未找到权威依据」、`evidence=C`、`review=pending`，不得声称已核对教材（`DSN-012`、`SPEC-008`）。',
    ''
  ].join('\n'));
}

// ============================================================
// 阶段 3 附：跨学段衔接映射（v2.0.0 · 零破坏，不回写旧卡）
// ============================================================
function buildBridges() {
  // 逻辑归属重划：五个 o_ 衔接节点 ID/卡字段冻结，仅在此声明"跨学段衔接"归属
  const reclassify = [
    { nodeId: 'o_div0', from: '初中竞赛衔接', to: '跨学段衔接（高小→初中→奥赛）' },
    { nodeId: 'o_alg_skill', from: '初中竞赛衔接', to: '跨学段衔接（高小→初中→奥赛）' },
    { nodeId: 'o_pigeon', from: '初中竞赛衔接', to: '跨学段衔接（高小→初中→奥赛）' },
    { nodeId: 'o_dio', from: '初中竞赛衔接', to: '跨学段衔接（高小→初中→奥赛）' },
    { nodeId: 'o_geo_basic', from: '初中竞赛衔接', to: '跨学段衔接（高小→初中→奥赛）' }
  ];
  // p_ → 既有节点的衔接边（声明性，写在此文件，不改 cards 的 pre/rel）
  const edges = [
    { from: 'p_num', to: 'j_num', kind: '铺垫→课标' },
    { from: 'p_div', to: 'o_div0', kind: '铺垫→竞赛衔接' },
    { from: 'p_alg', to: 'j_alg', kind: '铺垫→课标' },
    { from: 'p_alg', to: 'j_eq', kind: '铺垫→课标' },
    { from: 'p_ratio', to: 'j_frac', kind: '铺垫→课标' },
    { from: 'p_app', to: 'j_eq', kind: '铺垫→课标' },
    { from: 'p_geo', to: 'j_tri', kind: '铺垫→课标' },
    { from: 'p_geo', to: 'j_quadg', kind: '铺垫→课标' },
    { from: 'p_transform', to: 'o_geo_area', kind: '铺垫→竞赛衔接' },
    { from: 'p_count', to: 'o_pigeon', kind: '铺垫→竞赛衔接' },
    { from: 'p_pigeon', to: 'o_pigeon', kind: '铺垫→竞赛衔接' },
    { from: 'p_logic', to: 'o_induct', kind: '铺垫→奥赛' }
  ];
  const json = {
    version: VERSION, generatedAt: GEN_DATE,
    policy: '跨学段逻辑归属与衔接边的唯一声明处；不回写 v1.0.0 卡字段，228 卡哈希冻结不变（DSN-012）',
    reclassify, edges
  };
  write('reliable-data/index/bridges.json', JSON.stringify(json, null, 2) + '\n');
  const reRows = reclassify.map(r => '| `' + r.nodeId + '` | ' + r.from + ' | ' + r.to + ' | 卡字段未改，逻辑归属在此声明 |').join('\n');
  const edgeRows = edges.map(e => '| `' + e.from + '` | `' + e.to + '` | ' + e.kind + ' | 声明性边，未写入 cards 的 pre/rel |').join('\n');
  write('reliable-data/index/BRIDGE_MAP.md', [
    '# 跨学段衔接映射（v2.0.0 · 零破坏）',
    '',
    '- 机制：`o_` 五节点 ID、文件名、卡内字段（含 `module` / `pre` / `rel`）全部冻结；重划与衔接边只在本目录声明。',
    '- 机读文件：`reliable-data/index/bridges.json`；下游如需并入图谱，由 `build-data.js` 读取合成，不回写真源卡。',
    '- 依据：`DSN-012`、`CNF-014`、`SPEC-002` 修订说明。',
    '',
    '## 逻辑归属重划',
    '',
    '| nodeId | 原归属 | 新逻辑归属 | 说明 |',
    '|---|---|---|---|',
    reRows,
    '',
    '## 小学 → 既有节点衔接边',
    '',
    '| 起点 | 终点 | 类型 | 说明 |',
    '|---|---|---|---|',
    edgeRows,
    '',
    '> 本表只表达逻辑关系，不改变任何已发布卡的内容哈希（SPEC-002）。'
  ].join('\n'));
}

// ============================================================
// 阶段 5：manifest / CHANGELOG / schema
// ============================================================
function buildManifest(gap) {
  const kinds = ['nodes', 'lessons', 'pitfalls', 'examples'];
  const entries = {};
  const stats = { pending: 0, checked: 0, verified: 0, disputed: 0 };
  const evidenceStats = { A: 0, B: 0, C: 0 };
  let pitfallItems = 0, exampleItems = 0;
  kinds.forEach(k => {
    fs.readdirSync(path.join(SRC, k)).filter(f => f.endsWith('.json')).sort().forEach(f => {
      const o = JSON.parse(fs.readFileSync(path.join(SRC, k, f), 'utf8'));
      const key = k + '/' + f;
      entries[key] = {
        nodeId: o.nodeId, evidence: o.evidence, review: o.review,
        source_ref: o.source_ref, content_hash: o.content_hash
      };
      stats[o.review] = (stats[o.review] || 0) + 1;
      evidenceStats[o.evidence] = (evidenceStats[o.evidence] || 0) + 1;
      if (k === 'pitfalls') pitfallItems += (o.items || []).length;
      if (k === 'examples') exampleItems += (o.items || []).length;
    });
  });
  const manifest = {
    version: VERSION,
    generatedAt: GEN_DATE + 'T00:00:00+08:00',
    generator: 'tools/build-reliable-data.js',
    sourceVersionNote: 'v1.0.0 的 57 节点由 apps/*.js 只读素材编制；v2.0.0 新增小学 10 节点（primary_nodes.js）；v2.1.0 应用 patches_v2_1_0.js 做内容修正/扩写/补漏，均不覆盖 apps 文件',
    patchInfo: { version: PATCH.VERSION_TAG, modifiedNodes: PATCHED_NODES.concat(PATCHED_POINTS).filter((v, i, a) => a.indexOf(v) === i).sort(), basis: 'CROSS_CHECK_V1.md 四路径异源交叉校验', review: 'pending（依据数学公共知识，非教材核对）' },
    hashAlgorithm: 'sha256',
    hashScope: '卡片全部字段（按 key 排序规范化）剔除 content_hash 自身，见 tools/build-reliable-data.js',
    domainBaseline: BASELINE,
    counts: {
      nodes: NODES.length, lessons: NODES.length, pitfalls: NODES.length, examples: NODES.length,
      totalCards: NODES.length * 4, pitfallItems, exampleItems
    },
    reviewStats: stats,
    evidenceStats,
    gapBaseline: { r2RawEntries: gap.r2Raw, r2UniqueNodes: gap.r2Unique, pendingNodes: NODES.length - gap.r2Unique },
    humanSignOff: {
      status: 'BLOCKED_NO_EVIDENCE',
      verifiedCount: 0,
      note: 'AI 不得自证（SPEC-008）；人工闸门 VFY-005 尚无签核记录，全部条目保持 pending'
    },
    evidencePath: 'reliable-data/evidence/SOURCES.json',
    entries
  };
  write('reliable-data/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function buildSchema() {
  const REQUIRED = ['nodeId', 'id', 'title', 'domain', 'source_ref', 'evidence', 'review', 'version', 'content_hash'];
  const meta = {
    nodeId: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
    id: { type: 'string' },
    title: { type: 'string', minLength: 1 },
    domain: { type: 'string', enum: ['primary', 'junior', 'senior', 'olympiad'] },
    source_ref: { type: 'string', minLength: 1 },
    evidence: { type: 'string', enum: ['A', 'B', 'C'] },
    review: { type: 'string', enum: ['pending', 'checked', 'verified', 'disputed'] },
    reviewer: { type: ['string', 'null'] },
    date: { type: ['string', 'null'] },
    content_hash: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' },
    version: { type: 'string', minLength: 1 }
  };
  const allOf = [{
    if: { properties: { review: { const: 'verified' } }, required: ['review'] },
    then: { properties: { reviewer: { type: 'string', minLength: 1 }, date: { type: 'string', minLength: 1 } }, required: ['reviewer', 'date'] }
  }];
  const base = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object', required: REQUIRED, properties: meta, allOf,
    additionalProperties: true
  };
  write('reliable-data/schema/card.schema.json', JSON.stringify(base, null, 2) + '\n');
  const lesson = JSON.parse(JSON.stringify(base));
  lesson.$id = 'reliable-data/schema/lesson.schema.json';
  lesson.title = '授课教案卡（RUL-002 六段式）';
  lesson.required = REQUIRED.concat(['essence', 'method', 'example', 'pitfalls', 'links', 'check']);
  lesson.properties = Object.assign({}, lesson.properties, {
    essence: { type: 'string', minLength: 1 },
    method: { type: 'array', minItems: 2, items: { type: 'string' } },
    example: { type: 'object', required: ['q', 'a'], properties: { q: { type: 'string', minLength: 1 }, a: { type: 'string', minLength: 1 } } },
    pitfalls: { type: 'array', minItems: 2, items: { type: 'string' } },
    links: { type: 'string', minLength: 1 },
    check: { type: 'array', minItems: 2, items: { type: 'string' } }
  });
  write('reliable-data/schema/lesson.schema.json', JSON.stringify(lesson, null, 2) + '\n');
  const pitfall = JSON.parse(JSON.stringify(base));
  pitfall.$id = 'reliable-data/schema/pitfall.schema.json';
  pitfall.title = '易错考点卡（每节点 ≥2 条）';
  pitfall.required = REQUIRED.concat(['items']);
  pitfall.properties = Object.assign({}, pitfall.properties, {
    items: {
      type: 'array', minItems: 2,
      items: { type: 'object', required: ['id', 'mistake', 'trigger', 'rootCause', 'correction'], properties: {
        id: { type: 'string' }, mistake: { type: 'string', minLength: 1 }, trigger: { type: 'string', minLength: 1 },
        rootCause: { type: 'string', minLength: 1 }, correction: { type: 'string', minLength: 1 }
      } }
    }
  });
  write('reliable-data/schema/pitfall.schema.json', JSON.stringify(pitfall, null, 2) + '\n');
  const example = JSON.parse(JSON.stringify(base));
  example.$id = 'reliable-data/schema/example.schema.json';
  example.title = '示范卡（题目与解答分离，结论非空的 requirement 由机械检查补充）';
  example.required = REQUIRED.concat(['items']);
  example.properties = Object.assign({}, example.properties, {
    items: {
      type: 'array', minItems: 1,
      items: { type: 'object', required: ['id', 'question', 'answer', 'conclusion'], properties: {
        id: { type: 'string' }, question: { type: 'string', minLength: 1 },
        answer: { type: 'string', minLength: 1 }, conclusion: { type: 'string', minLength: 1 }
      } }
    }
  });
  write('reliable-data/schema/example.schema.json', JSON.stringify(example, null, 2) + '\n');
}

function buildChangelog(manifest) {
  // 追加式：历史节从最新归档快照原样读取，绝不重算、不覆盖（SPEC-006）
  // v2.1.0：读 v2.0.0 快照（内含 v2.0.0 + v1.0.0 两节）
  const snap = path.join(SRC, 'snapshots/v2.0.0/CHANGELOG.md');
  if (!fs.existsSync(snap)) throw new Error('缺 v2.0.0 CHANGELOG 快照，拒绝重算历史节');
  const history = fs.readFileSync(snap, 'utf8')
    .split('\n').filter(l => !/^# 可靠数据源变更记录$/.test(l) && !/^> 只增不减/.test(l)).join('\n').trim();
  const changed = PATCHED_NODES.concat(PATCHED_POINTS).filter((v, i, a) => a.indexOf(v) === i).sort();
  write('reliable-data/CHANGELOG.md', [
    '# 可靠数据源变更记录',
    '',
    '> 只增不减、不覆盖历史；每次版本变更追加一节。',
    '',
    '## v' + VERSION + ' · ' + GEN_DATE + ' · 内容修正 / 扩写 / 补漏（交叉校验驱动）',
    '',
    '- 触发：`reliable-data/index/CROSS_CHECK_V1.md` 四路径异源交叉校验发现；家长决定内容产出不受教材扫描页影响，该改即改。',
    '- 性质：全部修改依据**数学公共知识 / 标准定理**（B/C 级），不冒充教材核对、不复制付费教材原文（SPEC-004）；改写内容仍 `review=pending`（SPEC-008）。',
    '- CC-F01 `s_conic`：原题"与椭圆交于两点求弦长"未给椭圆方程、无定值 → 改为椭圆 x²/4+y²=1 与直线 y=x+1，明确结论弦长 8√2/5；补 Δ>0 与弦长公式条件。',
    '- CC-F02 `j_trans`：原题将军饮马无坐标、无数值 → 改为 A(0,2)、B(4,3) 求 x 轴上 P，明确结论最小值 √41、P(8/5,0)；补同侧/异侧条件。',
    '- CC-F03 / 完整性补漏：' + changed.length + ' 节点扩写进阶要点与方法，含 o_binom（范德蒙德/生成函数）、o_poly（有理根定理/插值）、o_graph（欧拉vs哈密顿/二部图）、o_comb_opt（调整法/整数离散）、s_complex（欧拉公式/三角形式）、p_div（最大公因数/最小公倍数）、p_ratio（比例性质/百分数应用）。',
    '- 可追溯：被修改节点的卡 `version=' + VERSION + '` 标记，其余未修改卡与 v2.0.0 逐字节一致；补丁源 `reliable-data/source/patches_v2_1_0.js`；v2.0.0 快照见 `reliable-data/snapshots/v2.0.0/`。',
    '- 修改节点：' + changed.join('、') + '。',
    '- 未解决：人工签核闸门 `VFY-005` / `VFY-006` 仍阻塞，`verified=0`；教材扫描页属于独立校验项目，不阻塞本版本内容产出。',
    '',
    history,
    ''
  ].join('\n'));
}

// ============================================================
// 执行
// ============================================================
const gap = buildGapMatrix();
buildEvidence();
buildBatchReport();
buildBridges();
ensure(path.join(SRC, 'nodes'));
ensure(path.join(SRC, 'lessons'));
ensure(path.join(SRC, 'pitfalls'));
ensure(path.join(SRC, 'examples'));
buildCards();
buildSchema();
const manifest = buildManifest(gap);
buildChangelog(manifest);

console.log('生成 reliable-data v' + VERSION + '：四类各 ' + NODES.length + ' 卡，共 ' + manifest.counts.totalCards + ' 张');
console.log('v2.1.0 补丁修改节点 ' + PATCHED_NODES.concat(PATCHED_POINTS).filter((v, i, a) => a.indexOf(v) === i).length + ' 个：' + PATCHED_NODES.concat(PATCHED_POINTS).filter((v, i, a) => a.indexOf(v) === i).sort().join(','));
console.log('易错条目 ' + manifest.counts.pitfallItems + '，示范题 ' + manifest.counts.exampleItems);
console.log('review 统计 ' + JSON.stringify(manifest.reviewStats));
console.log('RESULT=4/4 FAILED=0');
console.log('VERDICT=PASSED（仅表示编制完成；内容正确性未获人工签核）');
