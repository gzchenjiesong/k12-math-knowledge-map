#!/usr/bin/env node
// R33/R34：用 Node 内置模块执行真实页面、reading-context 和 draft-guard；隔离 store/wx/storage/网络。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../apps/miniprogram');
const clone = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const tests = [];
const test = (name, run) => tests.push({ name, run });

function dataModule(name) {
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(read('data/' + name + '.js'), context, { filename: name + '.js' });
  return context.module.exports;
}
const knowledge = dataModule('nodes');
const cardsData = dataModule('cards');
const topicIdx = dataModule('topic_index');
const total = Object.keys(cardsData.CARDS).length;
const locatorWxml = read('pages/locator/locator.wxml');
const cardsWxml = read('pages/cards/cards.wxml');
const topicCalls = [...locatorWxml.matchAll(/<template\b[^>]*\bis="topicCard"[^>]*>/g)].map(match => match[0]);
const topicRoot = locatorWxml.match(/<template\s+name="topicCard">\s*(<view\b[^>]*>)/)[1];
const attr = (tag, name) => (tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"')) || [])[1];
const evaluate = (expression, scope) => vm.runInNewContext('(' + expression + ')', scope);
const interpolate = (value, scope) => (value || '').replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => String(evaluate(expr, scope)));

// 只求值当前共用模板的 data/id/class/open 绑定，不冒充微信原生渲染器。
function topicMarkup(mode, item, data) {
  const call = topicCalls[mode === 'index' ? 0 : 1];
  assert.ok(call, '两种模式都须使用题型模板');
  const binding = attr(call, 'data').match(/^\{\{([\s\S]*)\}\}$/)[1];
  const scope = evaluate('({' + binding + '})', { it: item, expandedIds: data.expandedIds, focusId: data.focusId });
  return {
    id: interpolate(attr(topicRoot, 'id'), scope),
    classes: interpolate(attr(topicRoot, 'class'), scope).split(/\s+/),
    open: !!scope.open[item.id],
    focusId: scope.focusId
  };
}
function renderedTopics(data) {
  if (data.mode === 'index') {
    return data.groups.filter(group => data.openGroups[group.id])
      .flatMap(group => group.items.map(item => topicMarkup('index', item, data)));
  }
  return data.searched ? data.topicHits.map(item => topicMarkup('search', item, data)) : [];
}

function pageHarness(name, options = {}) {
  const h = {
    app: { globalData: {} }, page: null, stack: [], requests: [], rendered: null, frames: [], patches: [],
    scrolls: [], toasts: [], routes: [], tabs: [], timers: new Map(), listeners: new Set(),
    statuses: Object.assign({}, options.statuses), now: 0, nextTimer: 1, scrollFails: false
  };
  const store = {
    getStatus(id) { return h.statuses[id] || 0; },
    getNote() { return ''; },
    getDisputed() { return 0; },
    onChange(listener) { h.listeners.add(listener); return () => h.listeners.delete(listener); }
  };
  const modules = new Map(Object.entries({
    'data/nodes.js': { exports: clone(knowledge) },
    'data/topic_index.js': { exports: clone(topicIdx) },
    'data/cards.js': { exports: { CARDS: clone(options.cards || cardsData.CARDS) } },
    'utils/store.js': { exports: store },
    'utils/tabbar.js': { exports: { setSelected(page, index) { assert.equal(page, h.page); h.tabs.push(index); } } }
  }));
  const context = vm.createContext({
    getApp() { return h.app; },
    getCurrentPages() { return h.stack; },
    setTimeout(fn, delay) {
      const id = h.nextTimer++;
      h.timers.set(id, { fn, at: h.now + delay });
      return id;
    },
    clearTimeout(id) { h.timers.delete(id); },
    wx: {
      showToast(value) { h.toasts.push(clone(value)); },
      setNavigationBarTitle() {},
      navigateTo(value) { h.routes.push(clone(value)); h.requests.push(value); },
      pageScrollTo(value) {
        assert.match(value.selector, /^#[A-Za-z][A-Za-z0-9_-]*$/, '选择器只能是安全单一 ID');
        assert.ok(h.rendered, '滚动前必须完成 setData 渲染');
        const matches = renderedTopics(h.rendered).filter(item => '#' + item.id === value.selector);
        assert.equal(matches.length, 1, '滚动目标必须已实际展开渲染且唯一');
        assert.equal(matches[0].open, true, '滚动时子题型已展开');
        h.scrolls.push({ selector: value.selector, rendered: clone(h.rendered) });
        if (h.scrollFails) {
          if (value.fail) value.fail({ errMsg: '隔离桩：滚动失败' });
        } else if (value.success) value.success({});
      }
    }
  });
  h.load = filename => {
    filename = path.posix.normalize(filename);
    if (modules.has(filename)) return modules.get(filename).exports;
    assert.match(filename, /^(data\/[^/]+|utils\/(reading-context|draft-guard|status-picker|content-summary)|pages\/(lecture|graph|gaps|cards|lesson|locator|node)\/\3)\.js$/, '禁止加载未授权依赖');
    const module = { exports: {} }; modules.set(filename, module);
    const wrapper = vm.runInContext('(function(require,module,exports,Page){\n' + read(filename) + '\n})', context, { filename });
    wrapper(request => h.load(path.posix.join(path.posix.dirname(filename), request)), module, module.exports,
      definition => { module.exports = definition; });
    return module.exports;
  };
  h.newPage = (pageName, params = {}) => {
    const definition = h.load('pages/' + pageName + '/' + pageName + '.js');
    const page = Object.assign({}, definition, { data: clone(definition.data), route: 'pages/' + pageName + '/' + pageName, options: params });
    page.setData = function (patch, callback) {
      h.patches.push(clone(patch));
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
        assert.ok(parts.every(part => !['__proto__', 'constructor', 'prototype'].includes(part)), '拒绝危险 setData 路径');
        let target = this.data;
        for (const part of parts.slice(0, -1)) {
          if (!Object.hasOwn(target, part)) target[part] = {};
          target = target[part];
        }
        target[parts[parts.length - 1]] = clone(value);
      }
      h.frames.push({ page: this, data: clone(this.data), callback });
    };
    return page;
  };
  h.performNavigation = () => {
    const request = h.requests.shift(); assert.ok(request, '必须先产生导航请求');
    const [route, query] = request.url.split('?');
    const params = Object.fromEntries(new URLSearchParams(query || ''));
    const previous = h.stack.at(-1); previous.onHide();
    const target = h.newPage(route.split('/')[2], params); h.stack.push(target);
    target.onLoad(params); target.onShow();
    if (request.success) request.success({});
    h.flush();
    return target;
  };
  h.page = h.newPage(name); h.stack.push(h.page);
  h.flush = (reverseCallbacks = false) => {
    let rounds = 0;
    while (h.frames.length) {
      assert.ok(++rounds < 30, '不允许无限渲染重试');
      const frames = h.frames.splice(0);
      frames.forEach(frame => { if (frame.page === h.page) h.rendered = frame.data; });
      if (reverseCallbacks) frames.reverse();
      frames.forEach(frame => { if (frame.callback) frame.callback.call(frame.page); });
    }
  };
  h.advance = ms => {
    const end = h.now + ms;
    let calls = 0;
    while (true) {
      const next = [...h.timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      assert.ok(++calls < 30, '不允许无限定时重试');
      h.now = next[1].at;
      h.timers.delete(next[0]);
      next[1].fn();
      h.flush();
    }
    h.now = end;
  };
  h.focus = id => { h.app.globalData.focusTopic = id; h.page.onShow(); };
  h.emit = source => [...h.listeners].forEach(listener => listener({}, source));
  h.page.onLoad();
  h.flush();
  return h;
}

const otherGroups = topicIdx.TOPIC_GROUPS.filter((group, index) => index > 0 && group.items.length);
const firstTarget = otherGroups[0].items[0];
const secondTarget = otherGroups[1].items[0];
const focusClass = 'tp-focused';
function assertFocused(h, item) {
  assert.equal(h.page.data.focusId, item.id, '目标须临时高亮');
  const marked = renderedTopics(h.rendered).filter(card => card.classes.includes(focusClass));
  assert.equal(marked.length, 1, '只高亮一个真实渲染目标');
  assert.equal(h.scrolls[h.scrolls.length - 1].selector, '#' + marked[0].id);
}
function search(h, keyword) { h.page.onSearch({ detail: { value: keyword } }); h.flush(); }
function filter(h, value) { h.page.setFilter({ currentTarget: { dataset: { filter: value } } }); h.flush(); }
const byId = Object.fromEntries(knowledge.ALL_NODES.map(node => [node.id, node]));
function originalSearchText(id) {
  const node = byId[id], card = cardsData.CARDS[id];
  return ((node ? node.n : '') + ' ' + (card.concept ? card.concept.title + card.concept.body : '') + ' ' + (node ? node.p.join(' ') : '')).toLowerCase();
}
const ids = Object.keys(cardsData.CARDS);
const uniqueNode = knowledge.ALL_NODES.find(node => ids.includes(node.id) && ids.filter(id => originalSearchText(id).includes(node.n.toLowerCase())).length === 1);

// 行为回归：Git 原版页面会在父组、滚动、高亮、非法焦点及总数断言处真实失败。
test('定位非默认父组：展开父子、消费焦点，不能提前滚动', () => {
  const h = pageHarness('locator');
  h.page.setData({ mode: 'search', input: '保留搜索输入' }); h.flush();
  h.focus(firstTarget.id);
  assert.equal(h.app.globalData.focusTopic, null);
  assert.equal(h.page.data.mode, 'index');
  assert.equal(h.page.data.openGroups[otherGroups[0].theme], true, '非默认父组须打开');
  assert.equal(h.page.data.expandedIds[firstTarget.id], true);
  assert.equal(h.page.data.input, '保留搜索输入');
  assert.equal(h.scrolls.length, 0, 'setData 回调前不得滚动');
  h.flush();
  assert.equal(h.scrolls.length, 1);
  assertFocused(h, firstTarget);
});

test('全部真实题型均可安全唯一定位，不能只支持默认组', () => {
  const h = pageHarness('locator');
  const safe = /^[A-Za-z][A-Za-z0-9_-]*$/;
  const seen = new Set();
  for (const group of topicIdx.TOPIC_GROUPS) {
    assert.match(group.theme, safe);
    for (const item of group.items) {
      assert.match(item.id, safe);
      h.focus(item.id); h.flush();
      assert.equal(h.page.data.openGroups[group.theme], true);
      assertFocused(h, item);
      const selector = h.scrolls[h.scrolls.length - 1].selector;
      assert.equal(seen.has(selector), false, '不同题型不能共用滚动 ID');
      seen.add(selector);
    }
  }
  assert.equal(h.scrolls.length, seen.size);
});

test('高亮从渲染完成起保持 2000ms，之后清理', () => {
  const h = pageHarness('locator');
  h.focus(firstTarget.id);
  h.advance(5000);
  assert.equal(h.scrolls.length, 0);
  h.flush();
  assertFocused(h, firstTarget);
  assert.equal(h.timers.size, 1);
  h.advance(1999); assertFocused(h, firstTarget);
  h.advance(1);
  assert.equal(h.page.data.focusId, '');
  assert.equal(h.timers.size, 0);
  assert.equal(renderedTopics(h.rendered).some(item => item.classes.includes(focusClass)), false);
});

for (const hook of ['onHide', 'onUnload']) {
  test(hook + ' 取消未渲染定位，迟到回调不得滚动或重建计时器', () => {
    const h = pageHarness('locator');
    h.focus(firstTarget.id);
    h.page[hook]();
    const writes = h.patches.length;
    h.flush(); h.advance(10000);
    assert.equal(h.scrolls.length, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.page.data.focusId, '');
    assert.equal(h.patches.length, writes, '隐藏/卸载后回调不能继续 setData');
    assert.equal(h.listeners.size, 0);
  });
  test(hook + ' 清已运行高亮定时器，已出队的迟到回调也无效', () => {
    const h = pageHarness('locator');
    h.focus(firstTarget.id); h.flush();
    assert.equal(h.timers.size, 1);
    const lateTimers = [...h.timers.values()];
    h.page[hook]();
    assert.equal(h.timers.size, 0);
    const writes = h.patches.length;
    lateTimers.forEach(timer => timer.fn());
    h.flush(); h.advance(10000);
    assert.equal(h.page.data.focusId, '');
    assert.equal(h.patches.length, writes);
    assert.equal(h.scrolls.length, 1);
    assert.equal(h.listeners.size, 0);
  });
  test(hook + ' 后新焦点不被旧渲染回调复活或覆盖', () => {
    const h = pageHarness('locator');
    h.focus(firstTarget.id); h.page[hook]();
    h.focus(secondTarget.id); h.flush(true);
    assert.equal(h.scrolls.length, 1);
    assertFocused(h, secondTarget);
    assert.equal(h.timers.size, 1);
  });
}

for (const hook of ['onHide', 'onUnload']) {
  test(hook + ' 后无新焦点再次显示，旧渲染与定时回调仍失效', () => {
    for (const rendered of [false, true]) {
      const h = pageHarness('locator');
      h.focus(firstTarget.id);
      if (rendered) h.flush();
      const lateTimers = [...h.timers.values()];
      h.page[hook]();
      h.page.onShow();
      const writes = h.patches.length;
      lateTimers.forEach(timer => timer.fn());
      h.flush(true); h.advance(10000);
      assert.equal(h.scrolls.length, rendered ? 1 : 0);
      assert.equal(h.page.data.focusId, '');
      assert.equal(h.timers.size, 0);
      assert.equal(h.patches.length, writes, '再次显示不能使旧回调重新获得写入权限');
      assert.equal(h.listeners.size, 1);
    }
  });
}

for (const action of ['switchMode', 'toggleGroup', 'toggleItem']) {
  test('渲染前 ' + action + ' 隐藏目标，取消待执行定位和高亮', () => {
    const h = pageHarness('locator');
    h.focus(firstTarget.id);
    const dataset = action === 'switchMode' ? { mode: 'search' }
      : { id: action === 'toggleGroup' ? otherGroups[0].theme : firstTarget.id };
    h.page[action]({ currentTarget: { dataset } });
    h.flush(); h.advance(10000);
    assert.equal(h.scrolls.length, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.page.data.focusId, '');
  });
}

test('连续不同焦点：渲染回调逆序也只定位最后一个', () => {
  const h = pageHarness('locator');
  h.focus(firstTarget.id); h.focus(secondTarget.id); h.flush(true);
  assert.equal(h.scrolls.length, 1);
  assertFocused(h, secondTarget);
  assert.equal(h.timers.size, 1);
});

test('重复相同焦点：旧高亮回调不能提前清掉新高亮', () => {
  const h = pageHarness('locator');
  h.focus(firstTarget.id); h.flush();
  const oldTimers = [...h.timers.values()];
  assert.equal(oldTimers.length, 1);
  h.advance(1000);
  h.focus(firstTarget.id); h.flush();
  oldTimers.forEach(timer => timer.fn()); h.flush();
  assertFocused(h, firstTarget);
  assert.equal(h.timers.size, 1);
  h.advance(1999); assertFocused(h, firstTarget);
  h.advance(1); assert.equal(h.page.data.focusId, '');
});

test('第二次 onShow 无新焦点不重复滚动，也不延长高亮', () => {
  const h = pageHarness('locator');
  h.focus(firstTarget.id); h.flush();
  h.advance(700); h.page.onShow(); h.flush();
  assert.equal(h.scrolls.length, 1);
  assert.equal(h.listeners.size, 1, '保留单一远端订阅');
  h.advance(1300);
  assert.equal(h.page.data.focusId, '');
  h.page.onHide(); h.page.onShow(); h.flush();
  assert.equal(h.scrolls.length, 1, '消费过的焦点不得再次定位');
  assert.equal(h.timers.size, 0);
});

test('未知、选择器注入、对象及空焦点均消费但不展开或谎报成功', () => {
  for (const invalid of ['tp_missing_r33', 'tp_missing.x', '__proto__', '__proto__.polluted', 'constructor', '#tp_factor', 'tp_factor, view', '', ' \t\n ', 0, 1, NaN, false, true, {}, [], [firstTarget.id], null]) {
    const h = pageHarness('locator');
    const before = clone({ openGroups: h.page.data.openGroups, expandedIds: h.page.data.expandedIds });
    h.focus(invalid); h.flush(); h.advance(10000);
    assert.equal(h.app.globalData.focusTopic, null, '非法焦点也应消费清空');
    assert.deepEqual(clone({ openGroups: h.page.data.openGroups, expandedIds: h.page.data.expandedIds }), before);
    assert.equal(h.scrolls.length, 0);
    assert.equal(h.timers.size, 0);
    assert.ok(!h.page.data.focusId);
    assert.equal(h.toasts.some(toast => /已展开|已定位|成功/.test(toast.title)), false);
  }
});

test('非法新焦点取消旧的待执行定位', () => {
  const h = pageHarness('locator');
  h.focus(firstTarget.id); h.focus('tp_missing_r33'); h.flush(true);
  assert.equal(h.scrolls.length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.page.data.focusId, '');
});

test('缺少 globalData 或无 focusTopic 时正常显示，不创建定位任务', () => {
  for (const app of [{}, { globalData: {} }, { globalData: { focusTopic: undefined } }]) {
    const h = pageHarness('locator');
    h.app = app;
    const before = clone(h.page.data);
    h.page.onShow(); h.flush(); h.advance(10000);
    assert.deepEqual(h.page.data, before);
    assert.equal(h.scrolls.length, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.toasts.length, 0);
  }
});

test('定位器空字符串及纯空白仅提示输入，不执行搜索或改变展开状态', () => {
  for (const input of ['', '   ', '\t\n ']) {
    const h = pageHarness('locator');
    h.page.onInput({ detail: { value: input } }); h.flush();
    const before = clone(h.page.data);
    const writes = h.patches.length;
    h.page.locate(); h.flush();
    assert.deepEqual(h.page.data, before);
    assert.equal(h.patches.length, writes);
    assert.deepEqual(h.toasts, [{ title: '请输入题目特征', icon: 'none' }]);
    assert.equal(h.scrolls.length, 0);
    assert.equal(h.timers.size, 0);
  }
});

test('定位器输入无匹配词返回空结果，清空只重置搜索而不改变展开状态', () => {
  const h = pageHarness('locator');
  h.page.onShow(); h.flush();
  h.page.toggleItem({ currentTarget: { dataset: { id: firstTarget.id } } }); h.flush();
  const openGroups = clone(h.page.data.openGroups);
  const expandedIds = clone(h.page.data.expandedIds);
  h.page.onInput({ detail: { value: '__R33_NO_MATCH_9e203e__' } }); h.flush();
  h.page.locate(); h.flush();
  assert.equal(h.page.data.searched, true);
  assert.equal(h.page.data.results.length, 0);
  assert.equal(h.page.data.topicHits.length, 0);
  assert.equal(h.toasts.length, 0);
  h.page.clear(); h.flush();
  assert.equal(h.page.data.input, '');
  assert.equal(h.page.data.searched, false);
  assert.equal(h.page.data.results.length, 0);
  assert.equal(h.page.data.topicHits.length, 0);
  assert.deepEqual(h.page.data.openGroups, openGroups);
  assert.deepEqual(h.page.data.expandedIds, expandedIds);
});

test('定位器快捷搜索等待输入更新，保留原题型和知识域匹配', () => {
  const h = pageHarness('locator');
  h.page.switchMode({ currentTarget: { dataset: { mode: 'search' } } }); h.flush();
  const text = firstTarget.name + ' ' + knowledge.ALL_NODES[0].n;
  h.page.onQuick({ currentTarget: { dataset: { text } } });
  assert.equal(h.page.data.searched, false, '输入渲染回调前不搜索');
  h.flush();
  assert.equal(h.page.data.input, text);
  assert.equal(h.page.data.searched, true);
  assert.ok(h.page.data.topicHits.some(item => item.id === firstTarget.id));
  assert.ok(h.page.data.results.some(item => item.id === knowledge.ALL_NODES[0].id));
  assert.ok(h.page.data.topicHits.length <= 4);
  assert.ok(h.page.data.results.length <= 6);
  assert.equal(h.scrolls.length, 0, '普通搜索不能触发跨页定位滚动');
  assert.equal(h.timers.size, 0);
});

test('滚动失败不报成功、不无限重试', () => {
  const h = pageHarness('locator'); h.scrollFails = true;
  h.focus(firstTarget.id); h.flush(); h.advance(10000);
  assert.equal(h.scrolls.length, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.toasts.some(toast => /成功|已定位|已展开/.test(toast.title)), false);
});

test('两种模式共用模板传入 focusId，稳定 ID 无冲突且高亮有样式', () => {
  assert.equal(topicCalls.length, 2);
  const used = new Set();
  for (const item of topicIdx.TOPIC_ITEMS) {
    const data = { expandedIds: { [item.id]: true }, focusId: item.id };
    for (const mode of ['index', 'search']) {
      const card = topicMarkup(mode, item, data);
      assert.match(card.id, /^[A-Za-z][A-Za-z0-9_-]*$/);
      assert.equal(used.has(card.id), false, '模式间或题型间 ID 不得冲突');
      used.add(card.id);
      assert.equal(card.focusId, item.id, '模板作用域显式接收 focusId');
      assert.ok(card.classes.includes(focusClass));
    }
  }
  assert.match(locatorWxml, /wx:if="\{\{openGroups\[item\.id\]\}\}"/);
  assert.match(locatorWxml, /wx:if="\{\{open\[item\.id\]\}\}"/);
  assert.match(read('pages/locator/locator.wxss'), /\.tp-card\.tp-focused\s*\{[^}]+\}/);
});

test('tab-page 只用于 tab 页：locator 有，cards 无', () => {
  const tabPages = JSON.parse(read('app.json')).tabBar.list.map(item => item.pagePath);
  for (const [name, wxml] of [['locator', locatorWxml], ['cards', cardsWxml]]) {
    const root = wxml.match(/<view\s+class="(page[^"]*)"/);
    assert.ok(root);
    assert.equal(root[1].split(/\s+/).includes('tab-page'), tabPages.includes('pages/' + name + '/' + name));
  }
});

test('实际展示绑定：筛为 1/0 条时总收录文案仍显示原总数', () => {
  const h = pageHarness('cards');
  const tip = cardsWxml.match(/<view class="tip">([^<]+)<\/view>/)[1];
  const before = interpolate(tip, h.page.data);
  assert.ok(before.includes(String(total)));
  search(h, uniqueNode.n);
  assert.equal(h.page.data.list.length, 1);
  assert.equal(interpolate(tip, h.page.data), before, '筛为 1 条不能把已收录总数显示为 1');
  search(h, '__R33_NO_MATCH_9e203e__');
  assert.equal(h.page.data.list.length, 0);
  assert.equal(interpolate(tip, h.page.data), before, '零结果不能把已收录总数显示为 0');
});

test('卡片总数从数据派生，与全量列表一致', () => {
  const h = pageHarness('cards');
  assert.equal(h.page.data.list.length, total);
  assert.equal(h.page.data.totalCardCount, total);
  assert.equal(h.page.data.resultCount, total);
  assert.equal(Object.hasOwn(h.page.data, 'count'), false, '不保留两用 count');
});

test('唯一关键词筛为 1 条，总收录数不改变', () => {
  assert.ok(uniqueNode, '真实数据须能派生唯一匹配关键词');
  const h = pageHarness('cards');
  search(h, '  ' + uniqueNode.n + '  ');
  assert.deepEqual(h.page.data.list.map(item => item.id), [uniqueNode.id]);
  assert.equal(h.page.data.resultCount, 1);
  assert.equal(h.page.data.totalCardCount, total);
});

test('零结果仍保留总数，清空搜索恢复全部', () => {
  const h = pageHarness('cards');
  search(h, '__R33_NO_MATCH_9e203e__');
  assert.equal(h.page.data.list.length, 0);
  assert.equal(h.page.data.resultCount, 0);
  assert.equal(h.page.data.totalCardCount, total);
  search(h, '');
  assert.equal(h.page.data.resultCount, total);
  assert.equal(h.page.data.totalCardCount, total);
});

test('空白搜索清除关键词条件但保留未掌握筛选，总数始终不变', () => {
  const statuses = Object.fromEntries(ids.map((id, index) => [id, index % 3]));
  const expected = ids.filter(id => statuses[id] !== 2).length;
  const h = pageHarness('cards', { statuses });
  filter(h, 'unmastered');
  for (const keyword of ['', '   ', '\t\n ']) {
    search(h, '__R33_NO_MATCH_9e203e__');
    assert.equal(h.page.data.resultCount, 0);
    search(h, keyword);
    assert.equal(h.page.data.filter, 'unmastered');
    assert.equal(h.page.data.resultCount, expected);
    assert.equal(h.page.data.list.length, expected);
    assert.equal(h.page.data.totalCardCount, total);
  }
});

test('空卡片数据的总数及结果数均为零，搜索和筛选不抛错', () => {
  const h = pageHarness('cards', { cards: {} });
  for (const value of ['all', 'unmastered']) {
    filter(h, value);
    for (const keyword of ['', '   ', '不存在的卡片']) {
      search(h, keyword);
      assert.deepEqual(h.page.data.list, []);
      assert.equal(h.page.data.totalCardCount, 0);
      assert.equal(h.page.data.resultCount, 0);
    }
  }
});

test('页面再次显示及远端刷新保留关键词与筛选，仅更新结果数', () => {
  const h = pageHarness('cards', { statuses: { [uniqueNode.id]: 1 } });
  h.page.onShow(); h.flush();
  filter(h, 'unmastered'); search(h, uniqueNode.n);
  assert.equal(h.page.data.resultCount, 1);
  h.statuses[uniqueNode.id] = 2;
  h.emit('remote'); h.flush();
  assert.equal(h.page.data.resultCount, 0);
  h.page.onHide();
  h.statuses[uniqueNode.id] = 0;
  h.page.onShow(); h.flush();
  assert.equal(h.page.data.keyword, uniqueNode.n);
  assert.equal(h.page.data.filter, 'unmastered');
  assert.equal(h.page.data.resultCount, 1);
  assert.equal(h.page.data.totalCardCount, total);
  assert.equal(h.listeners.size, 1);
});

test('卡片保留小学、初中、高中、奥赛的原来源排序', () => {
  const h = pageHarness('cards');
  const order = { primary: 0, junior: 1, senior: 2, olympiad: 3 };
  const ranks = h.page.data.list.map(item => byId[item.id] ? order[byId[item.id].domain] : 9);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test('替换为数据子集仍派生总数，不能写死当前节点基线', () => {
  const subset = Object.fromEntries(ids.slice(0, 3).map(id => [id, cardsData.CARDS[id]]));
  const h = pageHarness('cards', { cards: subset });
  assert.equal(h.page.data.totalCardCount, Object.keys(subset).length);
  search(h, '__R33_NO_MATCH_9e203e__');
  assert.equal(h.page.data.resultCount, 0);
  assert.equal(h.page.data.totalCardCount, Object.keys(subset).length);
});

test('未掌握保留状态 0/1，排除 2，并与关键词取交集', () => {
  const statuses = Object.fromEntries(ids.map((id, index) => [id, index % 3]));
  statuses[uniqueNode.id] = 1;
  const h = pageHarness('cards', { statuses });
  filter(h, 'unmastered');
  const expected = ids.filter(id => statuses[id] !== 2).sort();
  assert.deepEqual(h.page.data.list.map(item => item.id).sort(), expected);
  assert.equal(h.page.data.resultCount, expected.length);
  assert.equal(h.page.data.totalCardCount, total);
  search(h, uniqueNode.n);
  assert.equal(h.page.data.resultCount, 1);
  h.statuses[uniqueNode.id] = 2;
  h.page.buildList(); h.flush();
  assert.equal(h.page.data.resultCount, 0);
  assert.equal(h.page.data.totalCardCount, total);
  filter(h, 'all');
  assert.equal(h.page.data.resultCount, 1);
});

test('保留原搜索范围、去空白与忽略大小写，不扩展例题全文', () => {
  const fixture = clone(cardsData.CARDS);
  const id = ids[0];
  fixture[id].concept.body += ' R33ConceptOnly';
  fixture[id].examples[0].question += ' R33ExampleOnly';
  const h = pageHarness('cards', { cards: fixture });
  search(h, '  r33conceptonly  ');
  assert.deepEqual(h.page.data.list.map(item => item.id), [id]);
  search(h, 'r33exampleonly');
  assert.equal(h.page.data.list.length, 0, '不得扩大到例题全文搜索');
  const keyword = byId[id].p[0];
  search(h, keyword);
  assert.ok(h.page.data.list.some(item => item.id === id), '原有子点搜索保留');
});

test('卡片展示分离总数/结果数，零结果提示及三态文字绑定正确', () => {
  assert.match(cardsWxml, /data-filter="all">全部卡片<\/view>/);
  assert.match(cardsWxml, /<text class="count">[^<]*\{\{resultCount\}\}/);
  assert.match(cardsWxml, /<view class="tip">[^<]*\{\{totalCardCount\}\}/);
  const empty = cardsWxml.match(/<view class="empty"[^>]*>/)[0];
  const condition = attr(empty, 'wx:if').slice(2, -2);
  assert.equal(evaluate(condition, { totalCardCount: total, resultCount: 0 }), true);
  assert.equal(evaluate(condition, { totalCardCount: total, resultCount: 1 }), false);
  assert.doesNotMatch(cardsWxml, /\{\{\s*count\b/);
  const label = cardsWxml.match(/class="status-dot[^\"]*"[^>]*><\/text>\s*<text class="status-label">([^<]+)<\/text>/);
  assert.ok(label, '状态色点旁须提供 status-label 文字');
  ['未开始', '学习中', '已掌握'].forEach((text, status) => {
    assert.equal(interpolate(label[1], { item: { status } }), text);
  });
});

for (const name of ['locator', 'cards']) {
  test(name + ' 保留 R31 远端刷新及隐藏/卸载退订', () => {
    const h = pageHarness(name);
    h.page.onShow(); h.flush();
    h.page.onShow(); h.flush();
    assert.equal(h.listeners.size, 1);
    const before = h.patches.length;
    h.emit('local');
    assert.equal(h.patches.length, before);
    if (name === 'locator') h.page.setData({ results: [{ id: ids[0], status: 0 }] });
    h.statuses[ids[0]] = 2;
    h.emit('remote'); h.flush();
    const list = name === 'locator' ? h.page.data.results : h.page.data.list;
    assert.equal(list.find(item => item.id === ids[0]).status, 2);
    h.page.onHide(); assert.equal(h.listeners.size, 0);
    h.page.onShow(); h.flush(); assert.equal(h.listeners.size, 1);
    h.page.onUnload(); assert.equal(h.listeners.size, 0);
  });
  test(name + ' 保留知识点详情导航', () => {
    const h = pageHarness(name);
    assert.equal(h.page._reading.active, false, '真实 attach 的 onLoad 必须初始化阅读实例');
    h.page.onShow(); h.flush();
    assert.equal(h.page._reading.active, true);
    h.page.goNode({ currentTarget: { dataset: { id: ids[0] } } });
    assert.deepEqual(h.routes, [{ url: '/pages/node/node?id=' + ids[0] }]);
    const target = h.performNavigation();
    assert.equal(target.data.node.id, ids[0]);
    assert.equal(h.page._reading.active, false);
    assert.equal(target._reading.active, true);
    assert.equal(target._reading.parent, h.page._reading.id);
    assert.equal(target.data.readingCanBack, true, '真实导航成功后发布阅读返回入口');
    if (name === 'locator') assert.deepEqual(h.tabs, [2]);
  });
}

test('阅读页模板标签完整、事件处理存在、tab底部占位仅应用到四主导航', () => {
  const app = JSON.parse(read('app.json'));
  const tabs = new Set(app.tabBar.list.map(item => item.pagePath));
  const h = pageHarness('locator'), missing = [];
  for (const page of app.pages.filter(p => !p.includes('/present/'))) {
    const wxml = read(page + '.wxml'), definition = h.load(page + '.js');
    const root = wxml.match(/<view\s+class="(page[^"]*)"/);
    assert.ok(root, page);
    assert.equal(root[1].split(/\s+/).includes('tab-page'), tabs.has(page), page);
    const stack = [];
    const markup = wxml.replace(/<!--[\s\S]*?-->/g, '').replace(/\{\{[\s\S]*?\}\}/g, 'binding');
    for (const token of markup.matchAll(/<(\/?)([A-Za-z][\w-]*)\b[^>]*>/g)) {
      const [, closing, tag] = token;
      if (closing) assert.equal(stack.pop(), tag, page + ': ' + token[0]);
      else if (!token[0].endsWith('/>')) stack.push(tag);
    }
    assert.deepEqual(stack, [], page + ': unclosed tags');
    // 处理器可能由真实 attach 注入；不能仅扫描页面源码，也不能给缺失方法补桩。
    for (const event of wxml.matchAll(/(?:bind|catch)(?:tap|longpress|input|confirm)="([A-Za-z]\w*)"/g)) {
      if (typeof definition[event[1]] !== 'function') missing.push(page + ': missing ' + event[1]);
    }
  }
  assert.deepEqual(missing, [], '模板事件必须在真实 Page 定义上存在：' + missing.join('；'));
});

test('七个阅读页样式使用物理字号与44px触控高度，保留原宽屏列数', () => {
  const global = read('app.wxss');
  assert.match(global, /font-size:\s*16px/); assert.match(global, /font-size:\s*17px/);
  assert.match(global, /max-width:\s*1180px/);
  assert.match(global, /\.page\.tab-page\s*\{[^}]*safe-area-inset-bottom/);
  const bar = read('custom-tab-bar/index.wxss');
  assert.match(bar, /box-sizing:\s*content-box/);
  assert.match(bar, /height:\s*50px/); assert.match(bar, /height:\s*66px/);
  for (const name of ['lecture', 'graph', 'cards', 'lesson', 'gaps', 'node', 'locator']) {
    const css = read('pages/' + name + '/' + name + '.wxss');
    assert.doesNotMatch(css, /font-size:\s*[\d.]+rpx/, name);
    assert.match(css, /min-height:\s*44px/, name);
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, name);
  }
  assert.match(read('pages/cards/cards.wxss'), /repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(read('pages/lecture/lecture.wxss'), /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

let passed = 0;
for (const { name, run } of tests) {
  try { run(); passed++; console.log('OK   ' + name); }
  catch (error) { console.error('FAIL ' + name + '\n     ' + error.message); }
}
console.log('DATA_TOTAL=' + total);
console.log('RESULT=' + passed + '/' + tests.length + ' FAILED=' + (tests.length - passed));
console.log('VERDICT=' + (passed === tests.length ? 'PASSED' : 'FAILED'));
process.exitCode = passed === tests.length ? 0 : 1;
