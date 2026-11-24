// 进度同步层（微信云开发）—— 本地优先，云端只同步几 KB 的进度。
//
// 设计约束：
//   1) 本地 store.js 仍是唯一状态源（SPEC-003）：所有读写先落本地，UI 不等网络。
//   2) 未初始化或网络失败时静默降级为纯离线，绝不阻塞学习，也不弹错误吓孩子。
//   3) 数据隔离：集合 progress 权限设为「仅创建者可读写」，微信云开发按 _openid
//      自动隔离，前端既不拿也不存 openid，只读写自己的那一条文档。
//   4) 单用户单文档：一条文档存全量 state（status/notes/disputed），量级几 KB。
//
// 云端结构（集合 progress）：
//   { _id, _openid, status:{}, notes:{}, disputed:{}, updatedAt:Number }

var config;
try {
  config = require('./cloud-config');
} catch (e) {
  config = {};
}
var store = require('./store');

var ENV = config.env || '';
var COLLECTION = config.collection || 'progress';
var ENABLED = !!ENV;

var DOCID_KEY = 'olympiad_cloud_docid_v1';
var QUEUE_KEY = 'olympiad_sync_queue_v1'; // 离线期间的待推送标记

function getDb() {
  if (!ENABLED || !wx.cloud) return null;
  try { return wx.cloud.database({ env: ENV }); } catch (e) { return null; }
}

function getDocId() {
  try { return wx.getStorageSync(DOCID_KEY) || ''; } catch (e) { return ''; }
}
function setDocId(id) {
  try { wx.setStorageSync(DOCID_KEY, id || ''); } catch (e) {}
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

// 拉取云端进度并合并到本地（本地优先：仅填补本地缺失的条目，不覆盖已有学习进度）
function pull(cb) {
  var db = getDb();
  if (!db) { if (cb) cb(false); return; }
  db.collection(COLLECTION).limit(1).get({
    success: function (res) {
      var doc = res && res.data && res.data[0];
      if (doc) {
        if (doc._id) setDocId(doc._id);
        try {
          var local = store.load();
          var merged = false;
          ['status', 'notes', 'disputed'].forEach(function (k) {
            var rs = doc[k] || {};
            Object.keys(rs).forEach(function (id) {
              // 本地没有该 id 的记录时才采用云端值 —— 合并而非覆盖
              if (!local[k][id] && rs[id]) { local[k][id] = rs[id]; merged = true; }
            });
          });
          if (merged) store.save(local);
        } catch (e) {}
      }
      if (cb) cb(true);
    },
    fail: function () { if (cb) cb(false); }
  });
}

// 推送本地全量进度到云端：有文档 id 则 update，否则 add（add 后记下 id 供后续复用）
function push(cb) {
  var db = getDb();
  if (!db) { if (cb) cb(false); return; }
  var s = store.load();
  var payload = {
    status: s.status || {},
    notes: s.notes || {},
    disputed: s.disputed || {},
    updatedAt: Date.now()
  };
  function settle(ok) {
    if (ok) clearDirty(); else markDirty();
    if (cb) cb(ok);
  }
  var docId = getDocId();
  if (docId) {
    db.collection(COLLECTION).doc(docId).update({
      data: payload,
      success: function () { settle(true); },
      fail: function () { settle(false); }
    });
  } else {
    db.collection(COLLECTION).add({
      data: payload,
      success: function (res) { if (res && res._id) setDocId(res._id); settle(true); },
      fail: function () { settle(false); }
    });
  }
}

var timer = null;
// 防抖推送：内容变更后调用，避免每次点按都发请求
function schedulePush() {
  if (!ENABLED) return;
  markDirty();
  if (timer) clearTimeout(timer);
  timer = setTimeout(function () { timer = null; push(); }, 1500);
}

// 云开发无需 wx.login 换 token，openid 由云数据库按 _openid 自动注入。
// 保留 login 接口以兼容既有调用方：就绪即视为已登录。
function login(cb) {
  if (cb) cb(!!getDb());
}

// 启动：先拉取合并；有离线待推送则再推一次（本地全量覆盖，幂等）
function init(cb) {
  if (!ENABLED) { if (cb) cb(false); return; }
  pull(function () {
    if (getQueue()) push(function (ok) { if (cb) cb(ok); });
    else if (cb) cb(true);
  });
}

module.exports = {
  isEnabled: function () { return ENABLED && !!wx.cloud; },
  init: init,
  login: login,
  pull: pull,
  push: push,
  schedulePush: schedulePush
};
