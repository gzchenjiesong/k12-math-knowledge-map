#!/usr/bin/env node
// 只运行 Node 内置 vm + 隔离的多设备/多账号数据库桩；不加载真实云配置或访问网络。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../apps/miniprogram');
const KEY = 'olympiad_cards_state_v1';
const QUEUE = 'olympiad_sync_queue_v1';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const tests = [];
const test = (name, run) => tests.push({ name, run });
async function flush() { for (let i = 0; i < 120; i++) await Promise.resolve(); }

class Database {
  constructor() { this.docs = new Map(); this.reads = []; this.writes = []; this.held = []; }
  seed(doc, owner = 'family') { this.docs.set(doc._id, clone(Object.assign({ _openid: owner }, doc))); }
  sdk(device) {
    const self = this;
    return {
      command: { gt: value => ({ gt: value }) },
      collection(name) {
        assert.equal(name, 'progress');
        let filter, limit, order;
        const query = {
          where(value) { filter = value; return query; },
          orderBy(field, direction) { order = [field, direction]; return query; },
          limit(value) { limit = value; return query; },
          get(callbacks) {
            // 官方基础权限隐式加身份限制；不能让桩替错误的 {openid} 查询兜底。
            assert.equal(Object.hasOwn(filter, '_openid'), false);
            assert.deepEqual(order, ['_id', 'asc']);
            assert.equal(limit, 20);
            const cursor = filter._id ? filter._id.gt : '';
            self.reads.push({ device: device.name, cursor, limit });
            const plan = device.getPlans.shift();
            queueMicrotask(() => {
              if (device.rules === 'custom-owner') return callbacks.fail({ errMsg: 'mock custom-rule query rejected' });
              if (plan === 'fail' || device.offline) return callbacks.fail({ errMsg: 'mock offline' });
              if (plan === 'malformed') return callbacks.success(device.realm({ data: {} }));
              const data = [...self.docs.values()].filter(doc => doc._openid === device.owner && doc._id > cursor)
                .sort((a, b) => a._id < b._id ? -1 : 1).slice(0, limit);
              callbacks.success(device.realm({ data }));
            });
          },
          doc(id) {
            return {
              set(options) {
                const data = clone(options.data);
                assert.match(id, /^p2_[a-f0-9]{32}_[1-9][0-9]*$/);
                assert.equal(Object.hasOwn(data, '_openid'), false);
                assert.equal(Object.hasOwn(data, '_id'), false);
                self.writes.push({ device: device.name, id, data });
                const plan = device.setPlans.shift();
                const commit = () => {
                  const old = self.docs.get(id);
                  if (old && old._openid !== device.owner) return false;
                  if (old) {
                    const previous = clone(old); delete previous._id; delete previous._openid;
                    assert.deepEqual(data, previous, '同一幂等 ID 不得改写不同内容');
                  }
                  self.docs.set(id, Object.assign({ _id: id, _openid: device.owner }, data));
                  return { _id: id, stats: { created: old ? 0 : 1, updated: old ? 1 : 0 } };
                };
                queueMicrotask(() => {
                  if (plan === 'fail' || device.offline) return options.fail({ errMsg: 'mock offline' });
                  if (plan === 'zero') return options.success(device.realm({ stats: { created: 0, updated: 0 } }));
                  if (plan === 'late') {
                    self.held.push(() => { const result = commit(); options.success(device.realm(result)); });
                    return;
                  }
                  const result = commit();
                  if (!result) return options.fail({ errMsg: 'mock permission denied' });
                  if (plan === 'hold') { self.held.push(() => options.success(device.realm(result))); return; }
                  if (plan === 'lost') return options.fail({ errMsg: 'mock lost response' });
                  options.success(device.realm(result));
                });
              },
              update() { throw new Error('禁止整份覆盖或改写旧文档'); },
              remove() { throw new Error('禁止删除云文档'); }
            };
          },
          add() { throw new Error('禁止非幂等 add'); }
        };
        return query;
      }
    };
  }
}
let seed = 1;
function device(db, options = {}) {
  const d = {
    name: options.name || 'device-' + seed++, owner: options.owner || 'family', rules: options.rules || 'basic-private',
    disk: options.disk || new Map(), getPlans: [], setPlans: [], timers: new Map(), toasts: [],
    offline: false, failRead: false, failWrite: false, clock: 0, nextTimer: 1, pageDefinition: null,
    menus: [], modals: [], navigation: [], requests: [], stack: [], tabPages: new Map(),
    app: { globalData: {} }, holdModal: false, storageWrites: 0
  };
  let random = seed++ * 7919;
  const context = vm.createContext({
    console,
    setTimeout(fn, delay) { const id = d.nextTimer++; d.timers.set(id, { at: d.clock + delay, fn }); return id; },
    clearTimeout(id) { d.timers.delete(id); },
    App(def) { d.app = def; }, Page(def) { d.pageDefinition = def; },
    getApp() { return d.app; },
    getCurrentPages() { return d.stack; }
  });
  const parse = vm.runInContext('JSON.parse', context);
  d.realm = value => value === undefined ? undefined : parse(JSON.stringify(value));
  context.wx = {
    getStorageSync(key) { if (d.failRead) throw new Error('mock read failed'); return d.disk.has(key) ? d.realm(d.disk.get(key)) : ''; },
    setStorageSync(key, value) { d.storageWrites++; if (d.failWrite) throw new Error('mock disk full'); d.disk.set(key, clone(value)); },
    removeStorageSync() { throw new Error('禁止清理历史队列或原始数据'); },
    cloud: { init() {}, database() { return db.sdk(d); } },
    onNetworkStatusChange(fn) { d.network = fn; },
    getWindowInfo: () => ({ windowWidth: 390 }),
    setNavigationBarTitle() {}, showToast(options) { d.toasts.push(clone(options)); }, vibrateShort() {},
    showActionSheet(options) { d.menus.push(options); },
    navigateTo(options) { d.navigation.push(clone(options)); d.requests.push({ kind: 'navigateTo', options }); },
    switchTab(options) { d.navigation.push(clone(options)); d.requests.push({ kind: 'switchTab', options }); },
    navigateBack(options) { d.requests.push({ kind: 'navigateBack', options }); },
    showModal(options) { d.modals.push(options); if (!d.holdModal) options.success({ confirm: true }); }
  };
  context.randomForTest = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 4294967296; };
  vm.runInContext('Math.random = randomForTest', context);
  const cache = new Map();
  d.require = filename => {
    let absolute = path.resolve(ROOT, filename);
    if (!absolute.endsWith('.js')) absolute += '.js';
    assert.ok(absolute.startsWith(ROOT + path.sep));
    // 截断真实配置加载路径：测试不读取任何云环境值或机密。
    if (absolute === path.join(ROOT, 'utils/cloud-config.js')) return { env: 'mock-only', collection: 'progress' };
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const wrapper = vm.runInContext('(function(require,module,exports){\n' + fs.readFileSync(absolute, 'utf8') + '\n})', context, { filename: absolute });
    wrapper(relative => d.require(path.resolve(path.dirname(absolute), relative)), module, module.exports);
    return module.exports;
  };
  d.store = d.require('utils/store'); d.sync = d.require('utils/sync'); d.protocol = d.require('utils/sync-state');
  d.state = () => clone(d.store.load());
  d.pending = () => clone(d.store.pending());
  d.meta = () => clone(d.disk.get(KEY)._sync);
  d.start = () => { d.require('app'); d.app.onLaunch(); return d.app; };
  d.next = async () => {
    await flush();
    const next = [...d.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) return false;
    d.clock = next[1].at; d.timers.delete(next[0]); next[1].fn(); await flush(); return true;
  };
  const pageDefinitions = new Map();
  const tabNames = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).tabBar.list.map(item => item.pagePath));
  d.newPage = (name, params = {}) => {
    if (!pageDefinitions.has(name)) {
      d.require('pages/' + name + '/' + name);
      pageDefinitions.set(name, d.pageDefinition);
    }
    const page = Object.assign({}, pageDefinitions.get(name), { route: 'pages/' + name + '/' + name, options: d.realm(params) });
    page.data = d.realm(page.data);
    page.setData = function (patch, cb) {
      for (const key of Object.keys(patch)) {
        const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
        let target = this.data;
        for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
        target[parts[parts.length - 1]] = patch[key];
      }
      if (cb) cb.call(this);
    };
    return page;
  };
  // 独立页面用例从新栈开始；实际业务导航必须走下方原生生命周期模拟。
  d.page = (name, params = {}) => {
    d.stack.slice().reverse().forEach(page => { if (page.onUnload) page.onUnload(); });
    d.stack = []; d.tabPages.clear();
    const page = d.newPage(name, params); d.stack.push(page);
    if (tabNames.has(page.route)) d.tabPages.set(page.route, page);
    if (page.onLoad) page.onLoad(page.options);
    return page;
  };
  d.performNavigation = () => {
    const request = d.requests.shift(); assert.ok(request, '必须先产生导航请求');
    const { kind, options: args } = request;
    let target;
    if (kind === 'navigateBack') {
      const delta = args.delta || 1;
      assert.ok(d.stack.length > delta, '原生返回必须存在上一页');
      d.stack.slice(-delta).reverse().forEach(page => { if (page.onUnload) page.onUnload(); });
      d.stack.splice(-delta); target = d.stack.at(-1);
    } else {
      const [url, query] = args.url.split('?'), route = url.slice(1);
      const params = Object.fromEntries(new URLSearchParams(query || ''));
      const previous = d.stack.at(-1); if (previous && previous.onHide) previous.onHide();
      if (kind === 'switchTab') {
        assert.ok(tabNames.has(route), 'switchTab 只能进入已配置 tab');
        d.stack.filter(page => !tabNames.has(page.route)).reverse().forEach(page => { if (page.onUnload) page.onUnload(); });
        target = d.tabPages.get(route);
        if (target) d.stack = [target];
        else {
          target = d.newPage(route.split('/')[1], params); d.tabPages.set(route, target); d.stack = [target];
          if (target.onLoad) target.onLoad(target.options);
        }
      } else {
        assert.equal(kind, 'navigateTo'); assert.ok(!tabNames.has(route), 'navigateTo 不能进入 tab');
        assert.ok(d.stack.length < 10, '原生页面栈不能超过十层');
        target = d.newPage(route.split('/')[1], params); d.stack.push(target);
        if (target.onLoad) target.onLoad(target.options);
      }
    }
    if (target.onShow) target.onShow();
    if (args.success) args.success({});
    if (args.complete) args.complete({});
    return target;
  };
  d.nativeBack = () => { d.requests.push({ kind: 'navigateBack', options: { delta: 1 } }); return d.performNavigation(); };
  return d;
}
async function converge(...devices) { for (const d of devices) assert.equal(await d.sync.pull(), true); }
const eventFor = dataset => ({ currentTarget: { dataset } });
function openStatus(d, page, id) {
  const count = d.menus.length;
  page.chooseStatus(eventFor({ id }));
  assert.equal(d.menus.length, count + 1, '必须打开明确状态菜单');
  return d.menus.at(-1);
}
function selectStatus(d, page, id, value) {
  const menu = openStatus(d, page, id);
  menu.success({ tapIndex: value });
  if (menu.complete) menu.complete();
}
function statusPage(d, name) {
  const group = d.require('data/lectures').LECTURES[0];
  const page = d.page(name, name === 'node' ? { id: 'j_quad' } : { id: group.id });
  page.onShow();
  return { page, id: name === 'lesson' ? page.data.points[0].nodeId : 'j_quad' };
}
function displayedStatus(page, name, id) {
  if (name === 'node') return page.data.status;
  if (name === 'lesson') return page.data.points.find(p => p.nodeId === id).status;
  return page.data.themes.flatMap(t => t.topics).find(t => t.id === id).status;
}
function watchStatusWrites(d) {
  const original = d.store.setStatus;
  const calls = [];
  d.store.setStatus = (id, value) => { calls.push({ id, value }); return original(id, value); };
  return calls;
}

// 基本语义与字段级收敛。
test('新安装空状态不上传默认值；远端合并不回推', async () => {
  const db = new Database(), a = device(db), b = device(db);
  assert.equal(await a.sync.init(), true); assert.equal(db.writes.length, 0);
  a.store.setStatus('j_quad', 2); assert.equal(await a.sync.push(), true);
  b.start(); await flush();
  assert.equal(b.store.getStatus('j_quad'), 2); assert.equal(b.pending().length, 0);
  assert.equal(db.writes.length, 1); assert.equal(b.timers.size, 0);
});
test('显式 0、空笔记、取消存疑不会被旧值复活', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setStatus('j_quad', 2); a.store.setNote('j_quad', '旧笔记'); a.store.setDisputed('j_quad', 1);
  assert.equal(await a.sync.push(), true); await converge(b);
  b.store.setStatus('j_quad', 0); b.store.setNote('j_quad', ''); b.store.setDisputed('j_quad', 0);
  assert.equal(await b.sync.push(), true); await converge(a, b);
  for (const d of [a, b]) assert.deepEqual(d.state(), { status: { j_quad: 0 }, notes: { j_quad: '' }, disputed: { j_quad: 0 } });
  await converge(a, b); assert.equal(a.store.getDisputed('j_quad'), 0);
});
test('删除保留 tombstone，反复拉取历史操作不复活', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setStatus('j_quad', 2); a.store.setNote('j_quad', '待删'); a.store.setDisputed('j_quad', 1);
  await a.sync.push(); await b.sync.pull();
  const state = b.store.load(); delete state.status.j_quad; delete state.notes.j_quad; delete state.disputed.j_quad;
  assert.equal(b.store.save(state), true); assert.equal(await b.sync.push(), true); await converge(a, b);
  assert.deepEqual(a.state(), { status: {}, notes: {}, disputed: {} });
  assert.equal(a.meta().registers.notes.j_quad.value, null);
});
test('A 未修改的字段不覆盖 B 新值；旧 load 快照只保存自身 diff', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setNote('j_quad', '旧值'); await a.sync.push(); await b.sync.pull();
  const old = a.store.load();
  b.store.setNote('j_quad', 'B新值'); await b.sync.push(); await a.sync.pull();
  old.status.j_quad = 1;
  assert.equal(a.store.save(old), true); assert.equal(a.pending()[0].fields.notes.j_quad, undefined);
  await a.sync.push(); await converge(a, b);
  assert.equal(b.store.getNote('j_quad'), 'B新值'); assert.equal(b.store.getStatus('j_quad'), 1);
});
test('同时编辑不同字段，两个设备都只写自己的改动', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setStatus('j_quad', 2); b.store.setNote('j_quad', 'B');
  a.setPlans.push('hold'); b.setPlans.push('hold');
  const pa = a.sync.push(), pb = b.sync.push(); await flush();
  assert.equal(db.held.length, 2); db.held.splice(0).forEach(release => release());
  assert.deepEqual(await Promise.all([pa, pb]), [true, true]); await converge(a, b);
  assert.deepEqual(a.state(), b.state()); assert.equal(a.store.getNote('j_quad'), 'B'); assert.equal(b.store.getStatus('j_quad'), 2);
  assert.equal(db.writes[0].data.fields.notes.j_quad, undefined);
});
test('同时编辑相同字段有确定胜者；不取状态最大值', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setStatus('j_quad', 2); b.store.setStatus('j_quad', 0);
  const expected = a.meta().device > b.meta().device ? 2 : 0;
  await Promise.all([a.sync.push(), b.sync.push()]); await converge(b, a);
  assert.equal(a.store.getStatus('j_quad'), expected); assert.deepEqual(a.state(), b.state());
  a.store.setStatus('j_quad', 0); await a.sync.push(); await converge(b);
  assert.equal(b.store.getStatus('j_quad'), 0);
});
test('纯合并满足交换/结合/幂等；同版本异常内容也固定收敛', () => {
  const d = device(new Database()), p = d.protocol;
  const regs = (value, clock, actor) => p.fromValues(d.realm({ status: { j_quad: value }, notes: {}, disputed: {} }), d.realm([1, clock, 'd:' + actor.repeat(32), 1]));
  const a = regs(2, 1, 'a'), b = regs(0, 1, 'b'), c = regs(null, 2, 'c');
  const eq = (x, y) => assert.deepEqual(clone(x), clone(y));
  eq(p.merge(a, b), p.merge(b, a)); eq(p.merge(a, a), a);
  eq(p.merge(p.merge(a, b), c), p.merge(a, p.merge(b, c)));
  const bad = regs(1, 1, 'a'); eq(p.merge(a, bad), p.merge(bad, a));
});

// 发送、确认、重试及首次幂等。
test('发送中有新修改，旧 ack 仅确认所发操作；并发 push 串行', async () => {
  const db = new Database(), a = device(db);
  a.store.setStatus('j_quad', 2); a.setPlans.push('hold');
  let callbacks = 0;
  const first = a.sync.push(() => callbacks++), joined = a.sync.push(() => callbacks++);
  await flush(); assert.equal(db.writes.length, 1);
  a.store.setStatus('j_quad', 0); const newest = a.pending()[1];
  db.held.shift()(); assert.equal(await first, true); assert.equal(await joined, true);
  assert.equal(callbacks, 2); assert.deepEqual(a.pending(), [newest]);
  await a.sync.push(); assert.equal(a.pending().length, 0); assert.equal(db.docs.size, 2);
  const b = device(db); await b.sync.pull(); assert.equal(b.store.getStatus('j_quad'), 0);
});
test('写入失败 + 重启重试保持设备和文档 ID', async () => {
  const db = new Database(), a = device(db);
  a.store.setNote('j_quad', '离线笔记'); const id = a.meta().device;
  a.setPlans.push('fail'); assert.equal(await a.sync.push(), false); a.sync.pause();
  const restarted = device(db, { disk: a.disk }); assert.equal(await restarted.sync.push(), true);
  assert.equal(restarted.meta().device, id); assert.equal(db.writes[0].id, db.writes[1].id);
  assert.equal(db.docs.size, 1); assert.equal(restarted.pending().length, 0);
});
test('已落库但响应丢失，重启重试不会产生重复文档', async () => {
  const db = new Database(), a = device(db);
  a.store.setStatus('j_quad', 1); a.setPlans.push('lost');
  assert.equal(await a.sync.push(), false); assert.equal(db.docs.size, 1); assert.equal(a.pending().length, 1); a.sync.pause();
  const restarted = device(db, { disk: a.disk }); assert.equal(await restarted.sync.push(), true);
  assert.equal(db.docs.size, 1); assert.equal(db.writes[0].id, db.writes[1].id);
});
test('超时旧请求在重启和新写入后才落库，也不能回滚新值', async () => {
  const db = new Database(), a = device(db);
  a.store.setNote('j_quad', '旧请求'); a.setPlans.push('late');
  const oldFlight = a.sync.push(); await flush(); assert.equal(db.held.length, 1);
  await a.next(); assert.equal(await oldFlight, false); a.sync.pause();
  const restarted = device(db, { disk: a.disk }); assert.equal(await restarted.sync.push(), true);
  restarted.store.setNote('j_quad', '新请求'); assert.equal(await restarted.sync.push(), true);
  db.held.shift()(); await flush();
  const b = device(db); await b.sync.pull(); assert.equal(b.store.getNote('j_quad'), '新请求');
  assert.equal(db.docs.size, 2); assert.equal(restarted.pending().length, 0);
});
test('首次 init/push 重入合并；不通过 add 自动生成 ID', async () => {
  const db = new Database(), a = device(db);
  a.store.setStatus('j_quad', 1);
  const results = await Promise.all([a.sync.init(), a.sync.init(), a.sync.push(), a.sync.push()]);
  assert.deepEqual(results, [true, true, true, true]); assert.equal(db.writes.length, 1); assert.equal(db.docs.size, 1);
});
test('首次拉取失败不会发送、清队列或当作空库', async () => {
  const db = new Database(), a = device(db);
  a.store.setNote('j_quad', '未发送'); const before = a.pending(); a.getPlans.push('fail');
  assert.equal(await a.sync.init(), false); assert.equal(db.writes.length, 0); assert.deepEqual(a.pending(), before);
  assert.equal(await a.sync.init(), true); assert.equal(db.docs.size, 1);
});
test('成功回调但 stats 为零不确认队列', async () => {
  const db = new Database(), a = device(db);
  a.store.setStatus('j_quad', 1); a.setPlans.push('zero');
  assert.equal(await a.sync.push(), false); assert.equal(a.pending().length, 1);
});
test('ack 落盘失败保留操作；下次安全重试', async () => {
  const db = new Database(), a = device(db);
  a.store.setStatus('j_quad', 1); a.setPlans.push('hold'); const flight = a.sync.push(); await flush();
  a.failWrite = true; db.held.shift()(); assert.equal(await flight, false); a.failWrite = false;
  assert.equal(a.pending().length, 1); assert.equal(await a.sync.push(), true); assert.equal(db.docs.size, 1);
});

// 分页及旧协议迁移。
test('分页拉取超过 20 条并合并全部旧文档，不只读取第一份', async () => {
  const db = new Database();
  for (let i = 0; i < 47; i++) db.seed({ _id: 'old_' + String(i).padStart(3, '0'), notes: { ['j_n' + i]: '笔记' + i }, updatedAt: i });
  const a = device(db); assert.equal(await a.sync.pull(), true);
  assert.equal(Object.keys(a.state().notes).length, 47); assert.equal(db.reads.length, 3);
  assert.equal(a.pending().length, 0); assert.equal(db.writes.length, 0);
});
test('整页倍数会继续读末尾空页；分页中途失败不提交半份状态', async () => {
  const db = new Database();
  for (let i = 0; i < 40; i++) db.seed({ _id: 'old_' + String(i).padStart(3, '0'), status: { ['j_n' + i]: 1 } });
  const a = device(db); a.getPlans.push('ok', 'fail');
  assert.equal(await a.sync.pull(), false); assert.equal(Object.keys(a.state().status).length, 0);
  assert.equal(await a.sync.pull(), true); assert.equal(Object.keys(a.state().status).length, 40);
  assert.equal(db.reads.length, 5);
});
test('旧云显式零值/空值保留；全部旧记录只读、不删除、不回推', async () => {
  const db = new Database();
  db.seed({ _id: 'old1', status: { j_quad: 2 }, notes: { j_quad: '旧' }, disputed: { j_quad: 1 }, updatedAt: 10 });
  db.seed({ _id: 'old2', status: { j_quad: 0 }, notes: { j_quad: '' }, disputed: { j_quad: 0 }, updatedAt: 20 });
  const originals = clone([...db.docs.values()]), a = device(db);
  assert.equal(await a.sync.init(), true); assert.equal(a.store.getStatus('j_quad'), 0); assert.equal(a.store.getNote('j_quad'), '');
  assert.equal(a.store.getDisputed('j_quad'), 0); assert.equal(db.writes.length, 0); assert.deepEqual([...db.docs.values()], originals);
});
test('旧 sync_queue 保留为历史基线并幂等发送；不会升级成用户新编辑', async () => {
  const db = new Database();
  db.seed({ _id: 'old', notes: { j_quad: '已同步旧值' }, updatedAt: 10 });
  const disk = new Map([[KEY, { status: { j_quad: 0 }, notes: { j_quad: '' }, disputed: {} }], [QUEUE, 20]]);
  const a = device(db, { disk }); a.getPlans.push('fail');
  assert.equal(await a.sync.init(), false); assert.equal(a.pending()[0].kind, 'legacy');
  assert.equal(a.meta().legacy.queue, 20); assert.equal(a.disk.get(QUEUE), 20);
  assert.equal(await a.sync.init(), true); assert.equal(db.writes[0].data.kind, 'legacy');
  const b = device(db); await b.sync.pull(); assert.equal(b.store.getNote('j_quad'), ''); assert.equal(b.state().status.j_quad, 0);
  const restarted = device(db, { disk }); await restarted.sync.init(); assert.equal(db.writes.length, 1);
  assert.equal(restarted.meta().legacy.state.notes.j_quad, ''); assert.equal(disk.get(QUEUE), 20);
});
test('旧队列/旧客户端时间戳不能覆盖新协议字段；历史内容留在备份', async () => {
  const db = new Database(), b = device(db);
  b.store.setNote('j_quad', '新协议'); await b.sync.push();
  const disk = new Map([[KEY, { notes: { j_quad: '历史未发送', j_other: '保留' } }], [QUEUE, 8000000000000000]]);
  const a = device(db, { disk }); assert.equal(await a.sync.push(), true); await converge(b);
  assert.equal(a.store.getNote('j_quad'), '新协议'); assert.equal(b.store.getNote('j_other'), '保留');
  assert.equal(a.meta().legacy.state.notes.j_quad, '历史未发送');
  db.seed({ _id: 'late_old', notes: { j_quad: '旧客户端晚写' }, updatedAt: 8500000000000000 });
  await converge(a, b); assert.equal(a.store.getNote('j_quad'), '新协议');
});
test('旧格式无字段时间和缺失删除只作确定性迁移，不编造 tombstone', async () => {
  const db = new Database();
  db.seed({ _id: 'old_a', status: { j_quad: 2 }, disputed: { j_quad: 1 } });
  db.seed({ _id: 'old_b', status: { j_quad: 0 }, disputed: {} });
  const a = device(db), b = device(db); await converge(a, b);
  assert.deepEqual(a.state(), b.state()); assert.equal(a.state().status.j_quad, 0); assert.equal(a.state().disputed.j_quad, 1);
});

test('无旧 dirty 标记的本地记录也会迁移；已有云字段优先且重启不重发', async () => {
  const db = new Database();
  db.seed({ _id: 'old', notes: { j_quad: '云端已有' } });
  const disk = new Map([[KEY, { notes: { j_quad: '本地旧缓存', j_only: '离线记录' }, status: { j_only: 0 } }]]);
  const a = device(db, { disk });
  assert.equal(await a.sync.init(), true);
  assert.equal(db.writes.length, 1); assert.equal(db.writes[0].data.kind, 'legacy');
  assert.equal(db.writes[0].data.clock, 0); assert.equal(a.meta().legacy.queue, 0);
  const b = device(db); await b.sync.pull();
  assert.equal(b.store.getNote('j_quad'), '云端已有'); assert.equal(b.store.getNote('j_only'), '离线记录');
  assert.equal(b.state().status.j_only, 0); assert.equal(a.meta().legacy.state.notes.j_quad, '本地旧缓存');
  const restarted = device(db, { disk }); await restarted.sync.init(); assert.equal(db.writes.length, 1);
});
test('误用自定义 owner 规则时查询失败即停止，不当空库或更改权限', async () => {
  const db = new Database(), a = device(db, { rules: 'custom-owner' });
  a.store.setNote('j_quad', '保留待发送'); const before = a.pending();
  assert.equal(await a.sync.push(), false); assert.deepEqual(a.pending(), before); assert.equal(db.writes.length, 0);
});

// 输入验证、存储失败与隔离。
test('恶意原型键、坏 state/字段/元数据整份拒绝，不污染本地或原型', async () => {
  const candidates = [
    JSON.parse('{"_id":"bad","status":{"__proto__":{"polluted":true}}}'),
    { _id: 'bad', notes: { constructor: '恶意' } },
    { _id: 'bad', notes: { prototype: '恶意' } },
    { _id: 'bad', state: { status: { j_quad: 1 } } },
    { _id: 'bad', status: [] }, { _id: 'bad', status: { j_quad: 3 } },
    { _id: 'bad', notes: { j_quad: { text: '嵌套对象' } } },
    { _id: 'bad', notes: { j_quad: 'x'.repeat(16385) } },
    { _id: 'bad', disputed: { j_quad: true } },
    { _id: 'bad', status: { j_quad: 1 }, updatedAt: -1 },
    { _id: 'bad', status: { j_quad: 1 }, updatedAt: '999' },
    { _id: 'bad', protocol: 99, fields: {} },
    { _id: 'bad', protocol: 2, device: 'a'.repeat(32), seq: 1, clock: 1, kind: 'edit', fields: { status: { j_quad: 2 } } },
    { _id: 'p2_' + 'a'.repeat(32) + '_1', protocol: 2, device: 'a'.repeat(32), seq: 1, clock: Number.MAX_SAFE_INTEGER, kind: 'edit', fields: { status: { j_quad: 2 } } }
  ];
  for (const doc of candidates) {
    const db = new Database(), a = device(db); a.store.setNote('j_quad', '本地');
    const before = clone(a.disk.get(KEY)); db.seed(doc);
    assert.equal(await a.sync.pull(), false, JSON.stringify(doc).slice(0, 160));
    assert.deepEqual(a.disk.get(KEY), before); assert.equal(db.writes.length, 0);
  }
  assert.equal({}.polluted, undefined);
});
test('合法单文档的并集超限时拒绝落盘，原本地状态仍可读取', async () => {
  const db = new Database(), a = device(db); a.store.setStatus('j_quad', 1);
  const before = clone(a.disk.get(KEY));
  for (let i = 0; i < 14; i++) db.seed({ _id: 'large_' + i, notes: { ['j_n' + i]: 'x'.repeat(16000) } });
  assert.equal(await a.sync.pull(), false); assert.deepEqual(a.disk.get(KEY), before);
  assert.equal(a.store.getStatus('j_quad'), 1); assert.equal(a.pending().length, 1);
});
test('三设备多轮离线编辑、交错拉推与重启后收敛且停止重传', async () => {
  const db = new Database(); let devices = [device(db), device(db), device(db)];
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i]; d.store.setStatus('j_quad', (round + i) % 3);
      d.store.setNote('j_n' + i, '设备' + i + '轮次' + round);
      d.store.setDisputed('j_n' + i, round % 2);
    }
    const order = round % 2 ? [2, 0, 1] : [1, 2, 0];
    if (round === 2) { devices[0].setPlans.push('lost'); await devices[0].sync.push(); devices[0].sync.pause(); devices[0] = device(db, { disk: devices[0].disk }); }
    for (const i of order) assert.equal(await devices[i].sync.push(), true);
    await converge(...devices);
    assert.deepEqual(devices[0].state(), devices[1].state()); assert.deepEqual(devices[1].state(), devices[2].state());
  }
  const writes = db.writes.length;
  for (const d of devices) { assert.equal(d.pending().length, 0); await d.sync.init(); }
  assert.equal(db.writes.length, writes);
});
test('坏本地 state/元数据不被重置或误发；非法 setter/save 返回 false', async () => {
  const db = new Database(), a = device(db);
  assert.equal(a.store.setStatus('__proto__', 1), false); assert.equal(a.store.setDisputed('j_quad', '1'), false);
  assert.equal(a.store.setStatus('j_quad', -1), false); assert.equal(a.store.setNote('j_quad', {}), false);
  assert.equal(a.store.save(a.realm({ status: [] })), false);
  a.store.setStatus('j_quad', 1); const raw = a.disk.get(KEY); raw._sync.clock = -1;
  const before = clone(raw); assert.equal(a.store.setStatus('j_quad', 2), false); assert.equal(await a.sync.init(), false);
  assert.deepEqual(a.disk.get(KEY), before); assert.equal(db.writes.length, 0);
});
test('存储写入失败返回 false，不发通知、不丢旧值、不生成待发送操作', () => {
  const a = device(new Database()); a.store.setStatus('j_quad', 1); const before = clone(a.disk.get(KEY));
  let notices = 0; a.store.onChange(() => notices++); a.failWrite = true;
  assert.equal(a.store.setStatus('j_quad', 0), false); assert.equal(a.store.setNote('j_quad', ''), false);
  assert.equal(a.store.setDisputed('j_quad', 0), false);
  const state = a.store.load(); state.notes.j_quad = '新'; assert.equal(a.store.save(state), false);
  assert.equal(notices, 0); assert.deepEqual(a.disk.get(KEY), before);
});
test('初始化身份持久化失败、读取失败、远端合并落盘失败均不误报成功', async () => {
  const db = new Database(), a = device(db); a.failWrite = true;
  assert.equal(a.store.setStatus('j_quad', 1), false); assert.equal(await a.sync.init(), false); assert.equal(db.writes.length, 0);
  a.failWrite = false; a.store.load(); a.failRead = true; assert.equal(await a.sync.init(), false);
  a.failRead = false; db.seed({ _id: 'old', status: { j_quad: 2 } }); a.failWrite = true;
  assert.equal(await a.sync.pull(), false); assert.equal(a.store.getStatus('j_quad'), 0);
});
test('DB 桩按创建者隔离账号；设备 ID 不是读取授权', async () => {
  const db = new Database(), a = device(db, { owner: 'account-a' }), b = device(db, { owner: 'account-b' });
  a.store.setNote('j_quad', 'A私有'); await a.sync.push(); await b.sync.pull(); assert.equal(b.store.getNote('j_quad'), '');
  b.store.setNote('j_quad', 'B私有'); await b.sync.push(); await a.sync.pull(); assert.equal(a.store.getNote('j_quad'), 'A私有');
  // 本用例只证明桩的创建者约束下客户端行为，不声称验证了宿主跨账号 storage 隔离。
});

// 自动重试和页面可见性。
test('失败重试有上限；前台与网络恢复能重新拉取/推送', async () => {
  const db = new Database(), a = device(db); a.offline = true; a.start(); await flush();
  for (let i = 0; i < 3; i++) assert.equal(await a.next(), true);
  assert.equal(a.timers.size, 0); assert.equal(db.reads.length, 4);
  a.store.setStatus('j_quad', 1); a.app.onHide(); assert.equal(a.timers.size, 0);
  a.offline = false; a.app.onShow(); await flush(); assert.equal(a.pending().length, 0);
  a.offline = true; a.store.setNote('j_quad', '网络恢复'); await a.next();
  a.offline = false; a.network({ isConnected: true }); await flush(); assert.equal(a.pending().length, 0);
});
test('超过单批 50 操作有界续传，拉取通知不会造成回推循环', async () => {
  const db = new Database(), a = device(db);
  for (let i = 0; i < 53; i++) assert.equal(a.store.setStatus('j_quad', i % 3), true);
  assert.equal(await a.sync.push(), true); assert.equal(a.pending().length, 3);
  await a.next(); assert.equal(a.pending().length, 0); assert.equal(db.docs.size, 53); assert.equal(a.timers.size, 0);
});
test('所有进度页在远端合并后刷新；隐藏/卸载解除订阅', async () => {
  for (const name of ['lecture', 'graph', 'gaps', 'cards', 'lesson', 'locator', 'node']) {
    const db = new Database(), a = device(db), page = a.page(name, name === 'node' ? { id: 'j_quad' } : {});
    page.onShow(); let renders = 0; const original = page.setData;
    page.setData = function (patch, cb) { renders++; original.call(this, patch, cb); };
    db.seed({ _id: 'old', status: { j_quad: 1 }, updatedAt: 1 }); assert.equal(await a.sync.pull(), true);
    assert.ok(renders > 0, name + ' 未刷新'); page.onHide(); renders = 0;
    db.seed({ _id: 'old', status: { j_quad: 2 }, updatedAt: 2 }); await a.sync.pull(); assert.equal(renders, 0, name + ' 隐藏后仍刷新');
    page.onShow(); page.onShow(); page.onUnload(); renders = 0;
    db.seed({ _id: 'old', status: { j_quad: 0 }, updatedAt: 3 }); await a.sync.pull(); assert.equal(renders, 0, name + ' 重复订阅泄漏');
  }
});
test('节点笔记草稿不被远端刷新覆盖；保存后按观察到的版本继续编辑', async () => {
  const db = new Database(), a = device(db), page = a.page('node', { id: 'j_quad' }); page.onShow();
  page.data.editingNote = true; page.data.note = '未保存草稿';
  db.seed({ _id: 'old', notes: { j_quad: '远端笔记' }, status: { j_quad: 2 }, updatedAt: 1 }); await a.sync.pull();
  assert.equal(page.data.note, '未保存草稿'); assert.equal(page.data.status, 2);
  assert.equal(a.store.getNote('j_quad'), '远端笔记'); page.saveNote(); assert.equal(a.store.getNote('j_quad'), '未保存草稿');
});
test('取消笔记编辑恢复已存笔记和空值，不新增待发送操作', () => {
  for (const saved of ['原笔记', '']) {
    const a = device(new Database()); a.store.setNote('j_quad', saved);
    const page = a.page('node', { id: 'j_quad' }); page.onShow();
    const before = clone(a.pending());
    page.toggleNote(); page.onNoteInput({ detail: { value: '未保存草稿' } });
    page.toggleNote();
    assert.equal(page.data.editingNote, false); assert.equal(page.data.note, saved);
    assert.equal(a.store.getNote('j_quad'), saved); assert.deepEqual(a.pending(), before);
    page.toggleNote(); assert.equal(page.data.note, saved);
    page.onUnload();
  }
});
test('编辑期间远端笔记更新后取消，显示最新已存版本而非旧草稿', async () => {
  const db = new Database(), a = device(db), b = device(db);
  a.store.setNote('j_quad', '原笔记'); await a.sync.push(); await b.sync.pull();
  const page = a.page('node', { id: 'j_quad' }); page.onShow(); page.toggleNote();
  page.onNoteInput({ detail: { value: '本地未保存草稿' } });
  b.store.setNote('j_quad', '远端新笔记'); await b.sync.push(); await a.sync.pull();
  assert.equal(page.data.note, '本地未保存草稿'); const before = clone(a.pending());
  page.toggleNote(); assert.equal(page.data.note, '远端新笔记');
  assert.equal(page.data.editingNote, false); assert.deepEqual(a.pending(), before);
  page.onUnload();
});
test('页面保存失败不显示成功、不篡改状态，笔记草稿继续保留', () => {
  const a = device(new Database()); a.store.setStatus('j_quad', 1);
  const node = a.page('node', { id: 'j_quad' }); node.onShow();
  node.data.editingNote = true; node.data.note = '草稿';
  a.failWrite = true; node.saveNote();
  assert.equal(node.data.editingNote, true); assert.equal(node.data.note, '草稿');
  assert.match(a.toasts.at(-1).title, /失败/); selectStatus(a, node, 'j_quad', 2);
  assert.equal(node.data.status, 1); assert.match(a.toasts.at(-1).title, /失败/);
  const graph = a.page('graph'); graph.onShow();
  selectStatus(a, graph, 'j_quad', 2);
  assert.match(a.toasts.at(-1).title, /失败/); assert.equal(a.store.getStatus('j_quad'), 1);
  a.failWrite = false;
  const group = a.require('data/lectures').LECTURES[0];
  const lesson = a.page('lesson', { id: group.id }); lesson.onShow();
  const id = lesson.data.points[0].nodeId, event = { currentTarget: { dataset: { id } } };
  const before = clone(lesson.data.points); a.failWrite = true;
  selectStatus(a, lesson, id, 1); assert.deepEqual(clone(lesson.data.points), before);
  lesson.toggleDisputed(event); assert.deepEqual(clone(lesson.data.points), before);
  const state = a.state(); lesson.markWholeDone(); assert.deepEqual(a.state(), state);
  assert.match(a.toasts.at(-1).title, /失败/);
  a.failWrite = false; const pending = a.pending().length; lesson.markWholeDone();
  assert.equal(a.pending().length, pending + 1);
  assert.ok(lesson.data.points.every(p => a.store.getStatus(p.nodeId) === 2));
});
test('后台网络恢复不擅自启动同步，回前台再恢复', async () => {
  const db = new Database(), a = device(db); a.start(); await flush(); a.app.onHide();
  const reads = db.reads.length; a.network({ isConnected: true }); await flush();
  assert.equal(db.reads.length, reads); a.app.onShow(); await flush(); assert.ok(db.reads.length > reads);
});
test('回调异常不阻断其他回调或遗留发送锁', async () => {
  const db = new Database(), a = device(db); a.store.setStatus('j_quad', 1);
  let notified = 0;
  await Promise.all([a.sync.push(() => { throw new Error('测试回调'); }), a.sync.push(() => notified++)]);
  assert.equal(notified, 1); a.store.setNote('j_quad', '继续'); assert.equal(await a.sync.push(), true);
});

// R33/R34：保留行为防线，按 RUL-012 验证精简文案；执行真实页面及公共模块，不访问真实云。
for (const name of ['node', 'lesson', 'graph']) {
  test(name + ' 任意选择三态，菜单标当前记录，成功才反馈', () => {
    const d = device(new Database()), { page, id } = statusPage(d, name);
    const calls = watchStatusWrites(d);
    for (const value of [2, 0, 1, 0, 2, 1]) {
      const current = d.store.getStatus(id), menu = openStatus(d, page, id);
      assert.equal(menu.itemList.length, 3);
      ['未开始', '学习中', '已掌握'].forEach((label, i) => {
        assert.ok(menu.itemList[i].includes(label));
        assert.equal(menu.itemList[i], label + (i === current ? '（当前）' : ''), 'RUL-012 精简标识但仍只标注当前已存状态');
      });
      const pending = d.pending().length, count = calls.length;
      menu.success({ tapIndex: value }); if (menu.complete) menu.complete();
      assert.equal(calls.length, count + 1); assert.equal(d.pending().length, pending + 1);
      assert.equal(d.store.getStatus(id), value); assert.equal(displayedStatus(page, name, id), value);
      assert.match(d.toasts.at(-1).title, /^已标记/);
    }
  });
  test(name + ' 取消、同值、非法返回不调 setter、不落盘、不假成功', () => {
    const d = device(new Database()), { page, id } = statusPage(d, name);
    const calls = watchStatusWrites(d), before = clone(d.disk.get(KEY)), writes = d.storageWrites;
    const cancelled = openStatus(d, page, id);
    cancelled.fail({ errMsg: 'showActionSheet:fail cancel' }); if (cancelled.complete) cancelled.complete();
    const results = [undefined, null, {}, { tapIndex: -1 }, { tapIndex: 3 }, { tapIndex: 0.5 },
      { tapIndex: '2' }, { tapIndex: null }, { tapIndex: true }, { tapIndex: NaN }, { tapIndex: Infinity }, { tapIndex: 0 }];
    for (const result of results) {
      const menu = openStatus(d, page, id); menu.success(result); if (menu.complete) menu.complete();
    }
    assert.equal(calls.length, 0); assert.equal(d.storageWrites, writes);
    assert.deepEqual(d.disk.get(KEY), before); assert.equal(d.pending().length, 0); assert.equal(d.toasts.length, 0);
  });
  test(name + ' 保存失败保持最新记录，允许重试且无成功反馈', () => {
    const d = device(new Database()), { page, id } = statusPage(d, name);
    d.store.setStatus(id, 1); page.onShow(); const before = clone(d.disk.get(KEY)), pending = d.pending();
    d.failWrite = true; selectStatus(d, page, id, 2);
    assert.equal(d.store.getStatus(id), 1); assert.equal(displayedStatus(page, name, id), 1);
    assert.deepEqual(d.disk.get(KEY), before); assert.deepEqual(d.pending(), pending);
    assert.equal(d.toasts.length, 1); assert.match(d.toasts[0].title, /失败/);
    d.failWrite = false; selectStatus(d, page, id, 2); assert.equal(d.store.getStatus(id), 2);
  });
  test(name + ' 菜单打开后远端更新，按最新 store 比较而非旧快照', async () => {
    const db = new Database(), d = device(db), { page, id } = statusPage(d, name);
    const calls = watchStatusWrites(d), first = openStatus(d, page, id);
    db.seed({ _id: 'old', status: { [id]: 2 }, updatedAt: 1 }); await d.sync.pull();
    const writes = d.storageWrites;
    first.success({ tapIndex: 2 }); if (first.complete) first.complete();
    assert.equal(calls.length, 0); assert.equal(d.storageWrites, writes); assert.equal(d.pending().length, 0);
    assert.equal(displayedStatus(page, name, id), 2); assert.equal(d.toasts.length, 0);
    const second = openStatus(d, page, id);
    db.seed({ _id: 'old', status: { [id]: 1 }, updatedAt: 2 }); await d.sync.pull();
    second.success({ tapIndex: 2 }); if (second.complete) second.complete();
    assert.equal(calls.length, 1); assert.equal(d.store.getStatus(id), 2); assert.equal(d.pending().length, 1);
  });
  test(name + ' 防重复菜单、隐藏或卸载后迟到回调，旧完成不清新菜单', () => {
    const d = device(new Database()), { page, id } = statusPage(d, name), calls = watchStatusWrites(d);
    const old = openStatus(d, page, id);
    page.chooseStatus(eventFor({ id })); assert.equal(d.menus.length, 1);
    page.onHide(); old.success({ tapIndex: 2 });
    assert.equal(calls.length, 0); page.chooseStatus(eventFor({ id })); assert.equal(d.menus.length, 1);
    page.onShow(); const fresh = openStatus(d, page, id);
    old.success({ tapIndex: 1 }); if (old.complete) old.complete();
    page.chooseStatus(eventFor({ id })); assert.equal(d.menus.length, 2);
    fresh.success({ tapIndex: 2 }); fresh.success({ tapIndex: 1 }); if (fresh.complete) fresh.complete();
    assert.equal(calls.length, 1); assert.equal(d.store.getStatus(id), 2);
    const last = openStatus(d, page, id); page.onUnload(); last.success({ tapIndex: 0 });
    assert.equal(calls.length, 1); assert.equal(d.store.getStatus(id), 2);
  });
}

test('lesson 批量确认取消及迟到回调无写入，确认后仅一次原子保存且措辞为标记', () => {
  const d = device(new Database()), { page } = statusPage(d, 'lesson'); d.holdModal = true;
  let saves = 0; const save = d.store.save; d.store.save = state => { saves++; return save(state); };
  page.markWholeDone(); const cancelled = d.modals.at(-1);
  assert.equal(cancelled.title, '全部标为已掌握？');
  assert.equal(cancelled.content, '将修改这 ' + page.data.total + ' 个知识点的记录。', '批量确认仍说明修改范围，不认证掌握');
  cancelled.success({ confirm: false });
  assert.equal(saves, 0); assert.equal(d.pending().length, 0);
  page.markWholeDone(); const old = d.modals.at(-1); page.markWholeDone(); assert.equal(d.modals.length, 2);
  page.onHide(); old.success({ confirm: true }); assert.equal(saves, 0);
  page.onShow(); page.markWholeDone(); const active = d.modals.at(-1);
  old.success({ confirm: true }); if (old.complete) old.complete();
  active.success({ confirm: true }); active.success({ confirm: true });
  assert.equal(saves, 1); assert.equal(d.pending().length, 1);
  assert.ok(page.data.points.every(p => p.status === 2)); assert.match(d.toasts.at(-1).title, /^已标记/);
  page.markWholeDone(); const unloaded = d.modals.at(-1); page.onUnload(); unloaded.success({ confirm: true });
  assert.equal(saves, 1);
});

test('graph 两视图正文详情与独立 catchtap 状态入口分离，状态显示文字', () => {
  const d = device(new Database()), { page, id } = statusPage(d, 'graph');
  const calls = watchStatusWrites(d);
  page.goNode(eventFor({ id })); assert.equal(d.navigation.length, 1); assert.equal(d.menus.length, 0);
  assert.equal(calls.length, 0);
  const node = d.performNavigation();
  assert.equal(node.data.node.id, id); assert.equal(page._reading.active, false);
  assert.equal(node.data.readingCanBack, true); assert.equal(d.nativeBack(), page);
  assert.equal(page._reading.active, true); assert.equal(calls.length, 0);
  selectStatus(d, page, id, 2); assert.equal(d.navigation.length, 1);
  for (const topics of [page.data.domains.flatMap(x => x.modules.flatMap(m => m.topics)), page.data.themes.flatMap(t => t.topics)]) {
    const topic = topics.find(t => t.id === id); assert.equal(topic.statusName, '已掌握');
  }
  const template = fs.readFileSync(path.join(ROOT, 'pages/graph/graph.wxml'), 'utf8');
  assert.match(template, /^<view class="page tab-page"/); assert.doesNotMatch(template, /bindlongpress|cycleStatus/);
  const controls = template.match(/<[^>]*class="status-control[^>]*>/g) || [];
  assert.equal(controls.length, 2);
  controls.forEach(control => { assert.match(control, /catchtap="chooseStatus"/); assert.match(control, /data-id="\{\{t.id\}\}"/); });
  assert.equal((template.match(/\{\{t.statusName\}\}/g) || []).length, 2);
  assert.equal((template.match(/bindtap="goNode" data-id="\{\{t.id\}\}"/g) || []).length, 2);
});

test('node 提示与解答默认隐藏、各自切换且不写存储或同步', () => {
  const d = device(new Database()), page = d.page('node', { id: 'j_quad' }); page.onShow();
  const idx = page.data.card.examples.findIndex(ex => ex.hint), event = eventFor({ idx });
  assert.ok(idx >= 0); assert.deepEqual(clone(page.data.hintFoldState), {}); assert.deepEqual(clone(page.data.foldState), {});
  const before = clone(d.disk.get(KEY)), writes = d.storageWrites;
  page.toggleHint(event); assert.equal(page.data.hintFoldState[idx], true); assert.ok(!page.data.foldState[idx]);
  page.toggleFold(event); assert.equal(page.data.foldState[idx], true); assert.equal(page.data.hintFoldState[idx], true);
  page.toggleHint(event); assert.equal(page.data.hintFoldState[idx], false); assert.equal(page.data.foldState[idx], true);
  page.toggleFold(event); assert.equal(page.data.foldState[idx], false); assert.equal(page.data.hintFoldState[idx], false);
  page.toggleFold(event); assert.equal(page.data.foldState[idx], true); assert.equal(page.data.hintFoldState[idx], false);
  assert.deepEqual(d.disk.get(KEY), before); assert.equal(d.storageWrites, writes); assert.equal(d.pending().length, 0);
  const template = fs.readFileSync(path.join(ROOT, 'pages/node/node.wxml'), 'utf8');
  assert.match(template, /wx:if="\{\{ex.hasHint\}\}"[^>]*class="fold hint-fold"[^>]*bindtap="toggleHint"/);
  assert.match(template, /wx:if="\{\{ex.hasHint && hintFoldState\[index\]\}\}"/);
  assert.doesNotMatch(template.split('wx:if="{{foldState[index]}}"')[1].split('<!-- 关系网络 -->')[0], /ex\.hint|hintFoldState/);
});

test('node 无提示不显示入口，坏索引不污染折叠状态，字符串整数索引可用', () => {
  const d = device(new Database()), cards = d.require('data/cards').CARDS;
  const original = clone(cards.j_quad.examples[0]);
  cards.j_quad.examples = ['', undefined, null, '   ', {}, '实际提示'].map(hint => Object.assign({}, original, { hint }));
  const page = d.page('node', { id: 'j_quad' }), before = clone(d.disk.get(KEY)), writes = d.storageWrites;
  for (let idx = 0; idx < 5; idx++) {
    assert.equal(page.data.card.examples[idx].hasHint, false); page.toggleHint(eventFor({ idx }));
  }
  assert.equal(page.data.card.examples[5].hasHint, true);
  for (const idx of [-1, 6, 0.5, '', null, undefined, NaN, Infinity, '0.foo', '__proto__', '01', '1e0', {}, true]) {
    page.toggleFold(eventFor({ idx })); page.toggleHint(eventFor({ idx }));
  }
  page.toggleFold({}); page.toggleHint();
  assert.deepEqual(clone(page.data.foldState), {}); assert.deepEqual(clone(page.data.hintFoldState), {});
  page.toggleHint(eventFor({ idx: '5' })); page.toggleFold(eventFor({ idx: '5' }));
  assert.equal(page.data.hintFoldState[5], true); assert.equal(page.data.foldState[5], true);
  assert.deepEqual(d.disk.get(KEY), before); assert.equal(d.storageWrites, writes);
});

function expectedKinds(card, tab) {
  const items = tab === 'concept' ? [card.concept] : tab === 'explain' ? card.explain : card.examples;
  const kinds = new Set();
  for (const item of items) for (const origin of (item.origins || []).concat(item.origin || [])) {
    const match = /^reliable-data\/(nodes|lessons|pitfalls|examples)\//.exec(origin.path);
    if (match) kinds.add(match[1]);
  }
  return [...kinds].sort();
}
function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); Object.values(value).forEach(freezeData);
  }
  return value;
}
test('node 全67节点四学段实际页签按真源卡类显示审核，来源折叠只读', () => {
  const d = device(new Database()), nodes = d.require('data/nodes').ALL_NODES;
  const cards = d.require('data/cards').CARDS, meta = d.require('data/content_meta');
  assert.equal(nodes.length, 67); assert.equal(new Set(nodes.map(n => n.domain)).size, 4);
  freezeData(cards); freezeData(meta.NODE_META);
  for (const node of nodes) {
    const page = d.page('node', { id: node.id }), data = meta.metaFor(node.id, node.domain);
    const writes = d.storageWrites, before = clone(d.disk.get(KEY));
    assert.equal(page.data.sourceExpanded, false);
    for (const tab of ['concept', 'explain', 'example']) {
      page.switchTab(eventFor({ tab })); const summary = page.data.sourceSummary;
      assert.deepEqual(clone(summary.cards.map(row => row.kind).sort()), expectedKinds(cards[node.id], tab), node.id + '/' + tab);
      for (const row of summary.cards) {
        assert.equal(row.review, data.cards[row.kind].review); assert.equal(row.reviewLabel, meta.REVIEW_LABEL[data.cards[row.kind].review]);
      }
      assert.equal(summary.scopeCount, data.sources.filter(s => s.purpose === 'scope').length);
      assert.equal(summary.checkedScopeCount, data.sources.filter(s => s.purpose === 'scope' && s.verification === 'section_checked').length);
      assert.equal(summary.gapCount, data.gaps.length); assert.equal(summary.source, data.source);
      assert.match(summary.boundary, /范围定位不等于内容已核/);
      assert.match(summary.boundary, /审核状态取自真源登记/, '来源定位不能充当审核或运行时自动核准');
      page.toggleSource(); assert.equal(page.data.sourceExpanded, true);
      page.toggleSource(); assert.equal(page.data.sourceExpanded, false);
    }
    assert.deepEqual(d.disk.get(KEY), before); assert.equal(d.storageWrites, writes);
  }
  assert.equal(d.pending().length, 0);
});
test('node 全67元数据故意设置不同卡类审核，组合卡不能沿用教案 review 或历史 note', () => {
  const d = device(new Database()), nodes = d.require('data/nodes').ALL_NODES;
  const cards = d.require('data/cards').CARDS, meta = d.require('data/content_meta'), original = meta.metaFor;
  const reviews = { nodes: 'checked', lessons: 'pending', pitfalls: 'disputed', examples: 'verified' };
  meta.metaFor = (id, domain) => {
    const value = clone(original(id, domain)); value.review = 'verified'; value.note = '历史 checked 名单，不是当前审核';
    for (const kind of Object.keys(reviews)) value.cards[kind].review = reviews[kind];
    return value;
  };
  for (const node of nodes) {
    const page = d.page('node', { id: node.id });
    for (const tab of ['concept', 'explain', 'example']) {
      page.switchTab(eventFor({ tab }));
      const rows = page.data.sourceSummary.cards;
      assert.deepEqual(clone(rows.map(row => row.kind).sort()), expectedKinds(cards[node.id], tab));
      for (const row of rows) { assert.equal(row.review, reviews[row.kind]); assert.equal(row.reviewLabel, meta.REVIEW_LABEL[reviews[row.kind]]); }
      assert.doesNotMatch(JSON.stringify(page.data.sourceSummary), /历史 checked/);
    }
  }
});
test('node 讲解按实际 origin 路径判定，跨卡类和缺失来源不按页签猜测', () => {
  const d = device(new Database()), cards = d.require('data/cards').CARDS, meta = d.require('data/content_meta');
  const concept = cards.j_quad.concept;
  cards.j_quad.explain = [{ title: '路径回归', body: '', points: [], origins: [concept.origins[0], cards.j_quad.examples[0].origin] }];
  const page = d.page('node', { id: 'j_quad' }); page.switchTab(eventFor({ tab: 'explain' }));
  assert.deepEqual(clone(page.data.sourceSummary.cards.map(row => row.kind).sort()), ['examples', 'nodes']);
  for (const row of page.data.sourceSummary.cards) assert.equal(row.reviewLabel, meta.REVIEW_LABEL[meta.metaFor('j_quad').cards[row.kind].review]);
  const previous = clone(page.data.sourceSummary); page.switchTab(eventFor({ tab: 'unknown' }));
  assert.equal(page.data.tab, 'explain'); assert.deepEqual(clone(page.data.sourceSummary), previous);
});
test('node 六个组织补充节点独立待核，九道补充例题不继承示范审核', () => {
  const d = device(new Database()), cards = d.require('data/cards').CARDS, meta = d.require('data/content_meta');
  const ids = Object.keys(cards).filter(id => cards[id].examples.some(ex => ex.origin.path.includes('/source/')));
  assert.equal(ids.length, 6); let examples = 0;
  const original = meta.metaFor;
  meta.metaFor = (id, domain) => {
    const result = clone(original(id, domain)); Object.values(result.cards).forEach(card => { card.review = 'verified'; }); return result;
  };
  for (const id of ids) {
    const before = JSON.stringify(cards[id]), page = d.page('node', { id });
    for (const tab of ['explain', 'example']) {
      page.switchTab(eventFor({ tab }));
      const items = page.data.card[tab === 'explain' ? 'explain' : 'examples'];
      const extras = items.filter(item => item.origin.path.includes('/source/'));
      assert.equal(page.data.sourceSummary.supplementalCount, extras.length);
      assert.equal(page.data.sourceSummary.supplementalLabel, '组织补充 · 独立待核');
      // 四卡被故意设为 verified，组织补充仍独立待核，不能借文案精简混入示范审核。
      assert.deepEqual(clone(page.data.sourceSummary.cards.map(row => row.kind).sort()), expectedKinds(cards[id], tab));
      assert.ok(page.data.sourceSummary.cards.every(row => row.review === 'verified'));
      for (const item of extras) {
        assert.equal(item.originNote, '组织补充 · 独立待核');
        assert.doesNotMatch(item.originNote, /verified|已核|通过/);
      }
      for (const item of items.filter(item => !item.origin.path.includes('/source/'))) assert.equal(item.originNote, '');
      if (tab === 'example') examples += extras.length;
    }
    assert.equal(JSON.stringify(cards[id]), before, '不能向生成卡片添加显示字段');
  }
  assert.equal(examples, 9);
  const template = fs.readFileSync(path.join(ROOT, 'pages/node/node.wxml'), 'utf8');
  assert.equal((template.match(/class="origin-note"/g) || []).length, 2);
  assert.equal((template.match(/>\{\{ex.originNote\}\}<\/text>/g) || []).length, 2);
});
test('来源摘要 scope 与 section_checked 双条件计数，不把目录或待核当作已核', () => {
  const d = device(new Database()), meta = d.require('data/content_meta'), original = meta.metaFor;
  meta.metaFor = id => Object.assign({}, original(id), {
    source: '已有来源摘要原文',
    sources: [
      { purpose: 'scope', verification: 'section_checked', locator: '正文范围' },
      { purpose: 'scope', verification: 'catalog_checked', locator: '仅目录' },
      { purpose: 'scope', verification: 'pending', locator: '待核' },
      { purpose: 'teaching', verification: 'section_checked', locator: '非范围' },
      { purpose: 'scope', verification: 'verified', locator: '不是 section_checked' }, null
    ], gaps: ['缺口甲', '缺口乙']
  });
  const page = d.page('node', { id: 'j_quad' }), summary = page.data.sourceSummary;
  assert.equal(summary.scopeCount, 4); assert.equal(summary.checkedScopeCount, 1); assert.equal(summary.gapCount, 2);
  assert.equal(summary.source, '已有来源摘要原文'); assert.equal(page.data.sourceExpanded, false);
  page.toggleSource(); assert.equal(page.data.sourceExpanded, true);
  const template = fs.readFileSync(path.join(ROOT, 'pages/node/node.wxml'), 'utf8');
  assert.match(template, /bindtap="toggleSource"/); assert.match(template, /wx:if="\{\{sourceExpanded\}\}"/);
  assert.match(template, /\{\{sourceSummary.source\}\}/); assert.match(template, /\{\{sourceSummary.boundary\}\}/);
});
test('来源缺失异常字段谨慎回退未提供，无默认 verified，不读取旧 note', () => {
  const d = device(new Database()), meta = d.require('data/content_meta');
  for (const value of [null, [], {}, { cards: null, sources: '异常', gaps: {}, source: 123, review: 'verified', note: 'checked' },
    { cards: { nodes: { review: 'constructor' }, lessons: { review: '' } }, sources: null, gaps: null, source: '   ' }]) {
    meta.metaFor = () => value;
    const page = d.page('node', { id: 'j_quad' }), summary = page.data.sourceSummary;
    assert.equal(summary.source, '未提供'); assert.equal(summary.scopeCount, null); assert.equal(summary.gapCount, null);
    assert.equal(summary.checkedScopeCount, null);
    assert.deepEqual(clone(summary.cards.map(row => row.reviewLabel)), ['未提供', '未提供']);
    assert.ok(summary.cards.every(row => row.review !== 'verified'));
  }
  meta.metaFor = () => { throw new Error('元数据不可用'); };
  const page = d.page('node', { id: 'j_quad' }); assert.equal(page.data.sourceSummary.source, '未提供');
  const cards = d.require('data/cards').CARDS; cards.j_quad = { concept: { origins: [null, { path: 'unknown' }] }, explain: null, examples: null };
  const missing = d.page('node', { id: 'j_quad' }); assert.equal(missing.data.sourceSummary.cards.length, 0);
  missing.switchTab(eventFor({ tab: 'example' })); missing.toggleHint(eventFor({ idx: 0 })); missing.toggleFold(eventFor({ idx: 0 }));
  assert.deepEqual(clone(missing.data.foldState), {}); assert.deepEqual(clone(missing.data.hintFoldState), {});
});

test('首页两个真实导航及阅读返回零 storage/outbox 写入，不保留旧建议状态或 handler', () => {
  const d = device(new Database()), page = d.page('lecture');
  d.require('app');
  page.onShow();
  const lectures = d.require('data/lectures').LECTURES;
  assert.equal(page.data.lectures.length, lectures.length);
  assert.equal(page.data.stat.total, d.require('data/nodes').ALL_NODES.length);
  const before = clone([...d.disk]), writes = d.storageWrites;
  assert.deepEqual(d.pending(), []);
  const mutations = [];
  for (const name of ['setStatus', 'setNote', 'setDisputed', 'save']) {
    const original = d.store[name];
    d.store[name] = function (...args) { mutations.push(name); return original.apply(this, args); };
  }
  page.goCards(); assert.equal(d.requests[0].kind, 'navigateTo');
  const cards = d.performNavigation();
  assert.equal(cards.route, 'pages/cards/cards'); assert.equal(cards.data.readingCanBack, true);
  assert.equal(cards.data.readingBackLabel, '返回讲解'); assert.equal(page._reading.active, false);
  cards.goReadingBack(); assert.equal(d.requests[0].kind, 'navigateBack');
  assert.equal(d.performNavigation(), page); assert.equal(page._reading.active, true);
  page.goLesson(eventFor({ id: lectures[0].id })); assert.equal(d.requests[0].kind, 'navigateTo');
  const lesson = d.performNavigation();
  assert.equal(lesson.data.id, lectures[0].id); assert.equal(lesson.data.readingCanBack, true);
  assert.equal(lesson.data.readingBackLabel, '返回讲解'); assert.equal(page._reading.active, false);
  lesson.goReadingBack(); assert.equal(d.requests[0].kind, 'navigateBack');
  assert.equal(d.performNavigation(), page); assert.equal(page._reading.active, true);
  assert.deepEqual(d.stack, [page]); assert.equal(page.data.readingCanBack, false); assert.equal(d.requests.length, 0);
  assert.deepEqual(d.navigation.map(args => args.url), ['/pages/cards/cards', '/pages/lesson/lesson?id=' + encodeURIComponent(lectures[0].id)]);
  assert.deepEqual([...d.disk], before); assert.equal(d.storageWrites, writes);
  assert.deepEqual(d.pending(), []); assert.deepEqual(mutations, []);
  const template = fs.readFileSync(path.join(ROOT, 'pages/lecture/lecture.wxml'), 'utf8');
  assert.match(template, /bindtap="goCards"/);
  assert.match(template, /bindtap="goLesson" data-id="\{\{item.id\}\}"/);
  assert.match(template, /已掌握\s*\{\{stat.done\}\}/);
  assert.match(template, /已掌握\s*\{\{item.done\}\}\/\{\{item.total\}\}/);
  assert.equal(page.data.stat.done, d.require('data/nodes').ALL_NODES.filter(node => d.store.getStatus(node.id) === 2).length);
  assert.doesNotMatch(template, /系统考核|掌握认证|已认证|认证通过/, 'RUL-012 删除冗长限定，不新增系统认证承诺');
  assert.doesNotMatch(template, /确认真懂|不存在.*还没学|class="principle/);
  assert.equal(Object.hasOwn(page.data, 'adviceExpanded'), false);
  assert.equal(typeof page.toggleAdvice, 'undefined');
  const source = fs.readFileSync(path.join(ROOT, 'pages/lecture/lecture.js'), 'utf8');
  const reading = fs.readFileSync(path.join(ROOT, 'utils/reading-context.js'), 'utf8');
  assert.doesNotMatch(source + template + reading, /adviceExpanded|toggleAdvice/);
  assert.match(reading, /\blecture:\s*\[\s*\]/, '首页不再保留建议区会话 UI 字段');
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    let timer;
    try {
      await Promise.race([Promise.resolve().then(item.run), new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('测试未收敛或回调未结束')), 5000);
      })]);
      passed++; console.log('OK   ' + item.name);
    } catch (error) { console.error('FAIL ' + item.name + '\n' + error.stack); }
    finally { clearTimeout(timer); }
  }
  console.log('RESULT=' + passed + '/' + tests.length + ' FAILED=' + (tests.length - passed));
  console.log('VERDICT=' + (passed === tests.length ? 'PASSED' : 'FAILED'));
  console.log('REAL_CLOUD=NOT_TESTED HOST_ACCOUNT_STORAGE_ISOLATION=NOT_TESTED');
  process.exitCode = passed === tests.length ? 0 : 1;
})();
