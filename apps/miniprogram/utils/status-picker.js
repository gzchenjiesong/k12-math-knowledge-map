const store = require('./store.js');
const NAMES = ['未开始', '学习中', '已掌握'];

function onShow(page) {
  page._statusPageActive = true;
}

function onHide(page) {
  page._statusPageActive = false;
  page._statusMenu = null;
}

function choose(page, id, refresh) {
  if (!page._statusPageActive || page._statusMenu || !id) return;
  const token = {};
  page._statusMenu = token;
  const current = store.getStatus(id);
  const active = function () { return page._statusPageActive && page._statusMenu === token; };
  const release = function () { if (page._statusMenu === token) page._statusMenu = null; };
  try {
    wx.showActionSheet({
      itemList: NAMES.map(function (name, index) {
        return name + (index === current ? '（当前）' : '');
      }),
      success: function (res) {
        if (!active()) return;
        release();
        const next = res && res.tapIndex;
        if (!Number.isInteger(next) || next < 0 || next >= NAMES.length) return;
        // 菜单展示期间可能合并了远端状态，比较落盘时的最新记录。
        if (store.getStatus(id) === next) return;
        if (!store.setStatus(id, next)) {
          wx.showToast({ title: '本地保存失败，请重试', icon: 'none' });
          return;
        }
        refresh.call(page);
        wx.showToast({ title: '已标记：' + NAMES[next], icon: 'none' });
      },
      fail: release,
      complete: release
    });
  } catch (error) {
    release();
  }
}

module.exports = { NAMES: NAMES, onShow: onShow, onHide: onHide, choose: choose };
