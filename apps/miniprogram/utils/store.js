// 本地存储层：掌握状态 + 用户自建卡片（后续可平滑切换到云数据层）
const KEY = 'olympiad_cards_state_v1';

function load() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (raw && typeof raw === 'object') {
      if (!raw.status) raw.status = {};
      if (!raw.notes) raw.notes = {};
      if (!raw.disputed) raw.disputed = {};
      return raw;
    }
  } catch (e) {}
  return { status: {}, notes: {}, disputed: {} };
}

function save(state) {
  try {
    wx.setStorageSync(KEY, state);
    return true;
  } catch (e) {
    return false;
  }
}

function getStatus(id) {
  return load().status[id] || 0; // 0未开始 1学习中 2已掌握
}

function setStatus(id, value) {
  const s = load();
  s.status[id] = value;
  return save(s);
}

function getNote(id) {
  return load().notes[id] || '';
}

function setNote(id, text) {
  const s = load();
  s.notes[id] = text;
  return save(s);
}

// 内容存疑标记（RUL-008 人工复核闸门）：0/未标记=无存疑，1=用户标记存疑
function getDisputed(id) {
  return load().disputed[id] || 0;
}

function setDisputed(id, value) {
  const s = load();
  if (value) s.disputed[id] = 1;
  else delete s.disputed[id];
  return save(s);
}

function stats(allNodes) {
  const s = load();
  let done = 0, learning = 0;
  allNodes.forEach(function (n) {
    const v = s.status[n.id] || 0;
    if (v === 2) done++;
    else if (v === 1) learning++;
  });
  return {
    total: allNodes.length,
    done: done,
    learning: learning,
    todo: allNodes.length - done - learning,
    percent: allNodes.length ? Math.round(done * 100 / allNodes.length) : 0
  };
}

module.exports = {
  load: load,
  save: save,
  getStatus: getStatus,
  setStatus: setStatus,
  getNote: getNote,
  setNote: setNote,
  getDisputed: getDisputed,
  setDisputed: setDisputed,
  stats: stats
};
