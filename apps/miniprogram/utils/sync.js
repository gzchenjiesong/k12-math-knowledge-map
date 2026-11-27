// 沿用 progress 集合及基础权限「仅创建者可读写」，不部署新服务。
// 每个安装的每次操作有持久的独立 ID。只重试相同内容，不覆盖共享快照，
// 即使超时请求在重启后才落库，也不能覆盖更新的操作。设备 ID 绝不是授权凭证。
const config = require('./cloud-config');
const store = require('./store');
const protocol = require('./sync-state');
const ENV = config.env || '';
const COLLECTION = config.collection || 'progress';
const PAGE_SIZE = 20;
const MAX_PAGES = 5000;
const BATCH_SIZE = 50;
const REQUEST_TIMEOUT = 30000;
const RETRIES = [3000, 10000, 30000];
let pulling = null, pushing = null, timer = null, retry = 0, active = true;

function getDb() {
  if (!ENV || !wx.cloud) return null;
  try { return wx.cloud.database({ env: ENV }); } catch (e) { return null; }
}
function request(invoke) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => settle(false), REQUEST_TIMEOUT);
    function settle(ok, result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (ok) resolve(result); else reject(new Error('同步请求失败'));
    }
    try { invoke({ success: res => settle(true, res), fail: () => settle(false) }); }
    catch (e) { settle(false); }
  });
}
function withCallback(promise, cb) {
  if (typeof cb === 'function') promise.then(ok => { try { cb(ok); } catch (e) {} });
  return promise;
}
async function fetchAll() {
  const db = getDb();
  if (!db || store.pending() === null) return false;
  let cursor = '', merged = protocol.empty();
  for (let page = 0; page < MAX_PAGES; page++) {
    // 仅支持基础权限「仅创建者可读写」：服务端自动加当前用户 _openid 约束。
    // 不混用自定义安全规则的 {openid} 占位符；该规则下 doc.set 也不适用。
    // 用稳定 _id 游标而不是 limit(1)/偏移翻页；扫描不是快照，新插入的较小 ID 下轮补齐。
    const where = {};
    if (cursor) where._id = db.command.gt(cursor);
    const res = await request(callbacks => db.collection(COLLECTION).where(where)
      .orderBy('_id', 'asc').limit(PAGE_SIZE).get(callbacks));
    if (!res || !Array.isArray(res.data) || res.data.length > PAGE_SIZE) return false;
    for (const doc of res.data) {
      if (!doc || !protocol.documentId(doc._id) || doc._id <= cursor) return false;
      merged = protocol.merge(merged, protocol.fromDocument(doc));
      cursor = doc._id;
    }
    if (res.data.length < PAGE_SIZE) return store.mergeRemote(merged);
  }
  return false; // 防异常分页/持续写入导致无限循环；不提交半份拉取结果。
}
function pull(cb) {
  if (!pulling) {
    pulling = Promise.resolve().then(fetchAll).catch(() => false).then(ok => {
      pulling = null;
      return ok;
    });
  }
  return withCallback(pulling, cb);
}
function clearTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}
function later(delay) {
  if (!active || !ENV || !wx.cloud) return;
  clearTimer();
  timer = setTimeout(() => { timer = null; push(); }, delay);
}
async function sendBatch() {
  // 读取/权限失败绝不当成空库；全部旧文档只读合并，不 add、update 或删除旧记录。
  if (!await pull()) return false;
  const db = getDb(), pending = store.pending();
  if (!db || pending === null) return false;
  const batch = pending.slice(0, BATCH_SIZE);
  for (const op of batch) {
    const res = await request(callbacks => db.collection(COLLECTION).doc(protocol.opId(op)).set({
      data: op, success: callbacks.success, fail: callbacks.fail
    }));
    if (!res || !res.stats || (res.stats.created !== 1 && res.stats.updated !== 1)) return false;
    if (!store.acknowledge(op)) return false;
  }
  return true;
}
function push(cb) {
  if (!pushing) {
    clearTimer();
    pushing = Promise.resolve().then(sendBatch).catch(() => false).then(ok => {
      pushing = null;
      if (ok) {
        retry = 0;
        const remaining = store.pending();
        if (remaining && remaining.length) later(1500);
      } else if (retry < RETRIES.length) {
        later(RETRIES[retry++]);
      }
      return ok;
    });
  }
  return withCallback(pushing, cb);
}
function schedulePush() {
  retry = 0;
  later(1500);
}
function resume(cb) {
  active = true;
  retry = 0;
  return push(cb);
}
function pause() {
  active = false;
  clearTimer();
}
module.exports = {
  isEnabled: () => !!ENV && !!wx.cloud,
  // 仅表示 SDK 可用，并非已验明账号或权限；真正结果以数据库请求为准。
  login: cb => { if (typeof cb === 'function') cb(!!getDb()); },
  init: resume, resume, pause, pull, push, schedulePush
};
