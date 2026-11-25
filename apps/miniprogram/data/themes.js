// GENERATED FILE — 由 tools/build-data.js 从唯一真源生成，请勿手工编辑。
// source=reliable-data version=2.1.0 generatedAt=2026-11-25T00:00:00+08:00
// ⚠ 过渡数据：268 条未人工签核（review=pending），禁止用于交付判断（SPEC-008）
// 导出 THEMES / THEME_OF / THEME_NAME / DOMAIN_SHORT：主题外壳取组织配置。
module.exports = {
  "THEMES": [
    {
      "id": "t_primary",
      "name": "小学数学思维铺垫",
      "sub": "运算 · 整除 · 代数 · 比 · 几何 · 计数 · 逻辑",
      "tone": "tone6",
      "nodeIds": [
        "p_num",
        "p_div",
        "p_alg",
        "p_ratio",
        "p_app",
        "p_geo",
        "p_transform",
        "p_count",
        "p_pigeon",
        "p_logic"
      ]
    },
    {
      "id": "t_alg",
      "name": "代数基础与变形",
      "sub": "数与式 · 因式分解 · 分式根式 · 多项式",
      "tone": "tone1",
      "nodeIds": [
        "j_num",
        "j_alg",
        "j_frac",
        "o_alg_skill",
        "o_poly"
      ]
    },
    {
      "id": "t_eq",
      "name": "方程与不等式",
      "sub": "解方程 → 证不等式 → 求最值",
      "tone": "tone2",
      "nodeIds": [
        "j_eq",
        "j_ineq",
        "s_ineq",
        "o_ineq"
      ]
    },
    {
      "id": "t_func",
      "name": "集合与函数",
      "sub": "集合语言 · 函数性质 · 二次函数 · 导数 · 函数方程",
      "tone": "tone3",
      "nodeIds": [
        "s_set",
        "j_fun",
        "j_quad",
        "s_func",
        "s_exp",
        "s_deriv",
        "o_func_eq"
      ]
    },
    {
      "id": "t_trig",
      "name": "三角与复数",
      "sub": "解三角形 · 恒等变换 · 复数工具",
      "tone": "tone4",
      "nodeIds": [
        "j_trig",
        "s_trig",
        "o_trig_id",
        "s_complex",
        "o_complex"
      ]
    },
    {
      "id": "t_seq",
      "name": "数列与归纳",
      "sub": "数列 · 数学归纳法 · 递推与特征方程",
      "tone": "tone5",
      "nodeIds": [
        "s_seq",
        "o_induct",
        "o_recur"
      ]
    },
    {
      "id": "t_geo",
      "name": "平面几何",
      "sub": "三角形 → 圆 → 梅涅劳斯/塞瓦 → 面积法 → 几何变换",
      "tone": "tone6",
      "nodeIds": [
        "j_tri",
        "j_cong",
        "j_quadg",
        "j_simi",
        "j_circle",
        "j_trans",
        "o_geo_basic",
        "o_geo_ceva",
        "o_geo_area",
        "o_geo_circle",
        "o_geo_trans",
        "o_geo_ineq",
        "o_geo_vec"
      ]
    },
    {
      "id": "t_solid",
      "name": "立体几何与向量",
      "sub": "空间想象 · 平面向量 · 空间向量",
      "tone": "tone7",
      "nodeIds": [
        "s_solid",
        "s_vec",
        "s_vec3"
      ]
    },
    {
      "id": "t_analytic",
      "name": "解析几何",
      "sub": "直线与圆 · 圆锥曲线",
      "tone": "tone8",
      "nodeIds": [
        "s_line",
        "s_conic"
      ]
    },
    {
      "id": "t_num",
      "name": "数论",
      "sub": "整除同余 · 不定方程 · 费马/欧拉/孙子定理 · 数论函数",
      "tone": "tone9",
      "nodeIds": [
        "o_div0",
        "o_dio",
        "o_cong",
        "o_dio2",
        "o_fermat",
        "o_numfun"
      ]
    },
    {
      "id": "t_comb",
      "name": "组合与概率统计",
      "sub": "计数原理 · 抽屉容斥 · 极端不变量 · 图论 · 概率统计",
      "tone": "tone10",
      "nodeIds": [
        "o_pigeon",
        "j_stats",
        "j_prob",
        "s_count",
        "s_prob",
        "o_binom",
        "o_comb_adv",
        "o_graph",
        "o_comb_opt"
      ]
    }
  ],
  "THEME_OF": {
    "p_num": "t_primary",
    "p_div": "t_primary",
    "p_alg": "t_primary",
    "p_ratio": "t_primary",
    "p_app": "t_primary",
    "p_geo": "t_primary",
    "p_transform": "t_primary",
    "p_count": "t_primary",
    "p_pigeon": "t_primary",
    "p_logic": "t_primary",
    "j_num": "t_alg",
    "j_alg": "t_alg",
    "j_frac": "t_alg",
    "o_alg_skill": "t_alg",
    "o_poly": "t_alg",
    "j_eq": "t_eq",
    "j_ineq": "t_eq",
    "s_ineq": "t_eq",
    "o_ineq": "t_eq",
    "s_set": "t_func",
    "j_fun": "t_func",
    "j_quad": "t_func",
    "s_func": "t_func",
    "s_exp": "t_func",
    "s_deriv": "t_func",
    "o_func_eq": "t_func",
    "j_trig": "t_trig",
    "s_trig": "t_trig",
    "o_trig_id": "t_trig",
    "s_complex": "t_trig",
    "o_complex": "t_trig",
    "s_seq": "t_seq",
    "o_induct": "t_seq",
    "o_recur": "t_seq",
    "j_tri": "t_geo",
    "j_cong": "t_geo",
    "j_quadg": "t_geo",
    "j_simi": "t_geo",
    "j_circle": "t_geo",
    "j_trans": "t_geo",
    "o_geo_basic": "t_geo",
    "o_geo_ceva": "t_geo",
    "o_geo_area": "t_geo",
    "o_geo_circle": "t_geo",
    "o_geo_trans": "t_geo",
    "o_geo_ineq": "t_geo",
    "o_geo_vec": "t_geo",
    "s_solid": "t_solid",
    "s_vec": "t_solid",
    "s_vec3": "t_solid",
    "s_line": "t_analytic",
    "s_conic": "t_analytic",
    "o_div0": "t_num",
    "o_dio": "t_num",
    "o_cong": "t_num",
    "o_dio2": "t_num",
    "o_fermat": "t_num",
    "o_numfun": "t_num",
    "o_pigeon": "t_comb",
    "j_stats": "t_comb",
    "j_prob": "t_comb",
    "s_count": "t_comb",
    "s_prob": "t_comb",
    "o_binom": "t_comb",
    "o_comb_adv": "t_comb",
    "o_graph": "t_comb",
    "o_comb_opt": "t_comb"
  },
  "THEME_NAME": {
    "t_primary": "小学数学思维铺垫",
    "t_alg": "代数基础与变形",
    "t_eq": "方程与不等式",
    "t_func": "集合与函数",
    "t_trig": "三角与复数",
    "t_seq": "数列与归纳",
    "t_geo": "平面几何",
    "t_solid": "立体几何与向量",
    "t_analytic": "解析几何",
    "t_num": "数论",
    "t_comb": "组合与概率统计"
  },
  "DOMAIN_SHORT": {
    "primary": "小学",
    "junior": "初中",
    "senior": "高中",
    "olympiad": "奥赛"
  }
};
