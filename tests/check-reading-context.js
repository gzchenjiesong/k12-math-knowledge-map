#!/usr/bin/env node
// R34 B2：只用 Node 内置模块；隔离真实 store、storage、网络和原生平台。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../apps/miniprogram');
const clone = value => JSON.parse(JSON.stringify(value));
const tests = [];
const test = (name, run) => tests.push({ name, run });
const event = id => ({ currentTarget: { dataset: { id } } });

function harness() {
  const h = { stack: [], tabs: {}, frames: [], requests: [], routes: [], scrolls: [], modals: [], toasts: [],
    writes: 0, noteFails: false, saveFails: false, state: { status: {}, notes: {}, disputed: {} },
    listeners: new Set(), all: [], timers: new Map(), nextTimer: 0, contexts: new Map(), app: { globalData: {} } };
  h.top = () => h.stack[h.stack.length - 1];
  const store = {
    getStatus: id => h.state.status[id] || 0,
    getNote: id => h.state.notes[id] || '',
    getDisputed: id => h.state.disputed[id] || 0,
    setNote(id, text) { h.writes++; if (h.noteFails) return false; h.state.notes[id] = text; return true; },
    setDisputed(id, value) { h.writes++; h.state.disputed[id] = value; return true; },
    setStatus(id, value) { h.writes++; h.state.status[id] = value; return true; },
    load: () => clone(h.state),
    save(state) { h.writes++; if (h.saveFails) return false; h.state = clone(state); return true; },
    stats(nodes) { return { total: nodes.length, done: nodes.filter(n => store.getStatus(n.id) === 2).length }; },
    onChange(fn) { h.listeners.add(fn); return () => h.listeners.delete(fn); }
  };
  const wx = {
    setNavigationBarTitle() {}, getWindowInfo: () => ({ windowWidth: 1024 }),
    showToast: value => h.toasts.push(value), showModal: value => h.modals.push(value),
    pageScrollTo(value) {
      assert.ok(h.top() && h.top()._reading.active, '滚动只作用于当前可见实例');
      if (value.scrollTop !== undefined) h.top().nativeScroll = value.scrollTop;
      h.scrolls.push({ page: h.top(), value });
    },
    navigateTo: args => h.requests.push({ kind: 'navigateTo', args }),
    switchTab: args => h.requests.push({ kind: 'switchTab', args }),
    navigateBack: args => h.requests.push({ kind: 'navigateBack', args })
  };
  const modules = new Map();
  h.load = function (relative) {
    relative = relative.replace(/\\/g, '/');
    if (relative === 'utils/store.js') return store;
    if (relative === 'utils/tabbar.js') return { setSelected() {} };
    assert.match(relative, /^(data\/[^/]+|utils\/(reading-context|draft-guard|status-picker|content-summary)|pages\/(node|lesson|cards|graph|locator|lecture)\/\3)\.js$/, '仅允许隔离加载阅读依赖');
    if (modules.has(relative)) return modules.get(relative).exports;
    const module = { exports: {} }; modules.set(relative, module);
    const context = vm.createContext({ module, wx, getApp: () => h.app, getCurrentPages: () => h.stack,
      Page(definition) { module.exports = definition; },
      require(request) { return h.load(path.posix.normalize(path.posix.join(path.posix.dirname(relative), request))); },
      setTimeout(fn) { const id = ++h.nextTimer; h.timers.set(id, fn); return id; },
      clearTimeout(id) { h.timers.delete(id); }
    });
    h.contexts.set(relative, context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, relative), 'utf8'), context, { filename: relative });
    return module.exports;
  };
  h.reading = h.load('utils/reading-context.js');
  h.records = () => vm.runInContext('Array.from(records.values())', h.contexts.get('utils/reading-context.js'));
  h.drafts = () => vm.runInContext('Array.from(drafts.values())', h.contexts.get('utils/draft-guard.js'));
  h.newPage = function (name, options = {}) {
    const definition = h.load('pages/' + name + '/' + name + '.js');
    const page = Object.assign({}, definition, { data: clone(definition.data), route: 'pages/' + name + '/' + name,
      options, patches: [], loadCount: 0 });
    page.setData = function (patch, callback) {
      this.patches.push(clone(patch));
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
        assert.ok(parts.every(part => !['__proto__', 'prototype', 'constructor'].includes(part)));
        let target = this.data;
        for (const part of parts.slice(0, -1)) { if (!Object.hasOwn(target, part)) target[part] = {}; target = target[part]; }
        target[parts[parts.length - 1]] = clone(value);
      }
      if (callback) h.frames.push(() => callback.call(this));
    };
    h.all.push(page);
    return page;
  };
  h.flush = function () {
    let count = 0;
    while (h.frames.length) { assert.ok(++count < 100); h.frames.shift()(); }
  };
  h.start = function (name = 'lecture', options = {}) {
    const page = h.newPage(name, options); h.stack.push(page);
    if (['lecture', 'graph', 'locator'].includes(name)) h.tabs[name] = page;
    page.loadCount++; page.onLoad(options); page.onShow(); h.flush(); return page;
  };
  h.perform = function ({ fail = false, defer = false, successBeforeShow = false } = {}) {
    const request = h.requests.shift(); assert.ok(request, '应产生导航请求');
    h.routes.push(request);
    if (fail) { if (request.args.fail) request.args.fail({ errMsg: '隔离导航失败' }); return request; }
    let target;
    if (request.kind === 'navigateBack') {
      const delta = request.args.delta || 1;
      assert.ok(h.stack.length > delta);
      h.stack.slice(-delta).reverse().forEach(page => page.onUnload());
      h.stack.splice(-delta); target = h.top();
    } else {
      const [route, search] = request.args.url.split('?'), name = route.split('/')[2];
      const options = Object.fromEntries(new URLSearchParams(search || ''));
      const previous = h.top(); if (previous) previous.onHide();
      if (request.kind === 'switchTab') {
        h.stack.filter(page => !['lecture', 'graph', 'locator'].includes(page._reading.name)).reverse().forEach(page => page.onUnload());
        target = h.tabs[name];
        if (!target) { target = h.newPage(name, options); h.tabs[name] = target; }
        h.stack = [target];
      } else { assert.ok(h.stack.length < 10); target = h.newPage(name, options); h.stack.push(target); }
      if (!target.loadCount) { target.loadCount++; target.onLoad(options); }
    }
    if (successBeforeShow && request.args.success) request.args.success({});
    target.onShow();
    if (!defer && !successBeforeShow && request.args.success) request.args.success({});
    return request;
  };
  h.drain = function () { let count = 0; while (h.requests.length) { assert.ok(++count < 50); h.perform(); h.flush(); } h.flush(); };
  h.externalTab = function (name) { h.requests.push({ kind: 'switchTab', args: { url: '/pages/' + name + '/' + name } }); h.perform(); h.flush(); };
  h.nativeBack = function () { h.requests.push({ kind: 'navigateBack', args: { delta: 1 } }); h.perform(); h.flush(); };
  h.confirm = function (confirm) { const modal = h.modals.shift(); assert.ok(modal); modal.success({ confirm }); if (modal.complete) modal.complete(); return modal; };
  h.remote = function () { [...h.listeners].forEach(fn => fn({}, 'remote')); h.flush(); };
  return h;
}
function cardsNode(h) {
  const root = h.start(); root.goCards(); h.drain(); const cards = h.top();
  const id = cards.data.list[0].id;
  cards.onSearch({ detail: { value: cards.data.list[0].n } }); h.flush();
  cards.setFilter({ currentTarget: { dataset: { filter: 'unmastered' } } }); h.flush();
  cards.onPageScroll({ scrollTop: 240 }); cards.goNode(event(id)); h.drain();
  return { root, cards, node: h.top(), id };
}
function dirty(page, text = '未保存草稿') { page.toggleNote(); page.onNoteInput({ detail: { value: text } }); }
function topic(h) { return h.load('data/topic_index.js').TOPIC_GROUPS[1].items[0]; }

// R34 专项行为，不把 R33 页面冒烟当作本轮验收。
test('cards搜索→node→题型→重建完整链，原生返回cards且读取最新store', () => {
  const h = harness(), { cards, node, id } = cardsNode(h);
  node.switchTab({ currentTarget: { dataset: { tab: 'example' } } });
  node.setData({ foldState: { 0: true }, sourceExpanded: true }); node.onPageScroll({ scrollTop: 680 });
  node.goTopic(event(topic(h).id)); h.drain();
  const locator = h.top(); assert.equal(locator.data.readingCanBack, true);
  assert.equal(locator.data.expandedIds[topic(h).id], true);
  assert.equal(h.app.globalData.focusTopic, undefined);
  h.state.notes[id] = '最新笔记'; h.state.status[id] = 2;
  locator.goReadingBack(); h.drain();
  assert.deepEqual(h.stack.map(p => p._reading.name), ['lecture', 'cards', 'node']);
  const restored = h.top(), restoredCards = h.stack[1];
  assert.notEqual(restored, node); assert.notEqual(restoredCards, cards);
  assert.equal(restored.data.tab, 'example'); assert.equal(restored.data.foldState[0], true);
  assert.equal(restored.data.status, 2); assert.equal(restored.data.note, '最新笔记');
  assert.equal(h.scrolls[h.scrolls.length - 1].value.scrollTop, 680);
  h.nativeBack(); assert.equal(h.top(), restoredCards);
  assert.equal(restoredCards.data.keyword, cards.data.keyword); assert.equal(restoredCards.data.filter, 'unmastered');
  assert.equal(restoredCards.data.list.some(row => row.id === id), false);
  assert.equal(restoredCards._reading.scroll, 240);
  assert.equal(restoredCards.nativeScroll, 240); assert.equal(h.writes, 0);
});

test('连续两次跨tab仍保留完整cards→node→题型→node→图谱相关阅读链', () => {
  const h = harness(), { node, cards, id } = cardsNode(h);
  node.goTopic(event(topic(h).id)); h.drain(); const locatorId = h.top()._reading.id;
  h.top().goNode(event(id)); h.drain(); h.top().setData({ tab: 'explain' });
  h.top().goTheme(); h.drain(); h.top().goReadingBack(); h.drain();
  assert.deepEqual(h.stack.map(page => page._reading.name), ['locator', 'node']);
  assert.equal(h.top().data.tab, 'explain'); h.nativeBack(); assert.equal(h.top()._reading.id, locatorId);
  h.top().goReadingBack(); h.drain();
  assert.deepEqual(h.stack.map(page => page._reading.name), ['lecture', 'cards', 'node']);
  assert.equal(h.top().data.tab, 'concept'); h.nativeBack(); assert.equal(h.top().data.keyword, cards.data.keyword);
  assert.equal(h.writes, 0);
});

test('普通自定义返回只navigateBack并复用实例，状态和笔记来自最新store', () => {
  const h = harness(), { cards, node, id } = cardsNode(h);
  const routeCount = h.routes.length; h.state.status[id] = 1;
  node.goReadingBack(); h.drain();
  assert.equal(h.top(), cards); assert.equal(cards.loadCount, 1);
  assert.deepEqual(h.routes.slice(routeCount).map(row => row.kind), ['navigateBack']);
  assert.equal(cards.data.list.find(row => row.id === id).status, 1);
});

test('同节点多个实例的页签/展开/滚动互不串用', () => {
  const h = harness(), { node, id } = cardsNode(h);
  node.setData({ tab: 'explain', foldState: { 0: true } }); node.onPageScroll({ scrollTop: 333 });
  node.goNode(event(id)); h.drain(); const second = h.top();
  assert.notEqual(second._reading.id, node._reading.id); assert.equal(second.data.tab, 'concept');
  second.setData({ tab: 'example' }); second.goReadingBack(); h.drain();
  assert.equal(h.top(), node); assert.equal(node.data.tab, 'explain'); assert.equal(node._reading.scroll, 333);
});

test('node→自身根tab图谱不会形成环，返回仍重建原链', () => {
  const h = harness(), graph = h.start('graph');
  graph.setData({ view: 'source', expandedDomains: { junior: true } });
  graph.goNode(event(h.load('data/nodes.js').ALL_NODES[0].id)); h.drain(); const node = h.top();
  node.goTheme(); h.drain(); assert.equal(h.top(), graph);
  graph.goReadingBack(); h.drain(); assert.equal(h.top()._reading.name, 'node');
  assert.equal(h.stack[0].data.view, 'source'); assert.equal(h.stack.length, 2);
});

test('lesson跨tab恢复展开/页签，reviewLabel不受个人disputed覆盖', () => {
  const h = harness(), root = h.start(), id = root.data.lectures[0].id;
  root.goLesson(event(id)); h.drain(); const lesson = h.top(), point = lesson.data.points[0];
  lesson.setData({ openIds: { [point.nodeId]: true }, checkFold: { [point.nodeId]: true }, demo: true, focusIdx: 1 });
  const review = point.reviewLabel; lesson.toggleDisputed(event(point.nodeId));
  assert.equal(lesson.data.points[0].reviewLabel, review);
  lesson.goTopic(event(topic(h).id)); h.drain(); h.top().goReadingBack(); h.drain();
  assert.deepEqual(h.stack.map(p => p._reading.name), ['lecture', 'lesson']);
  assert.equal(h.top().data.openIds[point.nodeId], true); assert.equal(h.top().data.checkFold[point.nodeId], true);
  assert.equal(h.top().data.points[0].reviewLabel, review); assert.equal(h.top().data.points[0].disputed, 1);
});

test('导航失败不新增/消费片段、不污染全局focus，允许重试', () => {
  const h = harness(), { node } = cardsNode(h), before = clone(h.records());
  node.goTopic(event(topic(h).id)); h.perform({ fail: true });
  assert.deepEqual(clone(h.records()), before); assert.deepEqual(h.app.globalData, {}); assert.equal(h.top(), node);
  node.goTopic(event(topic(h).id)); h.drain(); assert.equal(h.top()._reading.name, 'locator');
});

for (const failedStep of [0, 1, 2]) {
  test('重建第' + (failedStep + 1) + '步失败保留返回片段，部分页面可重试完整链', () => {
    const h = harness(), { node } = cardsNode(h);
    node.goTopic(event(topic(h).id)); h.drain(); const targetId = h.top()._reading.parent;
    h.top().goReadingBack();
    for (let index = 0; index < failedStep; index++) { h.perform(); h.flush(); }
    h.perform({ fail: true }); h.flush();
    assert.ok(h.records().some(row => row.id === targetId));
    assert.equal(h.top().data.readingCanBack, true);
    h.top().goReadingBack(); h.drain(); assert.equal(h.top()._reading.name, 'node');
    assert.deepEqual(h.stack.map(p => p._reading.name), ['lecture', 'cards', 'node']);
  });
}

test('navigateBack失败不消费片段，第二次成功返回复用实例', () => {
  const h = harness(), { node, cards } = cardsNode(h), before = clone(h.records());
  node.goReadingBack(); h.perform({ fail: true });
  assert.deepEqual(clone(h.records()), before); assert.equal(h.top(), node);
  node.goReadingBack(); h.drain(); assert.equal(h.top(), cards);
});

test('隐藏目标页后的迟到导航成功不设置focus、滚动或消费记录', () => {
  const h = harness(), { node } = cardsNode(h);
  node.goTopic(event(topic(h).id)); const pending = h.perform({ defer: true }), locator = h.top();
  h.externalTab('graph'); const patches = locator.patches.length, count = h.scrolls.length, records = clone(h.records());
  pending.args.success({}); h.flush();
  assert.equal(locator.patches.length, patches); assert.equal(h.scrolls.length, count);
  assert.deepEqual(clone(h.records()), records); assert.deepEqual(h.app.globalData, {});
});

test('重建滚动渲染回调迟到不滚动隐藏页', () => {
  const h = harness(), { node } = cardsNode(h);
  node.goTopic(event(topic(h).id)); h.drain(); h.top().goReadingBack();
  while (h.requests.length) h.perform();
  const restored = h.top(); h.externalTab('graph'); const count = h.scrolls.length;
  h.flush(); assert.equal(restored._reading.active, false); assert.equal(h.scrolls.length, count);
});

test('重建中间页渲染迟到，原生返回时补恢复该页真实滚动位置', () => {
  const h = harness(), { node } = cardsNode(h);
  node.goTopic(event(topic(h).id)); h.drain(); h.top().goReadingBack();
  while (h.requests.length) h.perform();
  h.flush(); const cards = h.stack[1]; assert.equal(cards.nativeScroll, undefined);
  h.nativeBack(); assert.equal(cards.nativeScroll, 240);
});

test('导航success先于onShow也完成恢复；重复成功回调不重复消费', () => {
  const h = harness(), root = h.start(); root.goCards();
  const request = h.perform({ successBeforeShow: true }); h.flush();
  assert.equal(h.top().data.readingCanBack, true);
  assert.equal(h.records().length, 1, 'success先于onShow不能丢失成功提交');
  const before = clone(h.records()); request.args.success({}); assert.deepEqual(clone(h.records()), before);
});

test('返回片段最多20个，白名单不含业务字段、笔记、焦点与持久化', () => {
  const h = harness(); let page = h.start('graph');
  page.setData({ note: '禁止快照的业务内容', status: 2, disputed: 1, list: ['不能保存'] });
  for (let i = 0; i < 45; i++) {
    h.reading.navigate(page, '/pages/' + (i % 2 ? 'graph/graph' : 'locator/locator')); h.drain(); page = h.top();
    assert.ok(h.records().length <= 20);
  }
  assert.equal(h.records().length, 20);
  for (const row of h.records()) {
    assert.deepEqual(Object.keys(row).sort(), ['id', 'instance', 'name', 'options', 'parent', 'scroll', 'ui']);
    ['note', 'status', 'disputed', 'list', 'focusId', 'results'].forEach(key => assert.equal(Object.hasOwn(row.ui, key), false));
  }
  assert.equal(h.writes, 0); assert.equal(harness().records().length, 0);
});

test('普通底部tab导航不扩展为持久阅读历史', () => {
  const h = harness(); h.start();
  for (let i = 0; i < 25; i++) { h.reading.switchTab('/pages/' + (i % 2 ? 'graph/graph' : 'locator/locator')); h.drain(); }
  assert.equal(h.records().length, 0); assert.equal(h.writes, 0);
});

test('可控制返回取消不离开、不写store、不丢草稿', () => {
  const h = harness(), { node } = cardsNode(h); dirty(node);
  node.goReadingBack(); assert.equal(h.requests.length, 0); h.confirm(false);
  assert.equal(h.top(), node); assert.equal(h.writes, 0); assert.equal(node.data.note, '未保存草稿');
  assert.equal(node.data.editingNote, true); assert.equal(h.requests.length, 0);
});

test('可控制跨tab取消不设置focus；确认后导航失败仍保留草稿', () => {
  const h = harness(), { node } = cardsNode(h); dirty(node);
  node.goTopic(event(topic(h).id)); h.confirm(false); assert.equal(h.requests.length, 0);
  node.goTopic(event(topic(h).id)); h.confirm(true); h.perform({ fail: true });
  assert.equal(node.data.note, '未保存草稿'); assert.equal(node.data.editingNote, true);
  assert.equal(h.writes, 0); assert.deepEqual(h.app.globalData, {});
});

test('确认放弃只在成功后生效，返回旧实例不会复活已放弃草稿', () => {
  const h = harness(), { node, id } = cardsNode(h); dirty(node);
  node.goNode(event(id)); h.confirm(true); h.drain();
  h.nativeBack(); assert.equal(h.top(), node); assert.equal(node.data.editingNote, false);
  assert.equal(node.data.note, ''); assert.equal(h.writes, 0);
});

test('放弃后跨tab卸载不能再次把草稿放回会话池', () => {
  const h = harness(), { node } = cardsNode(h); dirty(node);
  node.goTopic(event(topic(h).id)); h.confirm(true); h.drain();
  assert.equal(h.drafts().length, 0); h.top().goReadingBack(); h.drain();
  assert.equal(h.top().data.editingNote, false); assert.equal(h.top().data.note, ''); assert.equal(h.writes, 0);
});

test('原生返回卸载保留会话草稿，再进入恢复但不伪称已保存', () => {
  const h = harness(), { node, cards, id } = cardsNode(h); dirty(node); h.nativeBack();
  assert.equal(h.modals.length, 0); assert.equal(h.drafts().length, 1); assert.equal(h.writes, 0);
  h.state.notes[id] = '远端新笔记'; cards.goNode(event(id)); h.drain();
  assert.equal(h.top().data.note, '未保存草稿'); assert.equal(h.top().data.editingNote, true);
  assert.equal(h.top().data.noteDraftRestored, true); assert.equal(h.state.notes[id], '远端新笔记');
  assert.equal(h.toasts.some(toast => toast.title === '笔记已保存'), false);
  h.top().toggleNote(); assert.equal(h.top().data.note, '远端新笔记'); assert.equal(h.writes, 0);
});

test('多实例同节点草稿不串，系统返回到仍存活编辑器保留其原草稿', () => {
  const h = harness(), { node, id } = cardsNode(h); dirty(node, '实例A');
  // 系统/外部入口无法拦截，直接模拟原生打开另一个实例。
  h.requests.push({ kind: 'navigateTo', args: { url: '/pages/node/node?id=' + id } }); h.perform(); h.flush();
  const second = h.top(); assert.equal(second.data.editingNote, false); dirty(second, '实例B'); h.nativeBack();
  assert.equal(h.top(), node); assert.equal(node.data.note, '实例A'); assert.equal(node.data.editingNote, true);
  assert.equal(h.drafts()[0].text, '实例B'); assert.equal(h.writes, 0);
});

test('保存失败继续编辑；成功仅显式保存一次；取消读最新store', () => {
  const h = harness(), { node, id } = cardsNode(h); dirty(node); h.noteFails = true; node.saveNote();
  assert.equal(node.data.editingNote, true); assert.equal(node.data.note, '未保存草稿'); assert.equal(h.writes, 1);
  h.state.notes[id] = '同步更新'; h.remote(); assert.equal(node.data.note, '未保存草稿');
  node.toggleNote(); assert.equal(node.data.note, '同步更新'); assert.equal(h.writes, 1);
  dirty(node, '显式保存'); h.noteFails = false; node.saveNote();
  assert.equal(h.state.notes[id], '显式保存'); assert.equal(node.data.editingNote, false); assert.equal(h.writes, 2);
});

test('隐藏后的迟到确认不会导航、丢草稿或写store', () => {
  const h = harness(), { node } = cardsNode(h); dirty(node); node.goReadingBack();
  const modal = h.modals.shift(); h.nativeBack(); modal.success({ confirm: true }); h.flush();
  assert.equal(h.requests.length, 0); assert.equal(h.writes, 0); assert.equal(h.drafts().length, 1);
});

test('会话草稿有界20条，重启会话不恢复；不覆盖其他节点', () => {
  const h = harness(), root = h.start(); root.goCards(); h.drain(); const cards = h.top();
  const ids = cards.data.list.slice(0, 21).map(row => row.id);
  for (const id of ids) { cards.goNode(event(id)); h.drain(); dirty(h.top(), id + '草稿'); h.nativeBack(); }
  assert.equal(h.drafts().length, 20); cards.goNode(event(ids[0])); h.drain();
  assert.equal(h.top().data.editingNote, false); assert.equal(h.writes, 0);
  const fresh = harness(); fresh.start('node', { id: ids[20] }); assert.equal(fresh.top().data.editingNote, false);
});

test('note锚点只在渲染后定位，隐藏后的迟到渲染无效', () => {
  const h = harness(); const id = h.load('data/nodes.js').ALL_NODES[0].id;
  const root = h.start(); h.reading.navigate(root, '/pages/node/node?id=' + id + '&anchor=note'); h.perform();
  assert.equal(h.scrolls.length, 0); h.flush(); assert.equal(h.scrolls[0].value.selector, '#note-section');
  h.nativeBack(); h.reading.navigate(root, '/pages/node/node?id=' + id + '&anchor=note'); h.perform();
  h.nativeBack(); assert.equal(h.scrolls.length, 1);
});

test('R33题型非默认父子展开与隐藏迟到防护保持', () => {
  const h = harness(), locator = h.start('locator'), item = topic(h);
  const group = h.load('data/topic_index.js').TOPIC_GROUPS.find(g => g.items.some(it => it.id === item.id));
  locator.focusTopic(item.id); assert.equal(h.scrolls.length, 0);
  assert.equal(locator.data.openGroups[group.theme], true); assert.equal(locator.data.expandedIds[item.id], true);
  h.flush(); assert.equal(h.scrolls[0].value.selector, '#topic-index-' + item.id);
  const timers = [...h.timers.values()]; h.externalTab('graph'); const patches = locator.patches.length;
  timers.forEach(fn => fn()); h.flush(); assert.equal(locator.patches.length, patches); assert.equal(locator.data.focusId, '');
});

test('locator重建按原查询重算结果，不把尚未提交输入误当查询', () => {
  const h = harness(), locator = h.start('locator');
  locator.setData({ mode: 'search', input: '证明三点共线' }); locator.locate();
  const ids = locator.data.results.map(row => row.id); assert.ok(ids.length);
  locator.onInput({ detail: { value: '尚未提交的输入' } }); locator.goNode(event(ids[0])); h.drain();
  h.top().goTheme(); h.drain(); h.top().goReadingBack(); h.drain();
  h.nativeBack(); assert.equal(h.top(), locator); assert.equal(locator.data.input, '尚未提交的输入');
  assert.deepEqual(locator.data.results.map(row => row.id), ids);
});

test('取消订阅后已经出队的remote回调不写隐藏页面', () => {
  const h = harness(), { node } = cardsNode(h), late = [...h.listeners];
  h.nativeBack(); const count = node.patches.length; late.forEach(fn => fn({}, 'remote'));
  assert.equal(node.patches.length, count);
});

test('目标已显示但返回回调失败，仍能从目标重试，不消费原片段', () => {
  const h = harness(), { node } = cardsNode(h);
  node.goTopic(event(topic(h).id)); h.drain(); const id = h.top()._reading.parent;
  h.top().goReadingBack(); h.perform(); h.perform(); const late = h.perform({ defer: true });
  late.args.fail({}); h.flush(); assert.ok(h.records().some(row => row.id === id));
  assert.equal(h.top()._reading.retry, id); h.top().goReadingBack(); h.drain();
  assert.equal(h.top()._reading.name, 'node'); assert.equal(h.top()._reading.retry, null);
});

test('新跨tab焦点废弃该tab以前尚未完成的滚动恢复', () => {
  const h = harness(), locator = h.start('locator'), item = topic(h);
  locator._reading.pendingPosition = { scroll: 900 };
  locator.goNode(event(h.load('data/nodes.js').ALL_NODES[0].id)); h.drain();
  h.top().goTopic(event(item.id)); h.perform();
  h.frames.reverse(); h.flush();
  assert.equal(h.scrolls[h.scrolls.length - 1].value.selector, '#topic-index-' + item.id);
  assert.equal(h.scrolls.some(row => row.value.scrollTop === 900), false);
});

test('导航抛错保留草稿和返回记录，后续导航可重试', () => {
  const h = harness(), { node } = cardsNode(h); dirty(node);
  const context = h.contexts.get('utils/reading-context.js'), previous = context.wx.switchTab;
  context.wx.switchTab = () => { throw new Error('隔离导航异常'); };
  const before = clone(h.records()); node.goTopic(event(topic(h).id)); h.confirm(true);
  assert.deepEqual(clone(h.records()), before); assert.equal(node.data.editingNote, true);
  context.wx.switchTab = previous; node.goTopic(event(topic(h).id)); h.confirm(false);
  assert.equal(h.writes, 0);
});

test('过期导航回调不能消费新一轮记录或清掉新事务', () => {
  const h = harness(), { node } = cardsNode(h);
  node.goTopic(event(topic(h).id)); const old = h.perform({ fail: true });
  node.goTheme(); old.args.success({}); old.args.fail({}); h.drain();
  assert.equal(h.top()._reading.name, 'graph'); assert.equal(h.top().data.readingCanBack, true);
  h.top().goReadingBack(); h.drain(); assert.equal(h.top()._reading.name, 'node');
});

test('重建同节点原实例，不误领另一实例的卸载草稿', () => {
  const h = harness(), { node, id } = cardsNode(h); dirty(node, '旧实例草稿');
  h.requests.push({ kind: 'navigateTo', args: { url: '/pages/node/node?id=' + id } }); h.perform(); h.flush();
  const second = h.top(); dirty(second, '新实例草稿');
  h.nativeBack(); assert.equal(h.drafts().length, 1);
  // 新建受控阅读链中不应恢复无关实例的卸载草稿。
  node.goTopic(event(topic(h).id)); h.confirm(true); h.drain(); h.top().goReadingBack(); h.drain();
  assert.equal(h.top().data.editingNote, false); assert.equal(h.top().data.note, '');
  assert.equal(h.drafts()[0].text, '新实例草稿'); assert.equal(h.writes, 0);
});

test('lesson批量确认取消不保存，确认单次save，失败不伪称成功', () => {
  const h = harness(), root = h.start(); root.goLesson(event(root.data.lectures[0].id)); h.drain(); const page = h.top();
  page.markWholeDone(); h.confirm(false); assert.equal(h.writes, 0);
  page.markWholeDone(); h.confirm(true); assert.equal(h.writes, 1);
  h.saveFails = true; page.markWholeDone(); h.confirm(true); assert.equal(h.writes, 2);
  assert.equal(h.toasts[h.toasts.length - 1].title, '本地保存失败，请重试');
});

let passed = 0;
for (const item of tests) {
  try { item.run(); passed++; console.log('PASS ' + item.name); }
  catch (error) { console.error('FAIL ' + item.name + '\n' + error.stack); }
}
console.log('SUITE=R34_B2');
console.log('RESULT=' + passed + '/' + tests.length + ' FAILED=' + (tests.length - passed));
console.log('VERDICT=' + (passed === tests.length ? 'PASSED' : 'FAILED'));
console.log('NATIVE_EVIDENCE=BLOCKED_NO_EVIDENCE（隔离测试不是微信原生验收）');
if (!tests.length || passed !== tests.length) process.exitCode = 1;
