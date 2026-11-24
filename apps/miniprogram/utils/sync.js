// 进度同步层（可选增强）—— 本地优先，云端只同步几 KB 的进度。
//
// 设计约束：
//   1) 本地 store.js 仍是唯一状态源（SPEC-003）：所有读写先落本地，UI 不等网络。
//   2) 未配置或网络失败时静默降级为纯离线，绝不阻塞学习，也不弹错误吓孩子。
//   3) 数据隔离：以服务端签发的 userId 为键，只读写自己的进度。
//
// 服务端契约（见 deploy/server/README.md）：
//   POST {base}/api/login   { code }            -> { userId, token }
//   GET  {base}/api/progress                     -> { state, updatedAt }
//   PUT  {base}/api/progress { state, updatedAt} -> { ok, updatedAt }
//   Authorization: Bearer <token>

var cfg;
try {
  cfg = require('./runtime-config');
} catch (e) {
  cfg = {};
}
var store = require('./store');

var BASE = cfg.syncBaseUrl || '';
var ENABLED = !!cfg.syncEnabled && !!BASE;
var TIMEOUT = cfg.timeout || 8000;

var TOKEN_KEY = 'olympiad_sync_token_v1';
var QUEUE_KEY = 'olympiad_sync_queue_v1'; // 离线期间的待推送标记

function getToken() {
  try { return wx.getStorageSync(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
function setToken(t) {
  try { wx.setStorageSync(TOKEN_KEY, t || ''); } catch (e) {}
}
function getQueue() {
  try { return wx.getStorageSync(QUEUE_KEY) || 0; } catch (e) { return 0; }
}
function markDirty() {
  try { wx.setStorageSync(QUEUE_KEY, Date.now()); } catch (e) {}
}
function clearDirty() {
  try { wx.removeStorageSync(QUEUE_KEY); } catch (e) {}
}

// 统一请求封装：不抛错，失败返回 null，由调用方决定降级策略
function request(path, method, data, withToken, cb) {
  if (!ENABLED) { if (cb) cb(null); return; }
  var header = { 'content-type': 'application/json' };
  if (withToken) {
    var t = getToken();
    if (!t) { if (cb) cb(null); return; }
    header.Authorization = 'Bearer ' + t;
  }
  wx.request({
    url: BASE + path,
    method: method || 'GET',
    data: data,
    header: header,
    timeout: TIMEOUT,
    success: function (res) {
      if (res.statusCode >= 200 && res.statusCode < 300) { if (cb) cb(res.data); }
      else if (cb) cb(null);
    },
    fail: function () { if (cb) cb(null); }
  });
}

// 登录：wx.code -> 服务端换 userId/token。预览阶段无 AppID 时会被禁用。
function login(cb) {
  if (!ENABLED) { if (cb) cb(false); return; }
  wx.login({
    success: function (r) {
      if (!r.code) { if (cb) cb(false); return; }
      request('/api/login', 'POST', { code: r.code }, false, function (data) {
        if (data && data.token) { setToken(data.token); if (cb) cb(true); }
        else if (cb) cb(false);
      });
    },
    fail: function () { if (cb) cb(false); }
  });
}

// 拉取云端进度并合并到本地（本地优先：仅填补本地缺失的条目，不覆盖已有学习进度）
function pull(cb) {
  request('/api/progress', 'GET', null, true, function (data) {
    if (!data || !data.state) { if (cb) cb(false); return; }
    try {
      var local = store.load();
      var remote = data.state;
      var merged = false;
      ['status', 'notes', 'disputed'].forEach(function (k) {
        var rs = remote[k] || {};
        Object.keys(rs).forEach(function (id) {
          // 本地没有该 id 的学习记录时才采用云端值 —— 合并而非覆盖
          if (!local[k][id] && rs[id]) { local[k][id] = rs[id]; merged = true; }
        });
      });
      if (merged) store.save(local);
      if (cb) cb(true);
    } catch (e) { if (cb) cb(false); }
  });
}

// 推送本地进度到云端
function push(cb) {
  if (!ENABLED) { if (cb) cb(false); return; }
  request('/api/progress', 'PUT', { state: store.load() }, true, function (data) {
    if (data && data.ok) { clearDirty(); if (cb) cb(true); }
    else { markDirty(); if (cb) cb(false); }
  });
}

var timer = null;
// 防抖推送：内容变更后调用，避免每次点按都发请求
function schedulePush() {
  if (!ENABLED) return;
  markDirty();
  if (timer) clearTimeout(timer);
  timer = setTimeout(function () { timer = null; push(); }, 1500);
}

// 启动：登录 -> 拉取；有离线待推送则先推
function init(cb) {
  if (!ENABLED) { if (cb) cb(false); return; }
  login(function (ok) {
    if (!ok) { if (cb) cb(false); return; }
    if (getQueue()) push(function () { pull(cb); });
    else pull(cb);
  });
}

module.exports = {
  isEnabled: function () { return ENABLED; },
  init: init,
  login: login,
  pull: pull,
  push: push,
  schedulePush: schedulePush
};
