// 草稿仅在本次运行会话保留；不调用 store、storage 或同步接口。
const LIMIT = 20;
const drafts = new Map();

function entity(page) { return page.data.node && page.data.node.id; }
function dirty(page) {
  return !!(entity(page) && page.data.editingNote &&
    typeof page.readingSavedNote === 'function' && page.data.note !== page.readingSavedNote());
}
function remember(page) {
  const state = page._reading;
  if (!state || !dirty(page) || state.discardDraft === page.data.note) return;
  drafts.delete(state.id);
  drafts.set(state.id, { entity: entity(page), text: page.data.note });
  while (drafts.size > LIMIT) drafts.delete(drafts.keys().next().value);
}
function restore(page, exact) {
  const state = page._reading;
  if (!state || !entity(page)) return;
  let key = state.id;
  if (!drafts.has(key) && !exact) {
    // 只有已卸载的实例才会进入草稿池，同节点的仍存活实例不共享草稿。
    key = Array.from(drafts.keys()).reverse().find(id => drafts.get(id).entity === entity(page));
  }
  const saved = drafts.get(key);
  if (!saved || saved.entity !== entity(page)) return;
  drafts.delete(key);
  page.setData({ note: saved.text, editingNote: true, noteDraftRestored: true });
}
function clear(page) {
  if (page._reading) {
    drafts.delete(page._reading.id);
    page._reading.discardDraft = null;
  }
  if (page._reading && page._reading.active) page.setData({ noteDraftRestored: false });
}
function leave(page, action) {
  const state = page && page._reading;
  if (!state || !state.active || state.leavePrompt) return false;
  if (!dirty(page)) { action(function () {}); return true; }
  const token = {};
  const epoch = state.epoch;
  const text = page.data.note;
  state.leavePrompt = token;
  const release = function () { if (state.leavePrompt === token) state.leavePrompt = null; };
  try {
    wx.showModal({
      title: '笔记未保存', content: '放弃修改并离开？',
      cancelText: '继续编辑', confirmText: '放弃',
      success: function (res) {
        if (!state.active || state.epoch !== epoch || state.leavePrompt !== token) return;
        release();
        if (!res || res.confirm !== true) return;
        action(function () {
          // 只在导航成功后放弃；失败、取消或期间新增的输入都保留。
          if (page.data.note !== text) return;
          drafts.delete(state.id);
          state.discardDraft = text;
          if (state.active) page.setData({ editingNote: false, note: page.readingSavedNote(), noteDraftRestored: false });
        });
      },
      fail: release,
      complete: release
    });
  } catch (error) { release(); }
  return true;
}
function hide(page) { if (page._reading) page._reading.leavePrompt = null; }

function resume(page) {
  const state = page._reading;
  if (typeof state.discardDraft !== 'string') return;
  if (state.discardDraft === page.data.note) page.setData({ editingNote: false, note: page.readingSavedNote(), noteDraftRestored: false });
  state.discardDraft = null;
}

module.exports = { dirty: dirty, remember: remember, restore: restore, clear: clear, leave: leave, hide: hide, resume: resume };
