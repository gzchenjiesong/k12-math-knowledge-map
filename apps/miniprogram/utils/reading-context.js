const draftGuard = require('./draft-guard.js');
const LIMIT = 20;
const TABS = ['lecture', 'graph', 'locator', 'gaps'];
const UI = {
  lecture: [],
  cards: ['keyword', 'filter'],
  node: ['tab', 'foldState', 'hintFoldState', 'sourceExpanded'],
  lesson: ['openIds', 'exampleFold', 'checkFold', 'sourceOpenIds', 'demo', 'focusIdx'],
  graph: ['view', 'expandedDomains', 'expandedModules', 'expandedThemes', 'bridgeOpen'],
  locator: ['mode', 'openGroups', 'expandedIds', 'input', 'locatedInput', 'searched'],
  gaps: ['view', 'filter', 'noteQuery']
};
const LABELS = { lecture: '讲解', cards: '知识卡', node: '知识点', lesson: '讲解详情', graph: '图谱', locator: '题型', gaps: '查漏' };
const records = new Map();
let serial = 0;
let transaction = null;
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function path(name) { return '/pages/' + name + '/' + name; }
function pages() { return typeof getCurrentPages === 'function' ? getCurrentPages() : []; }
function top() { const stack = pages(); return stack[stack.length - 1]; }
function visible(page) { return !!(page && page._reading && page._reading.active && (!top() || top() === page)); }
function routeOf(page) { return page && (page._reading ? path(page._reading.name) : '/' + page.route); }
function frame(page) {
  const state = page._reading;
  const ui = {};
  UI[state.name].forEach(key => { if (page.data[key] !== undefined) ui[key] = copy(page.data[key]); });
  return { id: state.id, instance: state.instance, name: state.name, options: copy(state.options),
    parent: state.parent, ui: ui, scroll: state.scroll };
}
function save(frames) {
  frames.forEach(item => { records.delete(item.id); records.set(item.id, item); });
  while (records.size > LIMIT) records.delete(records.keys().next().value);
}
function ancestry(item) {
  const result = [], seen = new Set();
  while (item && !seen.has(item.id) && result.length < LIMIT) {
    result.unshift(item); seen.add(item.id); item = records.get(item.parent);
  }
  return result;
}
function parentFrame(page) { return records.get(page._reading.retry || page._reading.parent); }
function publish(page) {
  if (!visible(page)) return;
  const previous = parentFrame(page);
  const nativeBack = pages().indexOf(page) > 0;
  page.setData({ readingCanBack: !!previous || nativeBack,
    readingBackLabel: previous ? '返回' + LABELS[previous.name] : '返回' });
}
function renderPosition(page) {
  const state = page._reading, epoch = state.epoch, position = state.pendingPosition;
  page.setData({}, function () {
    if (!visible(page) || state.epoch !== epoch) return;
    if (state.anchor === 'note') {
      state.anchor = null;
      wx.pageScrollTo({ selector: '#note-section', duration: 0 });
    } else if (position && state.pendingPosition === position) {
      state.pendingPosition = null;
      wx.pageScrollTo({ scrollTop: position.scroll || 0, duration: 0 });
    }
  });
}
function applyFrame(page, item) {
  const state = page._reading;
  state.id = item.id; state.parent = item.parent; state.options = copy(item.options);
  state.scroll = item.scroll;
  state.pendingPosition = { scroll: item.scroll };
  // 默认展开标记也是实例级 UI；不复制旧列表或任何业务字段。
  if (state.name === 'graph') page._themeTouched = true;
  if (state.name === 'locator') page._groupTouched = true;
  page.setData(copy(item.ui));
  if (typeof page.onReadingRestore === 'function') page.onReadingRestore();
  renderPosition(page);
}
function finishStep(tx) {
  if (transaction !== tx || !tx.succeeded || !visible(tx.target)) return;
  const step = tx.steps[tx.index];
  const page = tx.target;
  if (step.restore) applyFrame(page, step.restore);
  if (tx.returnId) page._reading.retry = tx.returnId;
  tx.visited.push(page);
  if (tx.index + 1 < tx.steps.length) {
    tx.index++;
    runStep(tx);
    return;
  }
  transaction = null;
  if (tx.capture) save(tx.capture);
  if (tx.parent !== undefined) {
    // tab 是复用实例，但每条业务阅读链必须拥有不同的逻辑片段，避免自环。
    if (TABS.indexOf(page._reading.name) >= 0) page._reading.id = 'r' + (++serial);
    page._reading.parent = tx.parent;
    page._reading.pendingPosition = null;
  }
  if (tx.returnId) {
    // 成功才消费目标片段；父链仍供原生返回与后续跨 tab 使用。
    records.delete(tx.returnId);
    tx.visited.forEach(p => { p._reading.retry = null; });
  }
  if (tx.discard) tx.discard();
  if (tx.focus && typeof page.onReadingFocus === 'function') page.onReadingFocus(tx.focus);
  publish(page);
}
function fail(tx) {
  if (transaction !== tx) return;
  transaction = null;
  if (visible(tx.target)) publish(tx.target);
  else if (visible(tx.source)) publish(tx.source);
  else if (tx.visited.indexOf(top()) >= 0) publish(top());
}
function runStep(tx) {
  if (transaction !== tx) return;
  const step = tx.steps[tx.index], index = tx.index;
  tx.target = null; tx.succeeded = false;
  const success = function () {
    if (transaction !== tx || tx.index !== index) return;
    const current = top();
    if (!tx.target && routeOf(current) === step.route) tx.target = current;
    if (tx.target && current && current !== tx.target) { fail(tx); return; }
    tx.succeeded = true;
    finishStep(tx);
  };
  const failure = function () { if (transaction === tx && tx.index === index) fail(tx); };
  try {
    const args = { success: success, fail: failure };
    if (step.kind === 'navigateBack') args.delta = step.delta;
    else args.url = step.url;
    wx[step.kind](args);
  } catch (error) { failure(); }
}
function begin(page, spec, discard) {
  if (transaction || !visible(page)) return false;
  const tx = Object.assign({ source: page, index: 0, visited: [], discard: discard }, spec);
  transaction = tx;
  runStep(tx);
  return true;
}
function urlFor(item) {
  return path(item.name) + (item.options.id ? '?id=' + encodeURIComponent(item.options.id) : '');
}
function navigate(page, url, options) {
  options = options || {};
  if (transaction || !visible(page)) return false;
  const route = url.split('?')[0];
  const name = route.split('/')[2];
  if (!UI[name] && name !== 'present') return false;
  return draftGuard.leave(page, function (discard) {
    if (transaction || !visible(page)) return;
    // 非阅读页仅保护草稿，不把投屏纳入会话阅读链。
    if (name === 'present') {
      wx.navigateTo({ url: url, success: discard });
      return;
    }
    const source = frame(page);
    begin(page, { steps: [{ kind: TABS.indexOf(name) >= 0 ? 'switchTab' : 'navigateTo', url: url, route: route }],
      capture: ancestry(source), parent: source.id, focus: options.focus }, discard);
  });
}
function back(page) {
  if (transaction || !visible(page)) return false;
  return draftGuard.leave(page, function (discard) {
    const target = parentFrame(page), stack = pages();
    const index = target ? stack.findIndex(p => p !== page && p._reading && p._reading.id === target.id) : stack.length - 2;
    if (index >= 0 && index < stack.length - 1) {
      begin(page, { steps: [{ kind: 'navigateBack', delta: stack.length - index - 1, route: routeOf(stack[index]) }],
        returnId: target && target.id }, discard);
      return;
    }
    if (!target) return;
    const chain = ancestry(target);
    const tabIndex = chain.map(item => TABS.indexOf(item.name) >= 0).lastIndexOf(true);
    const base = tabIndex >= 0 ? chain[tabIndex] : null;
    // 微信原生栈最多十层；超出的逻辑祖先仍保留为显式返回片段。
    const rest = (base ? chain.slice(tabIndex + 1) : chain).slice(-9);
    const steps = [{ kind: 'switchTab', route: base ? path(base.name) : path('lecture'),
      url: base ? path(base.name) : path('lecture'), restore: base }];
    rest.forEach(item => steps.push({ kind: 'navigateTo', route: path(item.name), url: urlFor(item), restore: item }));
    begin(page, { steps: steps, returnId: target.id }, discard);
  });
}
function attach(name, definition) {
  if (!UI[name]) throw new Error('未知阅读页：' + name);
  const load = definition.onLoad, show = definition.onShow, hide = definition.onHide;
  const unload = definition.onUnload, scroll = definition.onPageScroll;
  definition.data = Object.assign({ readingCanBack: false, readingBackLabel: '返回', noteDraftRestored: false }, definition.data);
  definition.onLoad = function (options) {
    options = options || {};
    const instance = ++serial;
    const stack = pages(), previous = stack[stack.indexOf(this) - 1];
    this._reading = { name: name, instance: instance, id: 'r' + instance, options: options.id ? { id: options.id } : {},
      parent: previous && previous._reading ? previous._reading.id : null, active: false, epoch: 0, scroll: 0,
      anchor: name === 'node' && options.anchor === 'note' ? 'note' : null };
    const tx = transaction, step = tx && tx.steps[tx.index];
    if (step && step.route === path(name) && step.restore) {
      this._reading.id = step.restore.id;
      this._reading.parent = step.restore.parent;
    }
    if (load) load.call(this, options);
    if (name === 'node') draftGuard.restore(this, !!(step && step.restore));
  };
  definition.onShow = function () {
    if (!this._reading) this.onLoad(this.options || {});
    const state = this._reading;
    state.active = true; state.epoch++;
    const tx = transaction, step = tx && tx.steps[tx.index];
    if (tx && step.route === path(name)) {
      tx.target = this;
      if (tx.returnId) state.retry = tx.returnId;
    }
    else if (tx && tx.source !== this) fail(tx);
    if (name === 'node') draftGuard.resume(this);
    if (show) show.call(this);
    if (state.anchor || state.pendingPosition) renderPosition(this);
    if (tx && transaction === tx) finishStep(tx);
    publish(this);
  };
  definition.onHide = function () {
    const state = this._reading;
    if (state) {
      if (records.has(state.id)) records.set(state.id, frame(this));
      state.active = false; state.epoch++;
      draftGuard.hide(this);
      if (transaction && transaction.target === this) fail(transaction);
    }
    if (hide) hide.call(this);
  };
  definition.onUnload = function () {
    if (name === 'node') draftGuard.remember(this);
    this.onHide();
    if (unload) unload.call(this);
  };
  definition.onPageScroll = function (event) {
    if (this._reading && this._reading.active && Number.isFinite(event.scrollTop)) this._reading.scroll = Math.max(0, event.scrollTop);
    if (scroll) scroll.call(this, event);
  };
  definition.goReadingBack = function () { return back(this); };
  return definition;
}
function switchTab(url) {
  const page = top();
  if (page && page._reading) {
    if (transaction) return false;
    // 普通底部导航只保护草稿，不把 tab 浏览扩展成 B3 阅读历史。
    return draftGuard.leave(page, function (discard) {
      begin(page, { steps: [{ kind: 'switchTab', route: url, url: url }] }, discard);
    });
  }
  wx.switchTab({ url: url });
}

module.exports = { attach: attach, navigate: navigate, back: back, switchTab: switchTab, clearDraft: draftGuard.clear };
