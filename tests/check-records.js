#!/usr/bin/env node
// R34 B4/B6：仅用 Node 内置模块；真实页面/store/协议，平台、storage、网络完全隔离。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../apps/miniprogram');
const PAGES = ['lecture', 'graph', 'locator', 'gaps', 'cards', 'node', 'lesson'];
const TABS = new Set(['lecture', 'graph', 'locator', 'gaps']);
const KEY = 'olympiad_cards_state_v1';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const event = (key, value) => ({ currentTarget: { dataset: { [key]: value } } });
const byId = id => event('id', id);
const input = value => ({ detail: { value } });
const tests = [];
const test = (name, run) => tests.push({ name, run });

function harness() {
  const h = { stack: [], tabs: {}, frames: [], requests: [], routes: [], scrolls: [], toasts: [],
    storage: new Map(), storageAttempts: 0, storageWrites: 0, failStorage: false,
    mutations: [], listeners: new Set(), timers: new Map(), nextTimer: 0, remoteSeq: 0,
    app: { globalData: {} }, modules: new Map() };
  h.top = () => h.stack.at(-1);
  const wx = {
    getStorageSync(key) { return h.realm(h.storage.get(key)); },
    setStorageSync(key, value) {
      h.storageAttempts++;
      if (h.failStorage) throw new Error('隔离 storage 写入失败');
      h.storage.set(key, clone(value)); h.storageWrites++;
    },
    setNavigationBarTitle() {}, getWindowInfo: () => ({ windowWidth: 1024 }),
    showToast(value) { h.toasts.push(clone(value)); },
    showModal() { throw new Error('本组测试不应出现确认弹窗'); },
    showActionSheet() { throw new Error('只读操作不应打开状态选择菜单'); },
    pageScrollTo(value) {
      const page = h.top();
      assert.ok(page && page._reading.active, '仅当前可见页面可滚动');
      if (value.scrollTop !== undefined) page.nativeScroll = value.scrollTop;
      if (value.selector === '#note-section') {
        assert.ok(page.rendered && page.rendered.node, '笔记定位必须晚于详情渲染');
        assert.equal(page._reading.name, 'node');
      }
      h.scrolls.push({ page, value: clone(value) });
    },
    navigateTo(args) { h.requests.push({ kind: 'navigateTo', args }); },
    switchTab(args) { h.requests.push({ kind: 'switchTab', args }); },
    navigateBack(args) { h.requests.push({ kind: 'navigateBack', args }); }
  };
  // 每个用例独立 VM；模块共享同一 realm，避免协议 plain-object 校验被跨 VM 原型误伤。
  const context = vm.createContext({ wx, getApp: () => h.app, getCurrentPages: () => h.stack,
    setTimeout(fn) { const id = ++h.nextTimer; h.timers.set(id, fn); return id; },
    clearTimeout(id) { h.timers.delete(id); }
  });
  h.realm = value => value === undefined ? undefined :
    vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context);
  h.load = function (filename) {
    filename = path.posix.normalize(filename);
    if (!path.posix.extname(filename)) filename += '.js';
    assert.match(filename, /^(data\/[^/]+|utils\/(store|sync-state|tabbar|reading-context|draft-guard|status-picker|content-summary)|pages\/(lecture|graph|locator|gaps|cards|node|lesson)\/\3)\.js$/, '仅加载明确允许的真实本地模块');
    if (h.modules.has(filename)) return h.modules.get(filename).exports;
    const module = { exports: {} }; h.modules.set(filename, module);
    const wrapper = vm.runInContext('(function(require,module,exports,Page){\n' + read(filename) + '\n})', context, { filename });
    wrapper(request => {
      assert.ok(request.startsWith('.'), '禁止依赖外部包或网络');
      return h.load(path.posix.join(path.posix.dirname(filename), request));
    }, module, module.exports, definition => { module.exports = definition; });
    return module.exports;
  };
  h.store = h.load('utils/store.js');
  h.protocol = h.load('utils/sync-state.js');
  h.reading = h.load('utils/reading-context.js');
  // 只透传计数，不替代任何 store 实现；失败通过真实 persist 的平台边界注入。
  for (const name of ['setNote', 'setDisputed', 'setStatus', 'save']) {
    const original = h.store[name];
    h.store[name] = function (...args) {
      h.mutations.push({ name, args: clone(args) });
      return original.apply(this, args);
    };
  }
  const subscribe = h.store.onChange;
  h.store.onChange = function (fn) {
    h.listeners.add(fn);
    const stop = subscribe(fn);
    return () => { h.listeners.delete(fn); stop(); };
  };
  h.store.load();
  assert.ok(h.storage.has(KEY), '真实 store 应完成本次隔离安装的初始化');
  h.snapshot = () => ({ storage: clone([...h.storage]), pending: clone(h.store.pending()),
    mutations: clone(h.mutations), attempts: h.storageAttempts, writes: h.storageWrites });
  h.readOnly = before => assert.deepEqual(h.snapshot(), before, '只读行为不得写 storage、调用 setter/save 或产生同步操作');
  h.remote = function (fields) {
    const before = { pending: clone(h.store.pending()), mutations: clone(h.mutations), writes: h.storageWrites };
    const seq = ++h.remoteSeq;
    const op = h.realm({ protocol: 2, device: 'f'.repeat(32), seq,
      clock: h.storage.get(KEY)._sync.clock + 1, kind: 'edit', fields });
    const regs = h.protocol.fromOperation(op);
    assert.equal(h.store.mergeRemote(regs), true, '真实 mergeRemote 必须成功');
    h.flush();
    assert.equal(h.storageWrites, before.writes + 1, '仅远端合并落盘一次，页面不得反向编辑');
    assert.deepEqual(clone(h.store.pending()), before.pending, '远端刷新不能增加 outbox');
    assert.deepEqual(h.mutations, before.mutations, '远端刷新不能调用业务 setter/save');
  };
  h.newPage = function (name, options = {}) {
    const definition = h.load('pages/' + name + '/' + name + '.js');
    const page = Object.assign({}, definition, { data: clone(definition.data), options,
      route: 'pages/' + name + '/' + name, patches: [], loadCount: 0 });
    page.setData = function (patch, callback) {
      this.patches.push(clone(patch));
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
        assert.ok(parts.every(part => !['__proto__', 'prototype', 'constructor'].includes(part)));
        let target = this.data;
        for (const part of parts.slice(0, -1)) {
          if (!Object.hasOwn(target, part)) target[part] = {};
          target = target[part];
        }
        target[parts.at(-1)] = clone(value);
      }
      h.frames.push({ page: this, data: clone(this.data), callback });
    };
    return page;
  };
  h.flush = function () {
    let count = 0;
    while (h.frames.length) {
      assert.ok(++count < 2000, '渲染队列必须收敛');
      const frame = h.frames.shift(); frame.page.rendered = frame.data;
      if (frame.callback) frame.callback.call(frame.page);
    }
  };
  h.start = function (name = 'gaps', options = {}) {
    assert.equal(h.stack.length, 0);
    const page = h.newPage(name, options); h.stack.push(page);
    if (TABS.has(name)) h.tabs[name] = page;
    page.loadCount++; page.onLoad(options); page.onShow(); h.flush(); return page;
  };
  // 页面栈/跨 tab 重建沿用 check-reading-context 的方式；不伪造目标页或返回结果。
  h.perform = function () {
    const request = h.requests.shift(); assert.ok(request, '必须先产生真实导航请求');
    h.routes.push(request);
    let target;
    if (request.kind === 'navigateBack') {
      const delta = request.args.delta || 1;
      assert.ok(h.stack.length > delta);
      h.stack.slice(-delta).reverse().forEach(page => page.onUnload());
      h.stack.splice(-delta); target = h.top();
    } else {
      const [route, query] = request.args.url.split('?');
      const name = route.split('/')[2];
      const options = Object.fromEntries(new URLSearchParams(query || ''));
      if (h.top()) h.top().onHide();
      if (request.kind === 'switchTab') {
        assert.ok(TABS.has(name));
        h.stack.filter(page => !TABS.has(page._reading.name)).reverse().forEach(page => page.onUnload());
        target = h.tabs[name];
        if (!target) { target = h.newPage(name, options); h.tabs[name] = target; }
        h.stack = [target];
      } else {
        assert.ok(h.stack.length < 10);
        target = h.newPage(name, options); h.stack.push(target);
      }
      if (!target.loadCount) { target.loadCount++; target.onLoad(options); }
    }
    target.onShow();
    if (request.args.success) request.args.success({});
    return target;
  };
  h.drain = function () {
    let count = 0;
    while (h.requests.length) { assert.ok(++count < 50); h.perform(); h.flush(); }
    h.flush();
  };
  h.nativeBack = function () {
    h.requests.push({ kind: 'navigateBack', args: { delta: 1 } }); h.perform(); h.flush();
  };
  return h;
}

const nodes = h => clone(h.load('data/nodes.js').ALL_NODES);
const ordered = h => clone(h.load('data/nodes.js').DOMAINS).flatMap(d => d.modules.flatMap(m => m.topics));
const rows = page => page.data.groups.flatMap(group => group.items);
const ids = page => rows(page).map(row => row.id);
function view(h, page, value) { page.setView(event('view', value)); h.flush(); }
function filter(h, page, value) { page.setFilter(event('filter', value)); h.flush(); }
function query(h, page, value) { page.onNoteQuery(input(value)); h.flush(); }
function assertGroups(h, page, expected) {
  assert.deepEqual(ids(page), expected, '保留原始领域/模块/节点顺序');
  const domains = clone(h.load('data/nodes.js').DOMAINS);
  const wanted = new Set(expected);
  const groups = domains.map(d => ({ id: d.id, name: d.name,
    ids: d.modules.flatMap(m => m.topics).filter(n => wanted.has(n.id)).map(n => n.id) })).filter(g => g.ids.length);
  assert.deepEqual(page.data.groups.map(g => ({ id: g.id, name: g.name, ids: g.items.map(n => n.id) })), groups);
  page.data.groups.forEach(group => assert.equal(group.count, group.items.length));
  assert.equal(page.data.resultCount, expected.length);
}
function fixture(h) {
  const domains = clone(h.load('data/nodes.js').DOMAINS);
  const selected = domains.flatMap(d => d.modules.flatMap(m => m.topics).slice(0, 2));
  assert.ok(selected.length >= 6, '需要跨领域和同领域节点以验证原顺序');
  const state = { notes: {}, disputed: {}, status: {} };
  selected.slice().reverse().forEach((node, index) => {
    state.notes[node.id] = index === 0 ? ' \t\r\n\u3000 ' : index === 1 ? '' : '笔记 Needle ' + index;
    state.status[node.id] = index % 3;
    state.disputed[node.id] = index % 2 ? 0 : 1;
  });
  h.remote(state);
  return { state, selected, all: ordered(h) };
}
function assertEdit(h, before, name, id, value) {
  assert.deepEqual(h.mutations.slice(before.mutations.length), [{ name, args: [id, value] }]);
  const pending = clone(h.store.pending());
  assert.equal(pending.length, before.pending.length + 1, '一次显式修改仅产生一个真实操作');
  const field = { setNote: 'notes', setDisputed: 'disputed' }[name];
  const fields = { status: {}, notes: {}, disputed: {} }; fields[field][id] = value;
  assert.deepEqual(pending.at(-1).fields, fields);
  assert.equal(h.storageWrites, before.writes + 1);
}

// 轻量解析只用于 WXML 契约/来源条件检查，不模拟微信布局或声称原生可用性。
function markup(source) {
  const clean = source.replace(/<!--[\s\S]*?-->/g, value => value.replace(/[^\n]/g, ' '));
  const root = { tag: '$root', attrs: {}, children: [] }, stack = [root], elements = [];
  const tags = /<\/?[A-Za-z][\w:-]*(?:[^<>"']|"[^"]*"|'[^']*')*>/g;
  let cursor = 0, match;
  while ((match = tags.exec(clean))) {
    stack.at(-1).children.push(clean.slice(cursor, match.index)); cursor = tags.lastIndex;
    const token = match[0], closing = /^<\//.test(token);
    const name = token.match(/^<\/?([\w:-]+)/)[1];
    if (closing) {
      assert.equal(stack.at(-1).tag, name, 'WXML 标签必须配对'); stack.pop(); continue;
    }
    const attrs = {};
    for (const attr of token.matchAll(/\s+([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
      attrs[attr[1]] = attr[2] === undefined ? (attr[3] === undefined ? true : attr[3]) : attr[2];
    }
    const node = { tag: name, attrs, children: [], parent: stack.at(-1),
      line: clean.slice(0, match.index).split('\n').length };
    stack.at(-1).children.push(node); elements.push(node);
    if (!/\/\s*>$/.test(token)) stack.push(node);
  }
  stack.at(-1).children.push(clean.slice(cursor));
  assert.equal(stack.length, 1, 'WXML 不应剩余未闭合标签');
  return { root, elements, clean };
}
const wxml = name => markup(read('pages/' + name + '/' + name + '.wxml'));
const evaluate = (expression, scope) => vm.runInNewContext('(' + expression + ')', scope, { timeout: 1000 });
const bound = (value, scope) => typeof value === 'string' && /^\{\{[\s\S]*\}\}$/.test(value) ?
  evaluate(value.slice(2, -2), scope) : value;
const interpolate = (text, scope) => text.replace(/\{\{([\s\S]*?)\}\}/g, (_, expression) => String(evaluate(expression, scope)));
const hasClass = (node, name) => typeof node.attrs.class === 'string' && node.attrs.class.split(/\s+/).includes(name);
function one(tree, predicate) {
  const found = tree.elements.filter(predicate); assert.equal(found.length, 1, '控件应唯一存在'); return found[0];
}
function accessible(node, scope) {
  for (let current = node; current; current = current.parent) {
    if (Object.hasOwn(current.attrs, 'wx:if') && !bound(current.attrs['wx:if'], scope)) return false;
    if (current.attrs.hidden && bound(current.attrs.hidden, scope)) return false;
  }
  return true;
}
function tapMarkup(h, page, control, extra = {}) {
  const scope = Object.assign({}, page.data, extra);
  assert.ok(accessible(control, scope), '来源控件不能在自身关闭条件中不可达');
  const handler = control.attrs.bindtap || control.attrs.catchtap;
  assert.equal(typeof page[handler], 'function');
  const dataset = {};
  for (const [key, value] of Object.entries(control.attrs)) {
    if (key.startsWith('data-')) dataset[key.slice(5)] = bound(value, scope);
  }
  page[handler]({ currentTarget: { dataset } }); h.flush();
}
function visibleText(node, scope, insideLoop = false) {
  if (typeof node === 'string') return interpolate(node, scope);
  if (node.attrs['wx:for'] && !insideLoop) {
    const values = bound(node.attrs['wx:for'], scope) || [];
    return Array.from(values).map((value, index) => visibleText(node, Object.assign({}, scope, {
      [node.attrs['wx:for-item'] || 'item']: value, [node.attrs['wx:for-index'] || 'index']: index
    }), true)).join(' ');
  }
  if (!accessible(node, scope)) return '';
  return node.children.map(child => visibleText(child, scope)).join(' ');
}
function assertHandlers(tree, definition, label) {
  let count = 0;
  for (const node of tree.elements) {
    for (const [binding, handler] of Object.entries(node.attrs)) {
      if (!/^(?:bind:?tap|bind:?input|catch:?tap|bind:?confirm)$/.test(binding)) continue;
      count++;
      // template 的 item/open 等局部数据不是 Page 方法；静态事件仍必须在 Page 真正定义。
      assert.match(handler, /^[A-Za-z_$][\w$]*$/, label + ':' + node.line + ' 应绑定可审计的真实方法');
      const property = Object.getOwnPropertyDescriptor(definition, handler);
      assert.ok(property && typeof property.value === 'function', label + ':' + node.line + ' 缺少真实 handler ' + handler);
    }
  }
  assert.ok(count > 0, label + ' 不能空检查');
  return count;
}

// 测试工具自身的关键防伪条件。
test('隔离 VM 确实加载真实 store/协议，remote 无 outbox，不同用例互不污染', () => {
  const a = harness(), id = nodes(a)[0].id;
  a.remote({ notes: { [id]: '隔离记录' } });
  assert.equal(a.store.getNote(id), '隔离记录');
  assert.deepEqual(clone(a.store.pending()), []);
  assert.equal(a.load('utils/store.js'), a.store);
  assert.ok(a.modules.has('utils/sync-state.js'));
  const b = harness(); assert.equal(b.store.getNote(id), '');
  assert.notEqual(a.store, b.store); assert.notEqual(a.reading, b.reading);
});

test('gaps progress/all/todo/learning 按原节点顺序，统计与真实 store 一致', () => {
  const h = harness(), f = fixture(h), before = h.snapshot(), page = h.start();
  assert.equal(page.data.view, 'progress'); assert.equal(page.data.filter, 'all');
  assertGroups(h, page, f.all.map(n => n.id));
  query(h, page, '进度不受笔记查询影响');
  for (const [value, status] of [['todo', 0], ['learning', 1]]) {
    filter(h, page, value);
    assertGroups(h, page, f.all.filter(n => (f.state.status[n.id] || 0) === status).map(n => n.id));
  }
  assert.deepEqual(page.data.stat, clone(h.store.stats(h.load('data/nodes.js').ALL_NODES)));
  filter(h, page, 'all'); assertGroups(h, page, f.all.map(n => n.id)); h.readOnly(before);
});

test('gaps notes 空白/空串不计、计数独立于查询、跨领域原顺序且不按写入或状态排序', () => {
  const h = harness(), f = fixture(h), before = h.snapshot(), page = h.start();
  view(h, page, 'notes');
  const expected = f.all.filter(n => (f.state.notes[n.id] || '').trim()).map(n => n.id);
  assertGroups(h, page, expected); assert.equal(page.data.noteCount, expected.length);
  query(h, page, '绝不匹配的正文'); assertGroups(h, page, []); assert.equal(page.data.noteCount, expected.length);
  page.clearNoteQuery(); h.flush(); assert.equal(page.data.noteQuery, ''); assertGroups(h, page, expected);
  h.readOnly(before);
});

test('gaps disputed 与有无笔记无关、按原顺序、保留空白笔记节点', () => {
  const h = harness(), f = fixture(h), before = h.snapshot(), page = h.start();
  view(h, page, 'disputed');
  const expected = f.all.filter(n => f.state.disputed[n.id] === 1).map(n => n.id);
  assertGroups(h, page, expected); assert.equal(page.data.disputedCount, expected.length);
  assert.ok(rows(page).some(row => !(f.state.notes[row.id] || '').trim()));
  assert.ok(rows(page).every(row => row.disputed === true));
  query(h, page, '不会命中的笔记词'); assertGroups(h, page, expected); h.readOnly(before);
});

for (const target of ['notes', 'disputed']) {
  test('gaps ' + target + ' 不受旧 progress filter 影响', () => {
    const h = harness(), f = fixture(h), before = h.snapshot(), page = h.start();
    const expected = f.all.filter(n => target === 'notes' ? (f.state.notes[n.id] || '').trim() : f.state.disputed[n.id]).map(n => n.id);
    for (const value of ['todo', 'learning', 'all']) {
      view(h, page, 'progress'); filter(h, page, value); view(h, page, target);
      assertGroups(h, page, expected); assert.equal(page.data.filter, value);
    }
    h.readOnly(before);
  });
}

test('notes 查询仅正文连续子串，大小写/首尾空格处理，不扩展标题/描述/卡片全文', () => {
  const h = harness(), all = nodes(h), cards = h.load('data/cards.js').CARDS;
  const a = all.find(n => n.n && n.d && cards[n.id] && cards[n.id].concept && cards[n.id].concept.body);
  assert.ok(a); const b = all.find(n => n.id !== a.id), c = all.find(n => n.id !== a.id && n.id !== b.id);
  h.remote({ notes: { [a.id]: '无关记录 AlphaBeta 尾部', [b.id]: '正文提及：' + a.n,
    [c.id]: '开头' + '长'.repeat(150) + 'HiddenNeedle 结尾 alpha---beta' } });
  const before = h.snapshot(), page = h.start(); view(h, page, 'notes');
  query(h, page, '  PHAbE  '); assert.deepEqual(ids(page), [a.id]);
  assert.equal(page.data.noteQuery, '  PHAbE  ');
  query(h, page, a.n); assert.deepEqual(ids(page), [b.id], '标题相同的节点不能因标题命中，只有正文提及者命中');
  for (const text of [a.d, cards[a.id].concept.body]) {
    assert.ok(!Object.values(h.store.load().notes).some(note => note.toLowerCase().includes(text.toLowerCase())), '反例正文不能意外含目标词');
    query(h, page, text); assert.deepEqual(ids(page), []);
  }
  query(h, page, 'hiddenneedle'); assert.deepEqual(ids(page), [c.id]);
  assert.ok(!rows(page)[0].summary.toLowerCase().includes('hiddenneedle'), '查询不能退化为只搜摘要');
  query(h, page, 'alpha beta'); assert.deepEqual(ids(page), [], '不做分词扩展或模糊检索');
  query(h, page, ' \t\u3000 '); assert.equal(page.data.resultCount, 3); h.readOnly(before);
});

test('摘要 99/100/101 字符边界、Unicode 码点及空白归一化，正文绝不截断或回写', () => {
  const h = harness(), selected = nodes(h).slice(0, 6), astral = '\u{20BB7}';
  const cases = [
    ['甲'.repeat(99), '甲'.repeat(99)],
    ['乙'.repeat(100), '乙'.repeat(100)],
    ['丙'.repeat(101), '丙'.repeat(99) + '…'],
    ['丁'.repeat(99) + astral, '丁'.repeat(99) + astral],
    [astral.repeat(100) + '末', astral.repeat(99) + '…'],
    [' \t第一行\n\r第二行\u3000' + astral + '  ', '第一行 第二行 ' + astral]
  ];
  const notes = Object.fromEntries(cases.map(([text], index) => [selected[index].id, text]));
  h.remote({ notes }); const before = h.snapshot(), page = h.start(); view(h, page, 'notes');
  cases.forEach(([original, expected], index) => {
    const summary = rows(page).find(row => row.id === selected[index].id).summary;
    assert.equal(summary, expected); assert.ok(Array.from(summary).length <= 100);
    assert.ok(!/[\uD800-\uDFFF]/u.test(summary), '不能截断产生孤立代理项');
    assert.equal(h.store.getNote(selected[index].id), original);
  });
  h.readOnly(before);
});

for (const cleared of ['', ' \t\n\u3000 ']) {
  test('详情显式保存' + (cleared ? '空白' : '空串') + '后 gaps onShow 移除笔记且不额外写入', () => {
    const h = harness(), id = nodes(h)[0].id; h.remote({ notes: { [id]: '旧笔记' } });
    const page = h.start(); view(h, page, 'notes'); query(h, page, '旧'); page.goNode(byId(id)); h.drain();
    const node = h.top(), before = h.snapshot(); node.toggleNote(); node.onNoteInput(input(cleared)); node.saveNote(); h.flush();
    assert.equal(node.data.editingNote, false); assertEdit(h, before, 'setNote', id, cleared);
    const saved = h.snapshot(); h.nativeBack(); assert.equal(h.top(), page);
    assert.equal(page.data.view, 'notes'); assert.equal(page.data.noteQuery, '旧');
    assertGroups(h, page, []); assert.equal(page.data.noteCount, 0); h.readOnly(saved);
  });
}

test('详情取消存疑后 gaps onShow 移除，保留独立笔记', () => {
  const h = harness(), id = nodes(h)[0].id;
  h.remote({ notes: { [id]: '保留笔记' }, disputed: { [id]: 1 } });
  const page = h.start(); view(h, page, 'disputed'); page.goNode(byId(id)); h.drain();
  const before = h.snapshot(); h.top().toggleDisputed(); h.flush(); assertEdit(h, before, 'setDisputed', id, 0);
  const saved = h.snapshot(); h.nativeBack(); assertGroups(h, page, []);
  assert.equal(page.data.disputedCount, 0); assert.equal(page.data.noteCount, 1);
  assert.equal(h.store.getNote(id), '保留笔记'); h.readOnly(saved);
});

for (const target of ['notes', 'disputed']) {
  test('gaps remote 实时更新 ' + target + '，保留原 query/view/filter 且不反向产生操作', () => {
    const h = harness(), [a, b] = ordered(h);
    h.remote({ notes: { [a.id]: 'Needle 旧' }, disputed: { [a.id]: 1 } });
    const page = h.start(); filter(h, page, 'todo'); view(h, page, target); query(h, page, ' NeEdLe ');
    h.remote({ notes: { [a.id]: '', [b.id]: '新增 needle 正文' }, disputed: { [a.id]: 0, [b.id]: 1 }, status: { [b.id]: 2 } });
    assert.equal(page.data.view, target); assert.equal(page.data.noteQuery, ' NeEdLe '); assert.equal(page.data.filter, 'todo');
    assertGroups(h, page, [b.id]); assert.equal(rows(page)[0].status, 2);
    assert.equal(page.data.noteCount, 1); assert.equal(page.data.disputedCount, 1);
  });
}

for (const name of PAGES) {
  test(name + ' 隐藏取消订阅后，真实 remote 与已出队迟到回调均不写页面', () => {
    const h = harness(), id = nodes(h)[0].id, page = h.start(name, name === 'node' ? { id } : {});
    if (name === 'gaps') { view(h, page, 'notes'); query(h, page, '迟到'); }
    const late = [...h.listeners]; assert.equal(late.length, 1);
    page.onHide(); h.flush(); assert.equal(h.listeners.size, 0);
    const data = clone(page.data), patches = page.patches.length, scrolls = h.scrolls.length;
    h.remote({ notes: { [id]: '迟到 remote' }, disputed: { [id]: 1 } });
    const merged = h.snapshot(); late.forEach(fn => fn(h.store.load(), 'remote')); h.flush();
    assert.equal(page.patches.length, patches); assert.deepEqual(page.data, data);
    assert.equal(h.scrolls.length, scrolls); h.readOnly(merged);
    page.onShow(); h.flush(); assert.equal(h.listeners.size, 1);
    if (name === 'gaps') {
      assert.equal(page.data.view, 'notes'); assert.equal(page.data.noteQuery, '迟到'); assert.deepEqual(ids(page), [id]);
    }
    if (name === 'node') { assert.equal(page.data.note, '迟到 remote'); assert.equal(page.data.disputed, 1); }
    h.readOnly(merged);
  });
}

test('notes 详情真实带 note anchor，渲染后才定位；进度/存疑详情不附加锚点', () => {
  const h = harness(), id = nodes(h)[0].id;
  h.remote({ notes: { [id]: '笔记入口' }, disputed: { [id]: 1 } });
  const before = h.snapshot(), page = h.start();
  for (const target of ['progress', 'disputed', 'notes']) {
    view(h, page, target); const count = h.scrolls.length; page.goNode(byId(id));
    const url = h.requests[0].args.url, params = new URLSearchParams(url.split('?')[1]);
    assert.equal(params.get('id'), id); assert.equal(params.get('anchor'), target === 'notes' ? 'note' : null);
    const node = h.perform(); assert.equal(h.scrolls.length, count, '渲染前不可提前跳锚点');
    h.flush();
    if (target === 'notes') {
      assert.equal(h.scrolls.at(-1).page, node); assert.equal(h.scrolls.at(-1).value.selector, '#note-section');
      const anchor = one(wxml('node'), el => el.attrs.id === 'note-section');
      assert.ok(accessible(anchor, node.data));
    } else assert.equal(h.scrolls.length, count);
    h.nativeBack();
  }
  h.readOnly(before);
});

test('note anchor 隐藏后迟到渲染回调不再滚动', () => {
  const h = harness(), id = nodes(h)[0].id; h.remote({ notes: { [id]: '笔记' } });
  const before = h.snapshot(), page = h.start(); view(h, page, 'notes'); page.goNode(byId(id));
  const node = h.perform(); h.nativeBack(); assert.equal(node._reading.active, false);
  assert.equal(h.scrolls.length, 0); h.readOnly(before);
});

test('gaps→node→题型→返回重建链，再原生返回恢复 notes 查询且读取最新 store', () => {
  const h = harness(), topicIndex = h.load('data/topic_index.js');
  const id = nodes(h).find(n => (topicIndex.TOPICS_BY_NODE[n.id] || []).length).id;
  const tid = topicIndex.TOPICS_BY_NODE[id][0];
  h.remote({ notes: { [id]: 'ReturnNeedle 旧记录' } });
  const before = h.snapshot(), gaps = h.start();
  filter(h, gaps, 'learning'); view(h, gaps, 'notes'); query(h, gaps, ' rEtUrNnEeDlE ');
  gaps.onPageScroll({ scrollTop: 240 }); gaps.goNode(byId(id)); h.drain(); const node = h.top();
  assert.ok(node.data.topicList.some(t => t.id === tid));
  node.switchTab(event('tab', 'example')); node.toggleSource(); node.onPageScroll({ scrollTop: 680 });
  node.goTopic(byId(tid)); h.drain(); const locator = h.top();
  assert.equal(locator._reading.name, 'locator'); assert.equal(locator.data.expandedIds[tid], true);
  assert.equal(locator.data.readingCanBack, true); h.readOnly(before);
  h.remote({ notes: { [id]: 'ReturnNeedle 最新正文' }, status: { [id]: 2 }, disputed: { [id]: 1 } });
  const merged = h.snapshot(); locator.goReadingBack(); h.drain();
  assert.deepEqual(h.stack.map(page => page._reading.name), ['gaps', 'node']);
  const restored = h.top(); assert.notEqual(restored, node);
  assert.equal(restored.data.tab, 'example'); assert.equal(restored.data.sourceExpanded, true);
  assert.equal(restored.data.note, 'ReturnNeedle 最新正文'); assert.equal(restored.data.status, 2); assert.equal(restored.data.disputed, 1);
  assert.equal(restored.nativeScroll, 680);
  h.nativeBack(); const back = h.top(); assert.equal(back, gaps);
  assert.equal(back.data.view, 'notes'); assert.equal(back.data.noteQuery, ' rEtUrNnEeDlE '); assert.equal(back.data.filter, 'learning');
  assert.deepEqual(ids(back), [id]); assert.equal(rows(back)[0].summary, 'ReturnNeedle 最新正文');
  assert.equal(back.nativeScroll, 240); assert.deepEqual(h.app.globalData, {}); h.readOnly(merged);
});

test('node 存疑成功/取消仅修改个人 disputed，真实 outbox 每次一个操作', () => {
  const h = harness(), id = nodes(h)[0].id;
  h.remote({ notes: { [id]: '独立正文' }, status: { [id]: 2 } });
  const page = h.start('node', { id }), summary = clone(page.data.sourceSummary);
  for (const value of [1, 0]) {
    const before = h.snapshot(); page.toggleDisputed(); h.flush();
    assertEdit(h, before, 'setDisputed', id, value);
    assert.equal(page.data.disputed, value); assert.equal(h.store.getDisputed(id), value);
    assert.equal(h.store.getStatus(id), 2); assert.equal(h.store.getNote(id), '独立正文');
    assert.deepEqual(page.data.sourceSummary, summary);
    assert.equal(h.toasts.at(-1).title, value ? '已标记存疑' : '已取消存疑');
  }
});

for (const initial of [0, 1]) {
  test('node disputed=' + initial + ' 真实 storage 失败不改 UI/业务/outbox，允许重试', () => {
    const h = harness(), id = nodes(h)[0].id; h.remote({ disputed: { [id]: initial } });
    const page = h.start('node', { id }), before = h.snapshot(); h.failStorage = true;
    page.toggleDisputed(); h.flush();
    assert.equal(page.data.disputed, initial); assert.equal(h.store.getDisputed(id), initial);
    assert.deepEqual(clone([...h.storage]), before.storage); assert.deepEqual(clone(h.store.pending()), before.pending);
    assert.equal(h.storageWrites, before.writes); assert.equal(h.storageAttempts, before.attempts + 1);
    assert.deepEqual(h.mutations.slice(before.mutations.length), [{ name: 'setDisputed', args: [id, initial ? 0 : 1] }]);
    assert.equal(h.toasts.at(-1).title, '本地保存失败，请重试');
    assert.equal(h.toasts.length, 1, '失败不能再弹成功提示');
    h.failStorage = false; const retry = h.snapshot(); page.toggleDisputed(); h.flush();
    assertEdit(h, retry, 'setDisputed', id, initial ? 0 : 1); assert.equal(page.data.disputed, initial ? 0 : 1);
  });
  test('node 不按陈旧 data.disputed=' + initial + ' 取反，必须读取最新 store', () => {
    const h = harness(), id = nodes(h)[0].id; h.remote({ disputed: { [id]: initial } });
    const page = h.start('node', { id });
    assert.equal(h.store.setDisputed(id, initial ? 0 : 1), true);
    assert.equal(page.data.disputed, initial, '本地其他入口的更新未刷新当前页面，制造真实陈旧 UI');
    const before = h.snapshot(); page.toggleDisputed(); h.flush();
    assertEdit(h, before, 'setDisputed', id, initial);
    assert.equal(h.store.getDisputed(id), initial); assert.equal(page.data.disputed, initial);
  });
}

for (const initial of [0, 1]) {
  test('lesson 不按陈旧 points.disputed=' + initial + ' 取反，必须读取最新 store', () => {
    const h = harness(), group = h.load('data/lectures.js').LECTURES[0], id = group.points[1].nodeId;
    h.remote({ disputed: { [id]: initial }, notes: { [id]: '独立正文' }, status: { [id]: 2 } });
    const page = h.start('lesson', { id: group.id }), data = clone(page.data);
    const latest = initial ? 0 : 1;
    assert.equal(h.store.setDisputed(id, latest), true);
    assert.equal(h.store.getDisputed(id), latest);
    assert.equal(page.data.points[1].disputed, initial, '其他入口已更新真实 store，当前 points 仍是旧值');
    const before = h.snapshot(), patches = page.patches.length;
    page.toggleDisputed(byId(id)); h.flush();
    assertEdit(h, before, 'setDisputed', id, initial);
    assert.equal(h.storageAttempts, before.attempts + 1);
    assert.equal(h.store.getDisputed(id), initial);
    assert.deepEqual(page.patches.slice(patches), [{ 'points[1].disputed': initial }]);
    assert.deepEqual(page.data, data, '不得改变其他知识点、状态、来源或真源审核');
    assert.equal(h.store.getStatus(id), 2); assert.equal(h.store.getNote(id), '独立正文');
    assert.deepEqual(h.toasts, [{ title: initial ? '已标记存疑' : '已取消存疑', icon: 'none' }]);
  });

  test('lesson 陈旧 points.disputed=' + initial + ' 遇真实 storage 失败保持原状，重试仍读取最新 store', () => {
    const h = harness(), group = h.load('data/lectures.js').LECTURES[0], id = group.points[1].nodeId;
    h.remote({ disputed: { [id]: initial } });
    const page = h.start('lesson', { id: group.id }), data = clone(page.data);
    const latest = initial ? 0 : 1;
    assert.equal(h.store.setDisputed(id, latest), true);
    assert.equal(page.data.points[1].disputed, initial);
    const before = h.snapshot(), patches = page.patches.length;
    h.failStorage = true; page.toggleDisputed(byId(id)); h.flush();
    assert.deepEqual(page.data, data); assert.equal(page.patches.length, patches);
    assert.equal(h.store.getDisputed(id), latest);
    assert.deepEqual(clone([...h.storage]), before.storage); assert.deepEqual(clone(h.store.pending()), before.pending);
    assert.equal(h.storageWrites, before.writes); assert.equal(h.storageAttempts, before.attempts + 1);
    assert.deepEqual(h.mutations.slice(before.mutations.length), [{ name: 'setDisputed', args: [id, initial] }]);
    assert.deepEqual(h.toasts, [{ title: '本地保存失败，请重试', icon: 'none' }]);
    h.failStorage = false;
    assert.equal(h.store.setDisputed(id, initial), true, '重试前 store 再次变化，不能缓存失败时的目标值');
    const retry = h.snapshot(); page.toggleDisputed(byId(id)); h.flush();
    assertEdit(h, retry, 'setDisputed', id, latest);
    assert.equal(h.storageAttempts, retry.attempts + 1);
    assert.equal(h.store.getDisputed(id), latest);
    data.points[1].disputed = latest; assert.deepEqual(page.data, data);
    assert.deepEqual(page.patches.slice(patches), [{ 'points[1].disputed': latest }]);
    assert.equal(h.toasts.length, 2);
    assert.equal(h.toasts.at(-1).title, latest ? '已标记存疑' : '已取消存疑');
  });
}

for (const invalid of ['缺失事件', '无效节点']) {
  test('lesson 存疑' + invalid + ' 不抛错、不读取存疑、不改 UI/storage/outbox、不报成功', () => {
    const h = harness(), page = h.start('lesson'), data = clone(page.data), patches = page.patches.length;
    const outside = nodes(h).find(node => !page.data.points.some(point => point.nodeId === node.id));
    assert.ok(outside, '必须覆盖真实但不属于当前专题的节点');
    const events = invalid === '缺失事件' ? [undefined, null, {}, { currentTarget: null },
      { currentTarget: {} }, { currentTarget: { dataset: null } }, { currentTarget: { dataset: {} } }] :
      [outside.id, 'not_a_real_node', '', undefined, null, 0, true, {}, [], '__proto__', 'constructor'].map(byId);
    const getDisputed = h.store.getDisputed; let reads = 0;
    h.store.getDisputed = function (id) { reads++; return getDisputed(id); };
    const before = h.snapshot();
    for (const value of events) {
      assert.doesNotThrow(() => page.toggleDisputed(value)); h.flush();
      assert.equal(reads, 0, '先校验当前 points，再读取业务状态');
      assert.deepEqual(page.data, data); assert.equal(page.patches.length, patches);
      assert.deepEqual(h.toasts, []); h.readOnly(before);
    }
  });
}

test('lesson reviewLabel 始终来自内容元数据，不被本地/远端个人 disputed 覆盖', () => {
  const h = harness(), page = h.start('lesson'), meta = h.load('data/content_meta.js');
  assert.ok(page.data.points.length > 1);
  const expected = page.data.points.map(p => {
    const source = meta.metaFor(p.nodeId, p.domain);
    assert.equal(p.review, source.review); assert.equal(p.reviewLabel, meta.REVIEW_LABEL[source.review] || '');
    return { id: p.nodeId, review: p.review, label: p.reviewLabel };
  });
  const id = page.data.points[0].nodeId;
  for (const value of [1, 0]) {
    const before = h.snapshot(); page.toggleDisputed(byId(id)); h.flush(); assertEdit(h, before, 'setDisputed', id, value);
    assert.equal(page.data.points[0].disputed, value);
    assert.deepEqual(page.data.points.map(p => ({ id: p.nodeId, review: p.review, label: p.reviewLabel })), expected);
  }
  h.remote({ disputed: { [id]: 1 } }); assert.equal(page.data.points[0].disputed, 1);
  assert.deepEqual(page.data.points.map(p => ({ id: p.nodeId, review: p.review, label: p.reviewLabel })), expected);
});

test('lesson 来源默认折叠且经真实 WXML 控件可达，各知识点独立，展开/收起仅只读', () => {
  const h = harness(), before = h.snapshot(), page = h.start('lesson'), tree = wxml('lesson');
  const [a, b] = page.data.points;
  const pointToggle = one(tree, el => el.attrs.bindtap === 'togglePoint');
  const sourceToggle = one(tree, el => el.attrs.bindtap === 'togglePointSource');
  const sourceBody = one(tree, el => hasClass(el, 'evidence-bar'));
  assert.equal(accessible(sourceBody, Object.assign({}, page.data, { p: a })), false);
  tapMarkup(h, page, pointToggle, { p: a });
  assert.ok(accessible(sourceToggle, Object.assign({}, page.data, { p: a })));
  tapMarkup(h, page, sourceToggle, { p: a });
  assert.equal(page.data.sourceOpenIds[a.nodeId], true); assert.ok(!page.data.sourceOpenIds[b.nodeId]);
  const text = visibleText(sourceBody, Object.assign({}, page.data, { p: a }));
  for (const value of [a.evidenceLabel, a.reviewLabel, a.sourceName, a.wordingNote]) {
    assert.ok(value, '来源元数据应提供必要说明'); assert.ok(text.includes(value), '来源与审核展开后必须可读');
  }
  assert.ok(text.includes('卡片来源与缺口'));
  tapMarkup(h, page, pointToggle, { p: b }); tapMarkup(h, page, sourceToggle, { p: b });
  tapMarkup(h, page, sourceToggle, { p: a });
  assert.equal(page.data.sourceOpenIds[a.nodeId], false); assert.equal(page.data.sourceOpenIds[b.nodeId], true);
  assert.equal(accessible(sourceBody, Object.assign({}, page.data, { p: a })), false);
  const data = clone(page.data); page.togglePointSource(byId('not_a_real_node')); h.flush(); assert.deepEqual(page.data, data);
  h.readOnly(before);
});

test('node 来源/审核/缺口/补充来源展开可达，页签切换和折叠只读', () => {
  const h = harness(), cards = h.load('data/cards.js').CARDS, meta = h.load('data/content_meta.js');
  const id = nodes(h).find(n => cards[n.id] && Array.isArray(meta.metaFor(n.id, n.domain).gaps) && meta.metaFor(n.id, n.domain).gaps.length).id;
  const before = h.snapshot(), page = h.start('node', { id }), tree = wxml('node');
  const toggle = one(tree, el => el.attrs.bindtap === 'toggleSource');
  const body = one(tree, el => hasClass(el, 'source-body'));
  assert.equal(page.data.sourceExpanded, false); assert.equal(accessible(body, page.data), false);
  tapMarkup(h, page, toggle); assert.equal(page.data.sourceExpanded, true);
  let gaps = 0;
  for (const tab of ['concept', 'explain', 'example']) {
    page.switchTab(event('tab', tab)); h.flush(); const summary = page.data.sourceSummary;
    assert.ok(accessible(body, page.data)); const text = visibleText(body, page.data);
    for (const value of [summary.source, summary.boundary, ...summary.gaps, ...summary.cards.map(card => card.reviewLabel)]) {
      assert.ok(value); assert.ok(text.includes(value), '来源正文/审核/缺口不得只保留字段而不可达');
    }
    gaps += summary.gaps.length;
  }
  assert.ok(gaps > 0, '必须实际覆盖有缺口记录');
  tapMarkup(h, page, toggle); assert.equal(accessible(body, page.data), false); h.readOnly(before);
  const summaryModule = h.load('utils/content-summary.js');
  const supplemental = nodes(h).flatMap(n => ['explain', 'example'].map(tab => ({ n, tab,
    summary: summaryModule.build(n.id, n.domain, cards[n.id], tab) }))).find(row => row.summary.supplementalCount > 0);
  assert.ok(supplemental, '必须有真实补充来源样本');
  page.goNode(byId(supplemental.n.id)); h.drain(); const next = h.top();
  next.switchTab(event('tab', supplemental.tab)); tapMarkup(h, next, toggle);
  assert.ok(visibleText(body, next.data).includes('组织补充 · 独立待核')); h.readOnly(before);
});

test('gaps每次重建只取一次当前业务快照，不按节点反复读三个字段', () => {
  const h = harness(), page = h.start(), before = h.snapshot();
  const load = h.store.load; let loads = 0;
  h.store.load = function () { loads++; return load(); };
  for (const method of ['getStatus', 'getNote', 'getDisputed']) {
    h.store[method] = function () { throw new Error('聚合不得逐字段重复读取storage'); };
  }
  page.build(); h.flush(); assert.equal(loads, 1); h.readOnly(before);
  const id = nodes(h)[0].id;
  h.remote({ notes: { [id]: '当前快照正文' } });
  page.setView(event('view', 'notes')); h.flush();
  assert.equal(page.data.noteCount, 1); assert.equal(rows(page)[0].summary, '当前快照正文');
});

test('handler 校验不把注释/字符串/继承方法当定义，不误判 template 的合理数据作用域', () => {
  const tree = markup('<template name="card"><view wx:if="{{open[item.id]}}" bindtap="actual" /></template><view bindinput="onInput" />');
  assert.equal(assertHandlers(tree, { actual() {}, onInput() {} }, '隔离模板'), 2);
  assert.throws(() => assertHandlers(tree, { actual: 'function actual() {}', onInput() {} }, '字符串反例'), /缺少真实 handler/);
  const inherited = Object.assign(Object.create({ actual() {} }), { onInput() {} });
  assert.throws(() => assertHandlers(tree, inherited, '继承反例'), /缺少真实 handler/);
  const commented = markup('<!-- <view bindtap="missing" /> --><view catchtap="actual" />');
  assert.equal(assertHandlers(commented, { actual() {} }, '注释作用域'), 1);
  assert.throws(() => assertHandlers(markup('<view bindtap="missing" />'), { comment: 'missing() {}' }, '注释式假定义'), /缺少真实 handler/);
});

for (const name of PAGES) {
  test(name + ' WXML 事件均有真实 Page 自有函数，返回统一 goReadingBack，无冗余文案', () => {
    const h = harness(), definition = h.load('pages/' + name + '/' + name + '.js'), tree = wxml(name);
    assertHandlers(tree, definition, 'pages/' + name + '/' + name + '.wxml');
    const back = one(tree, el => hasClass(el, 'reading-back'));
    assert.equal(back.attrs.bindtap, 'goReadingBack'); assert.equal(back.attrs['wx:if'], '{{readingCanBack}}');
    assert.equal(typeof definition.goReadingBack, 'function');
    assert.equal(Function.prototype.toString.call(definition.goReadingBack),
      Function.prototype.toString.call(h.load('pages/node/node.js').goReadingBack), '统一使用 reading-context 注入的返回实现');
    const redundant = /家庭(?:学习)?记录|家庭标记|家庭备注|选择(?:学习)?状态|(?:点击|点按|轻点)(?:可)?切换(?:学习)?状态/;
    assert.doesNotMatch(tree.clean, redundant, '七阅读页不得重新引入重复标签或操作教学文案');
    assert.doesNotMatch(tree.clean, /bind(?:tap|:tap)\s*=\s*["'](?:goBack|goBackReading|readingBack)["']/, '不得残留旧返回事件名');
    assert.deepEqual(h.mutations, []);
  });
}

let passed = 0;
for (const item of tests) {
  try { item.run(); passed++; console.log('PASS ' + item.name); }
  catch (error) { console.error('FAIL ' + item.name + '\n' + error.stack); }
}
console.log('SUITE=R34_B4_B6_RECORDS');
console.log('HARNESS=REAL_PAGES_REAL_STORE_REAL_SYNC_STATE_ISOLATED_VM');
console.log('RESULT=' + passed + '/' + tests.length + ' FAILED=' + (tests.length - passed));
console.log('VERDICT=' + (passed === tests.length ? 'PASSED' : 'FAILED'));
console.log('NATIVE_EVIDENCE=BLOCKED_NO_EVIDENCE（隔离 VM/WXML 契约检查不是微信原生验收）');
if (!tests.length || passed !== tests.length) process.exitCode = 1;
