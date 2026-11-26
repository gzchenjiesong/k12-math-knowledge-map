const knowledge = require('../../data/nodes.js');
const store = require('../../utils/store.js');
const tabbar = require('../../utils/tabbar.js');

Page({
  data: {
    stat: {},
    groups: [],
    filter: 'all'
  },

  onLoad: function () {
    this.build();
  },

  onShow: function () {
    tabbar.setSelected(this, 3);
    this.build();
  },

  build: function () {
    const self = this;
    const filter = this.data.filter;
    const groups = [];

    knowledge.DOMAINS.forEach(function (d) {
      const items = [];
      d.modules.forEach(function (m) {
        m.topics.forEach(function (t) {
          const st = store.getStatus(t.id);
          if (filter === 'todo' && st !== 0) return;
          if (filter === 'learning' && st !== 1) return;
          items.push({ id: t.id, n: t.n, d: t.d, status: st, module: m.name });
        });
      });
      if (items.length > 0) {
        groups.push({ id: d.id, name: d.name, items: items, count: items.length });
      }
    });

    self.setData({
      stat: store.stats(knowledge.ALL_NODES),
      groups: groups
    });
  },

  setFilter: function (e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.build);
  },

  goNode: function (e) {
    wx.navigateTo({ url: '/pages/node/node?id=' + e.currentTarget.dataset.id });
  }
});
