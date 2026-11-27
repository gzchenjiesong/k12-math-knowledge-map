const contentMeta = require('../data/content_meta.js');
const KINDS = { nodes: '知识点卡', lessons: '教案卡', pitfalls: '易错卡', examples: '示范题卡' };
const REVIEWS = ['pending', 'checked', 'verified', 'disputed'];
const SUPPLEMENTAL = '组织补充 · 独立待核';

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value : '未提供';
}

function metaFor(id, domain) {
  try { return object(contentMeta.metaFor(id, domain)); }
  catch (error) { return {}; }
}

function origins(item) {
  item = object(item);
  return (Array.isArray(item.origins) ? item.origins : []).concat(item.origin ? [item.origin] : []);
}

function isSupplemental(origin) {
  return /^reliable-data\/source\/app_organization\.json#cards\.[A-Za-z0-9_]+$/.test(object(origin).path || '');
}

function decorateCard(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return null;
  const decorate = function (item) {
    item = object(item);
    return Object.assign({}, item, {
      originNote: origins(item).some(isSupplemental) ? SUPPLEMENTAL : ''
    });
  };
  return Object.assign({}, card, {
    explain: (Array.isArray(card.explain) ? card.explain : []).map(decorate),
    examples: (Array.isArray(card.examples) ? card.examples : []).map(function (item) {
      const result = decorate(item);
      result.hasHint = typeof result.hint === 'string' && !!result.hint.trim();
      return result;
    })
  });
}

function build(id, domain, card, tab) {
  const meta = metaFor(id, domain);
  card = object(card);
  const items = tab === 'concept' ? (card.concept ? [card.concept] : []) :
    (tab === 'explain' ? card.explain : card.examples);
  const rows = [];
  const seen = {};
  let supplementalCount = 0;
  let unknownOriginCount = 0;
  (Array.isArray(items) ? items : []).forEach(function (item) {
    const refs = origins(item);
    if (!refs.length) unknownOriginCount++;
    if (refs.some(isSupplemental)) supplementalCount++;
    refs.forEach(function (origin) {
      if (isSupplemental(origin)) return;
      const originPath = object(origin).path;
      const match = typeof originPath === 'string' && /^reliable-data\/(nodes|lessons|pitfalls|examples)\/([A-Za-z0-9_]+)\.json$/.exec(originPath);
      if (!match) { unknownOriginCount++; return; }
      const kind = match[1], nodeId = match[2], key = kind + ':' + nodeId;
      if (seen[key]) return;
      seen[key] = true;
      const sourceMeta = nodeId === id ? meta : metaFor(nodeId);
      const rawReview = object(object(sourceMeta.cards)[kind]).review;
      const review = REVIEWS.indexOf(rawReview) >= 0 ? rawReview : '';
      rows.push({
        key: key, kind: kind, nodeId: nodeId,
        label: KINDS[kind] + (nodeId === id ? '' : '（' + nodeId + '）'),
        review: review,
        reviewLabel: review ? text(contentMeta.REVIEW_LABEL[review]) : '未提供'
      });
    });
  });
  const sources = Array.isArray(meta.sources) ? meta.sources : null;
  const scope = sources && sources.filter(function (source) { return object(source).purpose === 'scope'; });
  const gaps = Array.isArray(meta.gaps) ? meta.gaps.map(text) : null;
  return {
    cards: rows,
    supplementalCount: supplementalCount,
    supplementalLabel: supplementalCount ? SUPPLEMENTAL : '',
    unknownOriginCount: unknownOriginCount,
    scopeCount: scope ? scope.length : null,
    checkedScopeCount: scope ? scope.filter(function (source) { return source.verification === 'section_checked'; }).length : null,
    gapCount: gaps ? gaps.length : null,
    gaps: gaps || [],
    source: text(meta.source),
    boundary: '范围定位不等于内容已核；审核状态取自真源登记。'
  };
}

module.exports = { build: build, decorateCard: decorateCard };
