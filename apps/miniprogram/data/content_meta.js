// GENERATED FILE — 由 tools/build-data.js 从唯一真源生成，请勿手工编辑。
// source=reliable-data version=2.1.0 generatedAt=2026-11-25T00:00:00+08:00
// ⚠ 过渡数据：268 条未人工签核（review=pending），禁止用于交付判断（SPEC-008）

// 导出 DOMAIN_SOURCE / R2_CHECKED / EVIDENCE_LABEL / REVIEW_LABEL / metaFor：证据元数据取组织配置。
const DOMAIN_SOURCE = {
  "junior": {
    "source": "教育部《义务教育数学课程标准》",
    "evidence": "A",
    "note": "知识点范围依课标；讲解措辞为原创"
  },
  "senior": {
    "source": "教育部《普通高中数学课程标准》（2017版2020修订）",
    "evidence": "A",
    "note": "一试不超此课标；讲解措辞为原创"
  },
  "olympiad": {
    "source": "全国中学生数学奥林匹克竞赛大纲（四大板块通行要求）",
    "evidence": "A",
    "note": "板块范围依大纲；细目以集训队当年大纲为准"
  },
  "primary": {
    "source": "小学数学思维铺垫（原创组织；无教材版权页锚点）",
    "evidence": "C",
    "note": "小学分册版权页未提供，未找到权威依据；讲解措辞与例题为原创，evidence=C、review=pending（SPEC-008）"
  }
};
const R2_CHECKED = [
  "o_geo_trans",
  "s_vec3",
  "o_cong",
  "o_fermat",
  "j_quad",
  "s_ineq",
  "s_exp",
  "s_vec",
  "o_numfun",
  "j_prob",
  "o_div0",
  "j_alg",
  "j_eq",
  "s_ineq",
  "o_geo_ceva"
];
const EVIDENCE_LABEL = {
  "A": "官方依据",
  "B": "标准定理",
  "C": "原创讲解"
};
const REVIEW_LABEL = {
  "pending": "待人工复核",
  "checked": "已抽查复算",
  "verified": "已权威核对",
  "disputed": "存疑待修"
};

function metaFor(nodeId, domain) {
  const base = DOMAIN_SOURCE[domain] || DOMAIN_SOURCE.junior;
  const review = R2_CHECKED.indexOf(nodeId) >= 0 ? 'checked' : 'pending';
  return {
    source: base.source, evidence: base.evidence, review: review, note: base.note,
    wording: 'C', wordingNote: '讲解措辞与自编例题为原创，属方法论建议，需人工判断'
  };
}

module.exports = { DOMAIN_SOURCE: DOMAIN_SOURCE, R2_CHECKED: R2_CHECKED, metaFor: metaFor, EVIDENCE_LABEL: EVIDENCE_LABEL, REVIEW_LABEL: REVIEW_LABEL };
